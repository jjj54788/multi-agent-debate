import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { getAllAgents, getDebateSessionById } from "./db";
import { runDebateSession, AgentStatus } from "./debateEngine";
import { Message } from "../drizzle/schema";

export function setupWebSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/api/socket.io",
  });

  io.on("connection", (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    socket.on("join-debate", (sessionId: string) => {
      socket.join(`debate-${sessionId}`);
      console.log(`[WebSocket] Client ${socket.id} joined debate ${sessionId}`);
    });

    socket.on("start-debate", async (sessionId: string) => {
      try {
        console.log(`[WebSocket] Starting debate ${sessionId}`);

        const session = await getDebateSessionById(sessionId);
        if (!session) {
          socket.emit("error", { message: "Session not found" });
          return;
        }

        const allAgents = await getAllAgents();
        const selectedAgents = allAgents.filter((agent) =>
          session.agentIds.includes(agent.id)
        );

        if (selectedAgents.length === 0) {
          socket.emit("error", { message: "No agents found" });
          return;
        }

        // Run debate with real-time updates
        await runDebateSession(
          sessionId,
          {
            sessionId,
            topic: session.topic,
            agents: selectedAgents,
            currentRound: session.currentRound,
            maxRounds: session.maxRounds,
            messages: [],
          },
          session.userId, // userId
          // onAgentStatusChange
          (agentId: string, status: AgentStatus) => {
            io.to(`debate-${sessionId}`).emit("agent-status", {
              agentId,
              status,
            });
          },
          // onMessageCreated
          (message: Message) => {
            io.to(`debate-${sessionId}`).emit("new-message", message);
          },
          // onRoundComplete
          (round: number) => {
            io.to(`debate-${sessionId}`).emit("round-complete", { round });
          }
        );

        // Notify completion
        const updatedSession = await getDebateSessionById(sessionId);
        io.to(`debate-${sessionId}`).emit("debate-complete", updatedSession);
      } catch (error) {
        console.error(`[WebSocket] Error in debate ${sessionId}:`, error);
        socket.emit("error", {
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}
