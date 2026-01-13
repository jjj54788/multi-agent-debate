import { useEffect, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
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

  // Calculate circular layout positions
  const calculateNodePositions = useCallback(
    (agentList: Agent[]) => {
      const radius = 250;
      const centerX = 400;
      const centerY = 300;
      const angleStep = (2 * Math.PI) / agentList.length;

      return agentList.map((agent, index) => {
        const angle = index * angleStep - Math.PI / 2; // Start from top
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        const status = agentStatuses[agent.id] || "idle";
        const isActive = status === "thinking" || status === "speaking";

        return {
          id: agent.id,
          type: "agentNode",
          position: { x, y },
          data: {
            name: agent.name,
            profile: agent.profile,
            color: agent.color,
            status: status as AgentStatus,
          },
          // Add visual emphasis for active agents
          style: {
            boxShadow: isActive ? `0 0 20px ${agent.color}` : undefined,
            transform: isActive ? 'scale(1.1)' : 'scale(1)',
            transition: 'all 0.3s ease',
            zIndex: isActive ? 10 : 1,
          },
          className: isActive ? 'animate-pulse' : '',
        };
      });
    },
    [agentStatuses]
  );

  // Initialize nodes
  useEffect(() => {
    if (agents.length > 0) {
      const initialNodes = calculateNodePositions(agents);
      setNodes(initialNodes as any);
    }
  }, [agents, calculateNodePositions, setNodes]);

  // Update node statuses with enhanced visual feedback
  useEffect(() => {
    setNodes((nds: any) =>
      nds.map((node: any) => {
        const status = agentStatuses[node.id] || "idle";
        const isActive = status === "thinking" || status === "speaking";
        const agent = agents.find(a => a.id === node.id);
        
        return {
          ...node,
          data: {
            ...node.data,
            status: status,
          },
          style: {
            boxShadow: isActive ? `0 0 20px ${agent?.color || '#999'}` : undefined,
            transform: isActive ? 'scale(1.1)' : 'scale(1)',
            transition: 'all 0.3s ease',
            zIndex: isActive ? 10 : 1,
          },
          className: isActive ? 'animate-pulse' : '',
        };
      })
    );
  }, [agentStatuses, agents, setNodes]);

  // Create edges from messages with enhanced animations
  useEffect(() => {
    if (messages.length === 0) {
      setEdges([]);
      return;
    }

    // Group messages by round
    const messagesByRound = messages.reduce((acc, msg) => {
      if (!acc[msg.round]) acc[msg.round] = [];
      acc[msg.round].push(msg);
      return acc;
    }, {} as Record<number, Message[]>);

    const newEdges = messages.map((message, index) => {
      const isLatest = index === messages.length - 1;
      const isCurrentRound = message.round === currentRound;
      const agent = agents.find((a) => a.id === message.sender);
      const color = agent?.color || "#999";
      
      return {
        id: `edge-${message.id}`,
        source: message.sender,
        target: message.receiver,
        type: "smoothstep",
        animated: isLatest || isCurrentRound, // Animate latest and current round edges
        style: {
          stroke: color,
          strokeWidth: isCurrentRound ? 3 : 2,
          opacity: isCurrentRound ? 1 : 0.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: color,
        },
        label: `第 ${message.round} 轮`,
        labelStyle: {
          fill: isCurrentRound ? color : "#666",
          fontSize: isCurrentRound ? 14 : 12,
          fontWeight: isCurrentRound ? 'bold' : 'normal',
        },
        labelBgStyle: {
          fill: "#fff",
          fillOpacity: 0.9,
        },
      };
    });

    setEdges(newEdges as any);
  }, [messages, agents, currentRound, setEdges]);

  // Custom minimap node colors
  const nodeColor = useCallback(
    (node: any) => {
      const agent = agents.find((a) => a.id === node.id);
      const status = agentStatuses[node.id];
      const isActive = status === "thinking" || status === "speaking";
      return isActive ? (agent?.color || "#999") : "#ddd";
    },
    [agents, agentStatuses]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.5}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <Background />
        <Controls />
        <MiniMap nodeColor={nodeColor} zoomable pannable />
      </ReactFlow>
    </div>
  );
}
