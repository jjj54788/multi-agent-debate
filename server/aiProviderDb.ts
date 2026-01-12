import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { aiProviderConfigs, InsertAIProviderConfig, AIProviderConfig } from "../drizzle/schema";

/**
 * Get all AI provider configs for a user
 */
export async function getUserAIProviders(userId: number): Promise<AIProviderConfig[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db
    .select()
    .from(aiProviderConfigs)
    .where(eq(aiProviderConfigs.userId, userId));
}

/**
 * Get active AI provider config for a user
 */
export async function getActiveAIProvider(userId: number): Promise<AIProviderConfig | null> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const results = await db
    .select()
    .from(aiProviderConfigs)
    .where(
      and(eq(aiProviderConfigs.userId, userId), eq(aiProviderConfigs.isActive, 1))
    )
    .limit(1);

  return results[0] || null;
}

/**
 * Create a new AI provider config
 */
export async function createAIProviderConfig(
  config: InsertAIProviderConfig
): Promise<AIProviderConfig> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.insert(aiProviderConfigs).values(config);

  // Return the created config
  const results = await db
    .select()
    .from(aiProviderConfigs)
    .where(
      and(
        eq(aiProviderConfigs.userId, config.userId),
        eq(aiProviderConfigs.name, config.name)
      )
    )
    .orderBy(aiProviderConfigs.createdAt)
    .limit(1);

  return results[0]!;
}

/**
 * Update AI provider config
 */
export async function updateAIProviderConfig(
  id: number,
  userId: number,
  updates: Partial<InsertAIProviderConfig>
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(aiProviderConfigs)
    .set(updates)
    .where(and(eq(aiProviderConfigs.id, id), eq(aiProviderConfigs.userId, userId)));
}

/**
 * Delete AI provider config
 */
export async function deleteAIProviderConfig(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .delete(aiProviderConfigs)
    .where(and(eq(aiProviderConfigs.id, id), eq(aiProviderConfigs.userId, userId)));
}

/**
 * Set a provider as active (and deactivate others)
 */
export async function setActiveProvider(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Deactivate all providers for this user
  await db
    .update(aiProviderConfigs)
    .set({ isActive: 0 })
    .where(eq(aiProviderConfigs.userId, userId));

  // Activate the selected provider
  await db
    .update(aiProviderConfigs)
    .set({ isActive: 1 })
    .where(and(eq(aiProviderConfigs.id, id), eq(aiProviderConfigs.userId, userId)));
}
