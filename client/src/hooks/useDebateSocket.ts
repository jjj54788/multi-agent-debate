import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export type AgentStatus = "idle" | "thinking" | "speaking" | "waiting";

export interface Message {
  id: string;
  sessionId: string;
  sender: string;
  receiver: string;
  content: string;
  round: number;
  sentiment: "positive" | "negative" | "neutral" | null;
  createdAt: Date;
}

export interface AgentStatusUpdate {
  agentId: string;
  status: AgentStatus;
}

export interface DebateSummary {
  summary: string;
  keyPoints: string[];
  consensus: string;
  disagreements: string[];
}

export interface DebateSession {
  id: string;
  userId: number;
  topic: string;
  agentIds: string[];
  maxRounds: number;
  currentRound: number;
  status: "pending" | "running" | "paused" | "completed" | "error";
  summary: DebateSummary | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export function useDebateSocket(sessionId: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const [currentRound, setCurrentRound] = useState(0);
  const [isDebateComplete, setIsDebateComplete] = useState(false);
  const [completedSession, setCompletedSession] = useState<DebateSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    console.log("[useDebateSocket] Initializing WebSocket connection for session:", sessionId);

    // Create socket connection
    const newSocket = io(window.location.origin, {
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    console.log("[useDebateSocket] Socket instance created", newSocket);

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("[WebSocket] Connected successfully!", {
        id: newSocket.id,
        connected: newSocket.connected,
        sessionId
      });
      setConnected(true);
      newSocket.emit("join-debate", sessionId);
    });

    newSocket.on("connect_error", (error) => {
      console.error("[WebSocket] Connection error:", error);
      setConnected(false);
      setError("无法连接到服务器，请刷新页面重试");
    });

    newSocket.on("disconnect", (reason) => {
      console.log("[WebSocket] Disconnected:", reason);
      setConnected(false);
    });

    newSocket.on("agent-status", (data: AgentStatusUpdate) => {
      setAgentStatuses((prev) => ({
        ...prev,
        [data.agentId]: data.status,
      }));
    });

    newSocket.on("new-message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on("round-complete", (data: { round: number }) => {
      setCurrentRound(data.round);
    });

    newSocket.on("debate-complete", (session: DebateSession) => {
      setIsDebateComplete(true);
      setCompletedSession(session);
    });

    newSocket.on("error", (data: { message: string }) => {
      setError(data.message);
      console.error("[WebSocket] Error:", data.message);
    });

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId]);

  const startDebate = () => {
    if (socket && sessionId) {
      setMessages([]);
      setAgentStatuses({});
      setCurrentRound(0);
      setIsDebateComplete(false);
      setCompletedSession(null);
      setError(null);
      socket.emit("start-debate", sessionId);
    }
  };

  return {
    connected,
    messages,
    agentStatuses,
    currentRound,
    isDebateComplete,
    completedSession,
    error,
    startDebate,
  };
}
