import { nanoid } from "nanoid";
import { Agent, Message } from "../drizzle/schema";
import { createMessage, getSessionMessages, updateDebateSession, updateMessage } from "./db";
import { AIProviderService, AIProviderConfig } from "./aiProviders";
import { getActiveAIProvider } from "./aiProviderDb";
import { scoreMessage } from "./scoringEngine";

export type AgentStatus = "idle" | "thinking" | "speaking" | "waiting";

export interface DebateContext {
  sessionId: string;
  topic: string;
  agents: Agent[];
  currentRound: number;
  maxRounds: number;
  messages: Message[];
}

export interface AgentMessage {
  agentId: string;
  content: string;
  round: number;
}

/**
 * Generate a response from an agent based on the debate context
 */
export async function generateAgentResponse(
  agent: Agent,
  context: DebateContext,
  previousMessages: Message[],
  userId: number
): Promise<string> {
  // Build conversation history
  const history = previousMessages
    .map((msg) => {
      const msgAgent = context.agents.find((a) => a.id === msg.sender);
      return `${msgAgent?.name || msg.sender}: ${msg.content}`;
    })
    .join("\n\n");

  const prompt = `## BACKGROUND
You are ${agent.name}, ${agent.profile}.
${agent.systemPrompt}

## DEBATE TOPIC
${context.topic}

## DEBATE HISTORY
${history || "This is the beginning of the debate."}

## YOUR TURN
Round ${context.currentRound} of ${context.maxRounds}.
${previousMessages.length === 0 
  ? "As the first speaker, provide your initial perspective on this topic in 100-150 words."
  : "Respond to the previous arguments, state your position, and provide your analysis in 100-150 words."}`;

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
        { role: "system", content: agent.systemPrompt },
        { role: "user", content: prompt },
      ],
      aiConfig
    );

    return response.content || "I have no response at this time.";
  } catch (error) {
    console.error(`[DebateEngine] Error generating response for ${agent.name}:`, error);
    throw error;
  }
}

/**
 * Execute one round of debate with all agents speaking in sequence
 */
export async function executeDebateRound(
  sessionId: string,
  context: DebateContext,
  userId: number,
  onAgentStatusChange?: (agentId: string, status: AgentStatus) => void,
  onMessageCreated?: (message: Message) => void
): Promise<Message[]> {
  console.log(`[DebateEngine] ===== executeDebateRound called for round ${context.currentRound} =====`);
  const roundMessages: Message[] = [];
  const previousMessages = await getSessionMessages(sessionId);
  console.log(`[DebateEngine] Previous messages count: ${previousMessages.length}`);

  for (const agent of context.agents) {
    try {
      // Update agent status to thinking
      onAgentStatusChange?.(agent.id, "thinking");

      // Generate response
      const content = await generateAgentResponse(agent, context, previousMessages, userId);

      // Update agent status to speaking
      onAgentStatusChange?.(agent.id, "speaking");

      // Create message
      const message: Message = {
        id: nanoid(),
        sessionId,
        sender: agent.id,
        receiver: "all",
        content,
        round: context.currentRound,
        sentiment: null,
        logicScore: null,
        innovationScore: null,
        expressionScore: null,
        totalScore: null,
        scoringReasons: null,
        isHighlight: 0,
        createdAt: new Date(),
      };

      await createMessage(message);
      roundMessages.push(message);
      onMessageCreated?.(message);

      // Score the message asynchronously (don't block the debate flow)
      console.log(`[DebateEngine] Starting to score message ${message.id}`);
      scoreMessage(
        message,
        { topic: context.topic, previousMessages },
        userId
      ).then(async (scores) => {
        console.log(`[DebateEngine] Received scores for message ${message.id}:`, scores);
        // Update message with scores
        await updateMessage(message.id, {
          logicScore: scores.logicScore,
          innovationScore: scores.innovationScore,
          expressionScore: scores.expressionScore,
          totalScore: scores.totalScore,
          scoringReasons: scores.scoringReasons,
        });
        console.log(`[DebateEngine] Successfully updated message ${message.id} with scores`);
      }).catch((error) => {
        console.error(`[DebateEngine] Error scoring message ${message.id}:`, error);
        console.error(`[DebateEngine] Error stack:`, error.stack);
      });

      // Update agent status to waiting
      onAgentStatusChange?.(agent.id, "waiting");

      // Add a small delay between agents for better UX
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`[DebateEngine] Error in round ${context.currentRound} for agent ${agent.id}:`, error);
      onAgentStatusChange?.(agent.id, "idle");
      throw error;
    }
  }

  return roundMessages;
}

