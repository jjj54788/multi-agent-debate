import { Agent, Message } from "../drizzle/schema";
import { getAgentById } from "./db";
import { AIProviderService, AIProviderConfig } from "./aiProviders";
import { getActiveAIProvider } from "./aiProviderDb";

interface ScoringResult {
  score: number;
  reason: string;
}

const SCORER_IDS = {
  LOGIC: "logic_scorer",
  INNOVATION: "innovation_scorer",
  EXPRESSION: "expression_scorer",
};

/**
 * Score a message using all three scoring agents
 */
export async function scoreMessage(
  message: Message,
  context: { topic: string; previousMessages: Message[] },
  userId: number
): Promise<{
  logicScore: number;
  innovationScore: number;
  expressionScore: number;
  totalScore: number;
  scoringReasons: { logic: string; innovation: string; expression: string };
}> {
  console.log(`[ScoringEngine] Starting to score message ${message.id}`);
  try {
    // Get scorer agents
    console.log(`[ScoringEngine] Fetching scorer agents...`);
    const logicScorer = await getAgentById(SCORER_IDS.LOGIC);
    const innovationScorer = await getAgentById(SCORER_IDS.INNOVATION);
    const expressionScorer = await getAgentById(SCORER_IDS.EXPRESSION);
    console.log(`[ScoringEngine] Scorer agents found:`, {
      logic: !!logicScorer,
      innovation: !!innovationScorer,
      expression: !!expressionScorer
    });

    if (!logicScorer || !innovationScorer || !expressionScorer) {
      console.error("[ScoringEngine] Scorer agents not found, returning default scores");
      return {
        logicScore: 5,
        innovationScore: 5,
        expressionScore: 5,
        totalScore: 15,
        scoringReasons: {
          logic: "评分者未初始化",
          innovation: "评分者未初始化",
          expression: "评分者未初始化",
        },
      };
    }

    // Build context for scoring
    const contextText = buildScoringContext(message, context);

    // Score in parallel
    console.log(`[ScoringEngine] Starting parallel scoring...`);
    const [logicResult, innovationResult, expressionResult] = await Promise.all([
      scoreWithAgent(logicScorer, contextText, userId),
      scoreWithAgent(innovationScorer, contextText, userId),
      scoreWithAgent(expressionScorer, contextText, userId),
    ]);

    const totalScore = logicResult.score + innovationResult.score + expressionResult.score;
    console.log(`[ScoringEngine] Scoring completed for message ${message.id}:`, {
      logic: logicResult.score,
      innovation: innovationResult.score,
      expression: expressionResult.score,
      total: totalScore
    });

    return {
      logicScore: logicResult.score,
      innovationScore: innovationResult.score,
      expressionScore: expressionResult.score,
      totalScore,
      scoringReasons: {
        logic: logicResult.reason,
        innovation: innovationResult.reason,
        expression: expressionResult.reason,
      },
    };
  } catch (error) {
    console.error("[ScoringEngine] Error scoring message:", error);
    return {
      logicScore: 0,
      innovationScore: 0,
      expressionScore: 0,
      totalScore: 0,
      scoringReasons: {
        logic: "评分失败",
        innovation: "评分失败",
        expression: "评分失败",
      },
    };
  }
}

/**
 * Build context text for scoring
 */
function buildScoringContext(
  message: Message,
  context: { topic: string; previousMessages: Message[] }
): string {
  let contextText = `讨论话题：${context.topic}\n\n`;

  if (context.previousMessages.length > 0) {
    contextText += "之前的讨论内容：\n";
    const recentMessages = context.previousMessages.slice(-5); // Last 5 messages
    for (const msg of recentMessages) {
      contextText += `${msg.sender}: ${msg.content}\n\n`;
    }
  }

  contextText += `\n当前需要评分的发言：\n${message.sender}: ${message.content}`;

  return contextText;
}

/**
 * Score with a specific scoring agent
 */
async function scoreWithAgent(
  scorer: Agent,
  contextText: string,
  userId: number
): Promise<ScoringResult> {
  try {
    // Get user's active AI provider config
    const providerConfig = await getActiveAIProvider(userId);
    
    const aiConfig: AIProviderConfig = {
      provider: providerConfig?.provider || "manus",
      apiKey: providerConfig?.apiKey || undefined,
      baseURL: providerConfig?.baseURL || undefined,
      model: providerConfig?.model || undefined,
    };

    const response = await AIProviderService.chat(
      [
        { role: "system", content: scorer.systemPrompt },
        { role: "user", content: contextText },
      ],
      aiConfig
    );

    const content = response.content || "{}";

    // Clean JSON response (remove markdown code blocks if present)
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith("```json")) {
      cleanedContent = cleanedContent.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (cleanedContent.startsWith("```")) {
      cleanedContent = cleanedContent.replace(/```\n?/g, "");
    }

    const result = JSON.parse(cleanedContent) as ScoringResult;

    // Validate score range
    const score = Math.max(0, Math.min(10, result.score || 5));

    return {
      score,
      reason: result.reason || "无评分理由",
    };
  } catch (error) {
    console.error(`[ScoringEngine] Error scoring with ${scorer.name}:`, error);
    return {
      score: 5,
      reason: "评分解析失败",
    };
  }
}

/**
 * Identify highlight messages based on scores
 */
export function identifyHighlights(messages: Message[]): string[] {
  if (messages.length === 0) return [];

  // Filter messages with scores
  const scoredMessages = messages.filter((m) => m.totalScore !== null && m.totalScore > 0);

  if (scoredMessages.length === 0) return [];

  // Sort by total score
  const sorted = [...scoredMessages].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

  // Top 20% or at least top 3
  const highlightCount = Math.max(3, Math.ceil(sorted.length * 0.2));

  return sorted.slice(0, highlightCount).map((m) => m.id);
}
