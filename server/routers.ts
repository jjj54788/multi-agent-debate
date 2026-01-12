import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import {
  getAllAgents,
  createDebateSession,
  getDebateSessionById,
  getUserDebateSessions,
  getSessionMessages,
} from "./db";
import {
  getUserAIProviders,
  getActiveAIProvider,
  createAIProviderConfig,
  updateAIProviderConfig,
  deleteAIProviderConfig,
  setActiveProvider,
} from "./aiProviderDb";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  agents: router({
    list: publicProcedure.query(async () => {
      return await getAllAgents();
    }),
  }),

  aiProvider: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserAIProviders(ctx.user.id);
    }),

    getActive: protectedProcedure.query(async ({ ctx }) => {
      return await getActiveAIProvider(ctx.user.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          provider: z.enum(["manus", "openai", "anthropic", "custom"]),
          name: z.string().min(1),
          apiKey: z.string().optional(),
          baseURL: z.string().optional(),
          model: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await createAIProviderConfig({
          userId: ctx.user.id,
          provider: input.provider,
          name: input.name,
          apiKey: input.apiKey,
          baseURL: input.baseURL,
          model: input.model,
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          apiKey: z.string().optional(),
          baseURL: z.string().optional(),
          model: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...updates } = input;
        await updateAIProviderConfig(id, ctx.user.id, updates);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await deleteAIProviderConfig(input.id, ctx.user.id);
        return { success: true };
      }),

    setActive: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await setActiveProvider(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  debate: router({
    create: protectedProcedure
      .input(
        z.object({
          topic: z.string().min(1),
          agentIds: z.array(z.string()).min(2),
          maxRounds: z.number().min(1).max(10).default(5),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const sessionId = nanoid();
        await createDebateSession({
          id: sessionId,
          userId: ctx.user.id,
          topic: input.topic,
          agentIds: input.agentIds,
          maxRounds: input.maxRounds,
          currentRound: 0,
          status: "pending",
          summary: null,
          keyPoints: null,
          consensus: null,
          disagreements: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: null,
        });
        return { sessionId };
      }),

    get: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        const session = await getDebateSessionById(input.sessionId);
        if (!session) {
          throw new Error("Session not found");
        }
        return session;
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserDebateSessions(ctx.user.id);
    }),

    messages: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        return await getSessionMessages(input.sessionId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