/**
 * Generate a summary of the debate using LLM
 */
export async function generateDebateSummary(
  topic: string,
  agents: Agent[],
  messages: Message[],
  userId: number
): Promise<{
  summary: string;
  keyPoints: string[];
  consensus: string;
  disagreements: string[];
  bestViewpoint?: string;
  mostInnovative?: string;
  goldenQuotes?: string[];
}> {
  const conversation = messages
    .map((msg) => {
      const agent = agents.find((a) => a.id === msg.sender);
      return `**${agent?.name || msg.sender}** (Round ${msg.round}):\n${msg.content}`;
    })
    .join("\n\n");

  // Find high-scoring messages for highlights
  const scoredMessages = messages.filter(m => m.totalScore && m.totalScore > 0);
  const sortedByScore = [...scoredMessages].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
  const topMessages = sortedByScore.slice(0, 5);
  
  const highlightsContext = topMessages.length > 0 
    ? `\n\n## TOP SCORED MESSAGES\n${topMessages.map(m => {
        const agent = agents.find(a => a.id === m.sender);
        return `**${agent?.name}** (Score: ${m.totalScore}):\n${m.content}`;
      }).join('\n\n')}`
    : '';

  const prompt = `Analyze the following debate and provide a comprehensive summary with highlights.

## DEBATE TOPIC
${topic}

## PARTICIPANTS
${agents.map((a) => `- ${a.name}: ${a.profile}`).join("\n")}

## CONVERSATION
${conversation}${highlightsContext}

## TASK
Provide a JSON response with the following structure:
{
  "summary": "A comprehensive 2-3 paragraph summary of the entire debate",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "consensus": "Main areas of consensus and agreement",
  "disagreements": ["Point of disagreement 1", "Point of disagreement 2"],
  "bestViewpoint": "The most well-reasoned and convincing argument from the debate",
  "mostInnovative": "The most creative or novel idea presented",
  "goldenQuotes": ["Memorable quote 1", "Memorable quote 2", "Memorable quote 3"]
}`;

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
        {
          role: "system",
          content: "You are an expert debate analyst. Provide objective, balanced analysis.",
        },
        { role: "user", content: prompt },
      ],
      aiConfig
    );

    const content = response.content;
    if (!content) {
      throw new Error("No response from LLM");
    }

    // Clean up markdown code blocks if present
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const parsed = JSON.parse(cleanContent);
    
    // Ensure consensus is a string (join array if needed)
    if (Array.isArray(parsed.consensus)) {
      parsed.consensus = parsed.consensus.join('; ');
    }
    
    return parsed;
  } catch (error) {
    console.error("[DebateEngine] Error generating summary:", error);
    return {
      summary: "Unable to generate summary at this time.",
      keyPoints: [],
      consensus: "No consensus reached.",
      disagreements: [],
    };
  }
}

/**
 * Run a complete debate session
 */
export async function runDebateSession(
  sessionId: string,
  context: DebateContext,
  userId: number,
  onAgentStatusChange?: (agentId: string, status: AgentStatus) => void,
  onMessageCreated?: (message: Message) => void,
  onRoundComplete?: (round: number) => void
): Promise<void> {
  try {
    // Update session status to running
    await updateDebateSession(sessionId, { status: "running" });

    // Execute all rounds
    for (let round = 1; round <= context.maxRounds; round++) {
      context.currentRound = round;
      await updateDebateSession(sessionId, { currentRound: round });

      await executeDebateRound(sessionId, context, userId, onAgentStatusChange, onMessageCreated);

      onRoundComplete?.(round);
    }

    // Generate summary
    const allMessages = await getSessionMessages(sessionId);
    const summary = await generateDebateSummary(context.topic, context.agents, allMessages, userId);

    // Update session with summary and mark as completed
    await updateDebateSession(sessionId, {
      status: "completed",
      summary: summary.summary,
      keyPoints: summary.keyPoints,
      consensus: summary.consensus,
      disagreements: summary.disagreements,
      bestViewpoint: summary.bestViewpoint || null,
      mostInnovative: summary.mostInnovative || null,
      goldenQuotes: summary.goldenQuotes || [],
      completedAt: new Date(),
    });

    // Set all agents to idle
    context.agents.forEach((agent) => onAgentStatusChange?.(agent.id, "idle"));
  } catch (error) {
    console.error("[DebateEngine] Error running debate session:", error);
    await updateDebateSession(sessionId, { status: "error" });
    throw error;
  }
}
