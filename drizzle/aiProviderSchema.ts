import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * AI Provider Configurations table
 * Stores user's AI provider API keys and settings
 */
export const aiProviderConfigs = mysqlTable("ai_provider_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  provider: mysqlEnum("provider", ["manus", "openai", "anthropic", "custom"])
    .notNull()
    .default("manus"),
  name: varchar("name", { length: 100 }).notNull(), // User-friendly name
  apiKey: text("apiKey"), // Encrypted API key
  baseURL: text("baseURL"), // Custom base URL
  model: varchar("model", { length: 100 }), // Model name
  isActive: int("isActive").notNull().default(1), // 1 = active, 0 = inactive
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AIProviderConfig = typeof aiProviderConfigs.$inferSelect;
export type InsertAIProviderConfig = typeof aiProviderConfigs.$inferInsert;
