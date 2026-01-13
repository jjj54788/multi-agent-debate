import { useEffect, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Edge,
  Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AgentNode } from "./AgentNode";
import { AgentStatus, Message } from "@/hooks/useDebateSocket";

interface Agent {
  id: string;
  name: string;
  profile: string;
  color: string;
}

interface DebateFlowChartProps {
  agents: Agent[];
  agentStatuses: Record<string, AgentStatus>;
  messages: Message[];
  currentRound?: number;
}

const nodeTypes = {
  agentNode: AgentNode,
};

export function DebateFlowChart({ agents, agentStatuses, messages, currentRound = 0 }: DebateFlowChartProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Build flow chart with clear message flow visualization
  useEffect(() => {
    if (agents.length === 0) return;

    const newNodes: Node<any>[] = [];
    const newEdges: Edge<any>[] = [];

    const horizontalSpacing = 300;
    const verticalSpacing = 200;
    const startX = 150;
    const startY = 100;

    // Group messages by round
    const messagesByRound: Record<number, Message[]> = {};
    messages.forEach((msg) => {
      if (!messagesByRound[msg.round]) {
        messagesByRound[msg.round] = [];
      }
      messagesByRound[msg.round].push(msg);
    });

    // Create nodes for each message in each round
    let nodeId = 0;
    for (let round = 1; round <= Math.max(currentRound, 1); round++) {
      const roundMessages = messagesByRound[round] || [];
      
      if (roundMessages.length === 0 && round === currentRound) {
        // Show agents waiting for first message in current round
        agents.forEach((agent, agentIndex) => {
          const status = agentStatuses[agent.id] || "idle";
          const x = startX + agentIndex * horizontalSpacing;
          const y = startY + (round - 1) * verticalSpacing;

          newNodes.push({
            id: `agent-${agent.id}-r${round}`,
            type: "agentNode",
            position: { x, y },
            data: {
              name: agent.name,
              profile: agent.profile,
              color: agent.color,
              status: status,
              round: round,
            },
            style: {
              boxShadow: status !== "idle" ? `0 0 20px ${agent.color}` : undefined,
              transform: status !== "idle" ? "scale(1.05)" : "scale(1)",
              transition: "all 0.3s ease",
            },
          });
        });
        continue;
      }

      // Create nodes for each message
      roundMessages.forEach((msg, msgIndex) => {
        const agent = agents.find((a) => a.id === msg.sender);
        if (!agent) return;

        const status = agentStatuses[agent.id] || "idle";
        const isCurrent = round === currentRound;
        const isActive = isCurrent && (status === "thinking" || status === "speaking");

        // Calculate position: spread horizontally, cascade vertically by round
        const x = startX + msgIndex * horizontalSpacing;
        const y = startY + (round - 1) * verticalSpacing;

        const currentNodeId = `msg-${nodeId}`;
        nodeId++;

        newNodes.push({
          id: currentNodeId,
          type: "agentNode",
          position: { x, y },
          data: {
            name: agent.name,
            profile: agent.profile,
            color: agent.color,
            status: isCurrent ? status : "idle",
            round: round,
            score: msg.totalScore || undefined,
            message: msg.content.substring(0, 50) + "...",
          },
          style: {
            boxShadow: isActive ? `0 0 20px ${agent.color}` : undefined,
            transform: isActive ? "scale(1.05)" : "scale(1)",
            transition: "all 0.3s ease",
            opacity: isCurrent ? 1 : 0.75,
          },
          className: isActive ? "animate-pulse" : "",
        });

        // Create edge from previous round's last message to this message
        if (round > 1 && msgIndex === 0) {
          const prevRoundMessages = messagesByRound[round - 1] || [];
          if (prevRoundMessages.length > 0) {
            const prevNodeId = `msg-${nodeId - roundMessages.length - prevRoundMessages.length + prevRoundMessages.length - 1}`;
            newEdges.push({
              id: `edge-${prevNodeId}-${currentNodeId}`,
              source: prevNodeId,
              target: currentNodeId,
              type: "smoothstep",
              animated: isCurrent,
              style: {
                stroke: agent.color,
                strokeWidth: isCurrent ? 3 : 2,
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: agent.color,
              },
              label: `轮次 ${round}`,
              labelStyle: {
                fontSize: 12,
                fontWeight: "bold",
                fill: agent.color,
              },
              labelBgStyle: {
                fill: "white",
                fillOpacity: 0.8,
              },
            });
          }
        }

        // Create edge between messages in the same round
        if (msgIndex > 0) {
          const prevNodeId = `msg-${nodeId - 2}`;
          newEdges.push({
            id: `edge-${prevNodeId}-${currentNodeId}`,
            source: prevNodeId,
            target: currentNodeId,
            type: "smoothstep",
            animated: isCurrent,
            style: {
              stroke: agent.color,
              strokeWidth: isCurrent ? 2 : 1,
              strokeDasharray: "5,5",
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: agent.color,
            },
          });
        }
      });
    }

    setNodes(newNodes as any);
    setEdges(newEdges as any);
  }, [agents, agentStatuses, messages, currentRound, setNodes, setEdges]);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.5}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const agent = agents.find((a) => node.data.name === a.name);
            return agent?.color || "#94a3b8";
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  );
}
