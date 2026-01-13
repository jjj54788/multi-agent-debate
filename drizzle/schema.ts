import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Agent personalities table
 * Stores predefined agent personalities with their system prompts
 */
export const agents = mysqlTable("agents", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  profile: varchar("profile", { length: 200 }).notNull(),
  systemPrompt: text("systemPrompt").notNull(),
  color: varchar("color", { length: 20 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

/**
 * Debate sessions table
 * Stores debate sessions with topic, participants, and configuration
 */
export const debateSessions = mysqlTable("debate_sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  topic: text("topic").notNull(),
  agentIds: json("agentIds").$type<string[]>().notNull(),
  maxRounds: int("maxRounds").notNull().default(5),
  currentRound: int("currentRound").notNull().default(0),
  status: mysqlEnum("status", ["pending", "running", "paused", "completed", "error"]).notNull().default("pending"),
  summary: text("summary"),
  keyPoints: json("keyPoints").$type<string[]>(),
  consensus: text("consensus"),
  disagreements: json("disagreements").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type DebateSession = typeof debateSessions.$inferSelect;
export type InsertDebateSession = typeof debateSessions.$inferInsert;

/**
 * Messages table
 * Stores all messages exchanged during debates
 */
export const messages = mysqlTable("messages", {
  id: varchar("id", { length: 64 }).primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  sender: varchar("sender", { length: 64 }).notNull(), // agent ID
  receiver: varchar("receiver", { length: 64 }).notNull(), // "all" or specific agent ID
  content: text("content").notNull(),
  round: int("round").notNull(),
  sentiment: mysqlEnum("sentiment", ["positive", "negative", "neutral"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// Export AI Provider Config
export * from "./aiProviderSchema";
