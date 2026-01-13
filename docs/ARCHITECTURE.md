# 系统架构文档

## 目录

- [系统概述](#系统概述)
- [核心设计理念](#核心设计理念)
- [技术架构](#技术架构)
- [核心模块](#核心模块)
- [数据流程](#数据流程)
- [性能优化](#性能优化)
- [安全设计](#安全设计)
- [扩展性设计](#扩展性设计)

## 系统概述

多智能体讨论系统是一个基于 **MetaGPT** 架构思想的智能辩论平台，通过协调多个具有不同人格特征的 AI 智能体进行结构化讨论。系统采用 **前后端分离** 架构，使用 **tRPC** 实现类型安全的 API 通信，通过 **WebSocket** 提供实时交互能力，并集成专业的评分系统和智能总结生成功能。

### 核心能力

系统的核心能力体现在三个层面：**智能体协同**、**实时通信** 和 **智能分析**。智能体协同层面，系统支持8种预设角色的智能体，每个智能体具有独特的系统提示词和讨论策略，能够从不同视角提供深度见解。实时通信层面，系统采用 WebSocket 技术实现毫秒级的消息推送和状态同步，确保用户能够流畅地观看讨论过程。智能分析层面，系统集成3个专业评分者智能体，对每条发言进行逻辑、创新和表达三个维度的评分，并在讨论结束后自动生成结构化的总结报告。

## 核心设计理念

### 类型安全优先

系统全栈采用 TypeScript 编写，通过 tRPC 实现端到端的类型安全。从数据库模型到 API 接口，再到前端组件，所有数据结构都具有完整的类型定义。这种设计理念带来三个关键优势：**编译时错误检测**、**智能代码补全** 和 **重构安全性**。开发者在修改数据结构时，TypeScript 编译器会自动检测所有受影响的代码位置，大幅降低运行时错误的风险。

### 模块化设计

系统采用高度模块化的架构设计，核心功能被拆分为独立的模块：**讨论引擎**（Debate Engine）负责智能体协调和消息路由，**评分引擎**（Scoring Engine）负责发言评分，**总结生成器**（Summary Generator）负责讨论分析。每个模块都有清晰的职责边界和接口定义，可以独立开发、测试和优化。这种设计使得系统易于维护和扩展，新功能的添加不会影响现有模块的稳定性。

### 实时优先

系统将实时性作为核心设计目标，采用 WebSocket 作为主要的通信方式。所有关键操作（新消息、状态更新、讨论完成）都通过 WebSocket 实时推送到客户端，用户无需刷新页面即可获得最新信息。同时，系统实现了完善的断线重连机制和历史消息加载功能，确保在网络不稳定的情况下也能提供流畅的用户体验。

## 技术架构

### 整体架构

系统采用经典的三层架构：**表现层**（Presentation Layer）、**业务逻辑层**（Business Logic Layer）和 **数据持久层**（Data Persistence Layer）。表现层使用 React 19 构建，负责用户界面渲染和交互处理。业务逻辑层使用 Node.js + Express 构建，包含讨论引擎、评分引擎和总结生成器等核心模块。数据持久层使用 MySQL/TiDB 存储结构化数据，通过 Drizzle ORM 提供类型安全的数据访问接口。

### 通信层设计

系统实现了双通道通信机制：**HTTP/tRPC** 用于请求-响应模式的 API 调用，**WebSocket** 用于服务器主动推送和实时状态同步。tRPC 通过 HTTP POST 请求传输序列化的 JSON 数据，支持复杂类型（Date、Map、Set）的自动转换。WebSocket 使用 Socket.IO 库实现，提供房间管理、广播和点对点通信能力。两种通信方式相互补充，共同构建了高效的数据传输层。

### 前端架构

前端采用 **组件化** 和 **状态管理** 相结合的架构模式。核心组件包括 **DebateRoom**（讨论房间）、**DebateTimeline**（时间线视图）和 **AgentCard**（智能体卡片）。状态管理通过 React Hooks 实现，使用 `useState` 管理本地状态，`useDebateSocket` 管理 WebSocket 连接和消息，`trpc.*.useQuery` 管理服务器数据查询。前端路由使用轻量级的 Wouter 库，支持动态路由和参数传递。

### 后端架构

后端采用 **分层架构** 和 **依赖注入** 模式。核心分为四层：**路由层**（tRPC Routers）定义 API 接口，**服务层**（Services）实现业务逻辑，**数据访问层**（Data Access Layer）封装数据库操作，**外部集成层**（External Integration）处理 AI API 调用。各层之间通过接口通信，上层依赖下层的抽象接口而非具体实现，确保模块间的低耦合和高内聚。

## 核心模块

### 讨论引擎 (Debate Engine)

讨论引擎是系统的核心模块，负责协调多个智能体进行结构化讨论。该模块的核心功能包括 **轮次控制**、**消息路由** 和 **状态管理**。

**轮次控制**：讨论引擎按照预设的轮数（1-10轮）控制讨论进程。每轮讨论中，所有参与的智能体依次发言，发言顺序由消息路由机制决定。当所有智能体完成当前轮次的发言后，系统自动进入下一轮。讨论引擎通过 `currentRound` 字段追踪当前进度，并在达到 `totalRounds` 后触发讨论完成事件。

**消息路由**：系统实现了智能的消息路由机制，根据智能体的角色和讨论上下文决定下一个发言者。默认情况下，智能体按照选择顺序轮流发言。消息路由器维护一个发言队列，确保每个智能体在每轮中都有且仅有一次发言机会。路由逻辑支持自定义扩展，可以根据讨论内容动态调整发言顺序。

**状态管理**：讨论引擎实时追踪每个智能体的状态（空闲、思考中、发言中），并通过 WebSocket 推送状态更新。状态转换遵循严格的状态机模型：空闲 → 思考中 → 发言中 → 空闲。状态管理器确保同一时刻只有一个智能体处于"发言中"状态，避免消息冲突和顺序混乱。

**核心代码结构**：

```typescript
// server/debateEngine.ts
export async function runDebateSession(
  sessionId: string,
  userId: string
): Promise<void> {
  const session = await getSessionById(sessionId);
  const agents = await getAgentsByIds(session.agentIds);
  
  for (let round = 1; round <= session.totalRounds; round++) {
    await executeDebateRound(session, agents, round);
  }
  
  await generateSummary(session);
  await notifyCompletion(sessionId);
}

async function executeDebateRound(
  session: DebateSession,
  agents: Agent[],
  round: number
): Promise<void> {
  for (const agent of agents) {
    await updateAgentStatus(agent.id, "thinking");
    const response = await generateAgentResponse(agent, session, round);
    await updateAgentStatus(agent.id, "speaking");
    const message = await saveMessage(session.id, agent.id, response, round);
    await broadcastMessage(session.id, message);
    await scoreMessage(message.id);
    await updateAgentStatus(agent.id, "idle");
  }
}
```

### 评分引擎 (Scoring Engine)

评分引擎负责对每条发言进行多维度评分，由3个专业评分者智能体组成：**逻辑评分者**、**创新评分者** 和 **表达评分者**。每个评分者都有独立的评分标准和系统提示词，确保评分的专业性和客观性。

**逻辑评分者**：评估发言的逻辑严密性和推理合理性。评分标准包括论证结构的完整性、推理链条的连贯性、证据的充分性和结论的可靠性。逻辑评分者会检查发言中是否存在逻辑谬误（如循环论证、稻草人谬误、滑坡谬误等），并根据论证质量给出0-10分的评分。

**创新评分者**：评估发言的创新性和突破性。评分标准包括观点的新颖程度、思维的跳跃性、解决方案的独特性和对传统观念的挑战程度。创新评分者会识别发言中的创新元素（如新视角、新方法、新类比等），并根据创新价值给出0-10分的评分。

**表达评分者**：评估发言的语言质量和说服力。评分标准包括语言的清晰度、论述的条理性、修辞的有效性和情感的感染力。表达评分者会分析发言的语言风格、句式结构和修辞手法，并根据表达效果给出0-10分的评分。

**评分流程**：评分引擎采用异步评分机制，在消息保存到数据库后立即触发评分流程。三个评分者并行工作，分别调用 AI API 生成评分和评分理由。评分完成后，系统计算总分（三个维度的总和，满分30分），并将评分结果更新到消息记录中。评分过程不阻塞主讨论流程，确保讨论的流畅性。

**核心代码结构**：

```typescript
// server/scoringEngine.ts
export async function scoreMessage(messageId: string): Promise<void> {
  const message = await getMessageById(messageId);
  const scorers = await getScorerAgents();
  
  const [logicResult, innovationResult, expressionResult] = await Promise.all([
    scoreLogic(message, scorers.logic),
    scoreInnovation(message, scorers.innovation),
    scoreExpression(message, scorers.expression)
  ]);
  
  const totalScore = logicResult.score + innovationResult.score + expressionResult.score;
  
  await updateMessage(messageId, {
    logicScore: logicResult.score,
    innovationScore: innovationResult.score,
    expressionScore: expressionResult.score,
    totalScore,
    scoringReasons: JSON.stringify({
      logic: logicResult.reason,
      innovation: innovationResult.reason,
      expression: expressionResult.reason
    })
  });
}
```

### 总结生成器 (Summary Generator)

总结生成器负责在讨论结束后自动生成结构化的分析报告，包括 **讨论总结**、**关键观点**、**分歧点** 和 **讨论亮点**。该模块通过分析完整的讨论历史，提取核心信息并组织成易于理解的格式。

**讨论总结**：总结生成器会分析所有消息的内容，识别讨论的核心主题、各方的主要论点和讨论的演进过程。总结采用结构化的段落形式，包括讨论背景、各方观点、争论焦点和最终结论。总结长度通常在200-500字之间，既保证信息的完整性，又确保阅读的便捷性。

**关键观点提取**：系统使用 AI 模型识别讨论中的关键观点，并按照重要性排序。关键观点通常包括各方的核心论点、重要的论据和关键的结论。每个关键观点都会标注提出者和所属轮次，方便用户追溯原始发言。

**分歧点识别**：总结生成器会分析各方观点的差异，识别主要的分歧点。分歧点通常体现在价值观、方法论、事实判断或利益权衡等方面。系统会归纳每个分歧点的核心矛盾，并列举各方的立场。

**讨论亮点**：系统会从所有消息中筛选出最有价值的内容，包括 **最佳观点**（逻辑最严密、论证最充分的发言）、**最创新观点**（思维最新颖、突破性最强的发言）和 **精彩金句**（表达最精彩、最具感染力的语句）。亮点的选择综合考虑评分结果和内容质量。

**核心代码结构**：

```typescript
// server/summaryGenerator.ts
export async function generateSummary(sessionId: string): Promise<void> {
  const messages = await getSessionMessages(sessionId);
  const session = await getSessionById(sessionId);
  
  const summaryPrompt = buildSummaryPrompt(messages, session.topic);
  const summaryResult = await invokeLLM({ messages: [
    { role: "system", content: "你是一个专业的讨论分析师..." },
    { role: "user", content: summaryPrompt }
  ]});
  
  const summary = parseSummaryResult(summaryResult);
  
  await updateSession(sessionId, {
    summary: summary.fullSummary,
    keyPoints: summary.keyPoints,
    disagreements: summary.disagreements,
    bestViewpoint: summary.bestViewpoint,
    mostInnovative: summary.mostInnovative,
    bestQuote: summary.bestQuote,
    status: "completed",
    completedAt: new Date()
  });
}
```

### WebSocket 管理器

WebSocket 管理器负责实时通信的所有功能，包括 **连接管理**、**房间管理**、**消息广播** 和 **状态同步**。该模块使用 Socket.IO 库实现，提供可靠的双向通信能力。

**连接管理**：系统为每个客户端维护一个独立的 WebSocket 连接。连接建立时，服务器会验证用户身份并分配唯一的连接ID。连接管理器追踪所有活跃连接，并在连接断开时自动清理资源。系统实现了心跳机制，定期检测连接状态，及时发现并处理僵尸连接。

**房间管理**：每个讨论会话对应一个独立的房间（Room）。客户端通过 `join-debate` 事件加入房间，服务器会将该连接添加到房间的成员列表中。房间管理器支持广播消息到房间内的所有成员，也支持向特定成员发送点对点消息。客户端离开房间或断开连接时，系统自动将其从房间中移除。

**消息广播**：WebSocket 管理器提供多种消息广播方式。`broadcastToRoom` 方法向房间内的所有成员广播消息，`broadcastToOthers` 方法向除发送者外的所有成员广播消息，`sendToClient` 方法向特定客户端发送消息。消息广播采用异步非阻塞模式，确保高并发场景下的性能。

**状态同步**：系统通过 WebSocket 实时同步讨论状态，包括智能体状态、当前轮次、新消息和讨论完成等事件。状态同步采用事件驱动模式，当状态发生变化时，服务器立即推送更新事件到所有订阅该房间的客户端。客户端收到事件后更新本地状态，触发界面重新渲染。

**核心代码结构**：

```typescript
// server/websocket.ts
export function setupWebSocket(io: Server): void {
  io.on("connection", (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);
    
    socket.on("join-debate", async ({ sessionId }) => {
      socket.join(sessionId);
      const messages = await getSessionMessages(sessionId);
      socket.emit("historical-messages", messages);
    });
    
    socket.on("start-debate", async ({ sessionId }) => {
      const userId = socket.data.userId;
      runDebateSession(sessionId, userId).catch(console.error);
    });
    
    socket.on("disconnect", () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });
  });
}

export function broadcastMessage(sessionId: string, message: Message): void {
  io.to(sessionId).emit("new-message", message);
}

export function updateAgentStatus(sessionId: string, agentId: string, status: string): void {
  io.to(sessionId).emit("agent-status", { agentId, status });
}
```

## 数据流程

### 创建讨论流程

用户创建讨论的完整流程涉及前端、后端和数据库三个层面的协同工作。

**前端操作**：用户在创建讨论页面输入话题、选择智能体（至少2个）、设置轮数（1-10轮），点击"开始讨论"按钮。前端验证输入的有效性（话题不为空、至少选择2个智能体、轮数在有效范围内），通过验证后调用 `trpc.debates.create.mutate` 发起创建请求。

**后端处理**：tRPC 路由接收创建请求，提取参数并验证用户权限。系统在数据库中创建新的讨论会话记录，初始状态为 `active`，当前轮次为 `0`。创建成功后，后端返回会话ID和初始数据。前端收到响应后，导航到讨论房间页面（`/debates/:sessionId`）。

**WebSocket 连接**：讨论房间页面加载后，前端建立 WebSocket 连接并发送 `join-debate` 事件。服务器将客户端加入对应的房间，并发送历史消息（如果有）。前端发送 `start-debate` 事件触发讨论开始，服务器调用讨论引擎启动讨论流程。

**数据流示意**：

```
用户输入 → 前端验证 → tRPC API 调用 → 后端创建会话 → 数据库插入记录
    ↓
返回会话ID → 前端导航 → WebSocket 连接 → 加入房间 → 发送 start-debate
    ↓
讨论引擎启动 → 轮次循环 → 智能体发言 → 消息保存 → WebSocket 广播
```

### 讨论进行流程

讨论进行过程是一个循环的状态机，每轮讨论包含多个智能体的依次发言。

**轮次开始**：讨论引擎进入新的轮次，更新会话的 `currentRound` 字段，并通过 WebSocket 广播轮次更新事件。前端收到事件后更新进度指示器（第X轮/共Y轮）。

**智能体发言**：讨论引擎按照预设顺序遍历所有参与的智能体。对于每个智能体，系统执行以下步骤：

1. **状态更新**：将智能体状态设置为"思考中"，通过 WebSocket 广播状态更新
2. **生成回复**：调用 AI API 生成智能体的回复内容，传入讨论话题、历史消息和智能体的系统提示词
3. **状态更新**：将智能体状态设置为"发言中"，通过 WebSocket 广播状态更新
4. **保存消息**：将生成的回复保存到数据库，记录发送者、接收者、内容、轮次等信息
5. **广播消息**：通过 WebSocket 广播新消息事件，前端收到后将消息添加到讨论记录中
6. **触发评分**：异步调用评分引擎对该消息进行评分（不阻塞主流程）
7. **状态更新**：将智能体状态设置为"空闲"，通过 WebSocket 广播状态更新

**轮次结束**：当所有智能体完成当前轮次的发言后，系统检查是否达到总轮数。如果未达到，进入下一轮；如果达到，触发讨论完成流程。

**数据流示意**：

```
轮次开始 → 智能体1思考 → 生成回复 → 保存消息 → 广播消息 → 触发评分
    ↓
智能体2思考 → 生成回复 → 保存消息 → 广播消息 → 触发评分
    ↓
... (所有智能体依次发言)
    ↓
轮次结束 → 检查是否完成 → 进入下一轮 或 触发总结生成
```

### 评分流程

评分流程与讨论流程并行执行，采用异步非阻塞模式，确保不影响讨论的流畅性。

**触发评分**：当一条新消息保存到数据库后，讨论引擎立即调用 `scoreMessage(messageId)` 触发评分流程。该调用采用"触发即忘"（Fire and Forget）模式，不等待评分完成即继续执行后续流程。

**并行评分**：评分引擎同时调用3个评分者智能体的 AI API，传入消息内容和评分标准。三个评分请求并行执行，充分利用网络带宽和 AI API 的并发能力。每个评分者返回一个评分（0-10分）和评分理由（文本说明）。

**结果汇总**：评分引擎等待所有评分者完成评分，计算总分（三个维度的总和），并将评分结果更新到消息记录中。更新操作使用数据库的原子更新能力，确保数据一致性。

**前端更新**：评分完成后，系统通过 WebSocket 广播评分更新事件（可选）。前端收到事件后，重新查询该消息的数据，更新界面显示。如果用户已经滚动到其他位置，评分更新不会打断用户的阅读体验。

**数据流示意**：

```
新消息保存 → 触发评分（异步）
    ↓
并行调用3个评分者 API
    ├─ 逻辑评分者 → 返回逻辑分和理由
    ├─ 创新评分者 → 返回创新分和理由
    └─ 表达评分者 → 返回表达分和理由
    ↓
计算总分 → 更新数据库 → 广播评分更新（可选） → 前端更新显示
```

### 总结生成流程

总结生成流程在讨论完成后自动触发，通过分析完整的讨论历史生成结构化的分析报告。

**触发总结**：当讨论引擎完成最后一轮讨论后，调用 `generateSummary(sessionId)` 触发总结生成流程。系统首先从数据库中查询该会话的所有消息，按照轮次和时间排序。

**构建提示词**：总结生成器根据讨论话题和所有消息内容构建提示词。提示词包含明确的任务说明（生成总结、提取关键观点、识别分歧点、选择亮点）和格式要求（JSON 格式输出）。提示词的设计直接影响总结的质量和结构。

**调用 AI API**：系统调用 AI API 生成总结内容，传入构建好的提示词。AI 模型分析讨论内容，识别核心主题、关键论点和重要结论，生成结构化的总结报告。API 调用通常需要10-30秒，具体时间取决于讨论的长度和复杂度。

**解析结果**：总结生成器解析 AI 返回的 JSON 结果，提取各个字段（完整总结、关键观点、分歧点、最佳观点、最创新观点、精彩金句）。系统验证结果的完整性和格式正确性，对缺失或格式错误的字段进行默认值填充。

**更新会话**：系统将总结结果更新到会话记录中，同时将会话状态设置为 `completed`，记录完成时间。更新操作采用事务机制，确保数据的原子性和一致性。

**通知客户端**：总结生成完成后，系统通过 WebSocket 广播 `debate-complete` 事件，传递完整的总结数据。前端收到事件后，显示总结部分，用户可以查看讨论亮点、完整总结、关键观点和分歧点。

**数据流示意**：

```
讨论完成 → 触发总结生成 → 查询所有消息 → 构建提示词
    ↓
调用 AI API → 生成总结内容 → 解析 JSON 结果 → 验证格式
    ↓
更新会话记录 → 设置状态为 completed → 广播 debate-complete 事件
    ↓
前端显示总结 → 用户查看亮点和分析报告
```

## 性能优化

### 数据库优化

系统采用多种数据库优化策略，确保在高并发场景下的性能和稳定性。

**索引设计**：系统为高频查询字段创建索引，包括会话ID、用户ID、智能体ID、轮次等。索引设计遵循"选择性高、查询频繁"的原则，避免过度索引导致的写入性能下降。复合索引用于多字段联合查询，如 `(sessionId, round)` 用于查询特定会话的特定轮次消息。

**查询优化**：系统避免 N+1 查询问题，使用 JOIN 或批量查询一次性获取关联数据。例如，查询讨论会话时，同时加载参与的智能体信息，而不是为每个智能体ID单独查询。Drizzle ORM 提供的类型安全查询构建器确保查询的正确性和性能。

**连接池管理**：系统使用数据库连接池复用连接，避免频繁创建和销毁连接的开销。连接池大小根据服务器配置和并发需求动态调整，通常设置为 10-50 个连接。连接池实现超时和重试机制，处理数据库临时不可用的情况。

**缓存策略**：对于不经常变化的数据（如智能体列表），系统使用内存缓存减少数据库查询。缓存采用 LRU（Least Recently Used）策略，自动淘汰最少使用的数据。缓存失效策略包括时间过期（TTL）和主动失效（数据更新时清除缓存）。

### API 性能优化

系统通过多种技术手段优化 API 性能，提升响应速度和吞吐量。

**批量操作**：系统将多个相关操作合并为批量操作，减少网络往返次数。例如，创建讨论会话时，同时插入会话记录和智能体关联记录，使用单个数据库事务完成。批量操作显著降低延迟，提升用户体验。

**异步处理**：对于耗时操作（如 AI API 调用、评分、总结生成），系统采用异步处理模式，避免阻塞主流程。异步任务通过事件队列或后台线程执行，完成后通过 WebSocket 通知客户端。这种设计确保 API 响应时间保持在可接受范围内（通常 < 200ms）。

**压缩传输**：系统启用 HTTP 压缩（gzip/brotli），减少网络传输的数据量。tRPC 自动处理请求和响应的压缩，对于大型 JSON 数据（如讨论历史），压缩率可达 70-80%。压缩传输在低带宽网络环境下尤为重要。

**CDN 加速**：静态资源（JS、CSS、图片）通过 CDN 分发，减少服务器负载和网络延迟。CDN 节点分布在全球各地，用户从最近的节点获取资源，显著提升加载速度。系统使用内容哈希（Content Hash）确保缓存的正确性和更新的及时性。

### 前端性能优化

前端性能优化聚焦于渲染效率和用户体验的提升。

**虚拟滚动**：对于长列表（如讨论记录、历史消息），系统使用虚拟滚动技术，仅渲染可见区域的元素。虚拟滚动将 DOM 节点数量控制在常数级别，避免大量 DOM 操作导致的性能问题。即使讨论包含数百条消息，界面依然流畅。

**组件懒加载**：非首屏组件采用懒加载策略，按需加载。例如，讨论总结组件仅在讨论完成后加载，历史记录页面仅在用户访问时加载。懒加载减少初始加载时间，提升首屏渲染速度。

**状态优化**：系统使用 React Hooks 的优化特性（如 `useMemo`、`useCallback`）避免不必要的重新渲染。对于复杂计算（如消息分组、评分统计），使用 `useMemo` 缓存计算结果。对于回调函数，使用 `useCallback` 保持引用稳定，避免子组件重新渲染。

**代码分割**：系统使用动态导入（Dynamic Import）实现代码分割，将应用拆分为多个小块（Chunk）。每个页面对应一个独立的 Chunk，用户访问时按需加载。代码分割显著减少初始加载的 JavaScript 体积，加快应用启动速度。

## 安全设计

### 身份认证

系统采用 **Manus OAuth** 实现用户身份认证，支持安全的单点登录（SSO）。

**OAuth 流程**：用户点击登录按钮后，前端重定向到 Manus OAuth 授权页面。用户在授权页面输入凭证并同意授权后，OAuth 服务器重定向回应用的回调地址（`/api/oauth/callback`），并附带授权码（Authorization Code）。后端使用授权码向 OAuth 服务器交换访问令牌（Access Token），并使用访问令牌获取用户信息。

**会话管理**：后端生成 JWT（JSON Web Token）作为会话令牌，包含用户ID、角色和过期时间等信息。JWT 使用密钥签名，确保令牌的完整性和不可伪造性。后端将 JWT 存储在 HTTP-only Cookie 中，前端无法通过 JavaScript 访问，防止 XSS 攻击窃取令牌。

**令牌刷新**：JWT 设置较短的过期时间（如1小时），过期后需要刷新。系统实现自动刷新机制，在令牌即将过期时，后端自动生成新的 JWT 并更新 Cookie。用户无需重新登录即可保持会话状态。

**权限控制**：系统使用 tRPC 的中间件机制实现权限控制。`protectedProcedure` 要求请求携带有效的 JWT，否则返回 401 未授权错误。中间件从 JWT 中提取用户信息，注入到 `ctx.user` 中，供后续业务逻辑使用。

### 数据安全

系统采用多层防护措施，确保数据的机密性、完整性和可用性。

**传输加密**：所有 HTTP 通信使用 HTTPS 协议，通过 TLS/SSL 加密传输数据。HTTPS 防止中间人攻击（MITM），确保数据在传输过程中不被窃听或篡改。WebSocket 连接也使用 WSS（WebSocket Secure）协议，提供端到端加密。

**数据脱敏**：系统对敏感数据（如用户邮箱、IP地址）进行脱敏处理，避免在日志和错误信息中泄露。脱敏策略包括部分隐藏（如 `user***@example.com`）和哈希处理（如 SHA-256）。

**SQL 注入防护**：系统使用参数化查询（Prepared Statement）防止 SQL 注入攻击。Drizzle ORM 自动处理参数转义和类型转换，确保用户输入不会被解释为 SQL 代码。所有数据库操作都通过 ORM 执行，避免手写 SQL 语句带来的安全风险。

**XSS 防护**：系统对用户输入进行严格的验证和转义，防止跨站脚本攻击（XSS）。React 默认对渲染的内容进行转义，将特殊字符（如 `<`、`>`、`&`）转换为 HTML 实体。对于需要渲染 HTML 的场景（如 Markdown 内容），使用安全的 Markdown 渲染库（如 Streamdown），过滤危险标签和属性。

**CSRF 防护**：系统使用 SameSite Cookie 属性防止跨站请求伪造（CSRF）攻击。SameSite 属性限制 Cookie 仅在同站请求中发送，防止第三方网站伪造请求。对于敏感操作（如删除会话），系统要求额外的 CSRF Token 验证。

### API 安全

系统实现多种 API 安全措施，防止滥用和攻击。

**速率限制**：系统对 API 请求实施速率限制（Rate Limiting），防止恶意用户发起大量请求导致服务不可用。速率限制基于用户ID或IP地址，使用滑动窗口算法计算请求频率。超过限制的请求返回 429 Too Many Requests 错误。

**输入验证**：系统对所有 API 输入进行严格验证，确保数据类型、格式和范围符合预期。tRPC 使用 Zod 库定义输入模式（Schema），自动验证请求参数。验证失败的请求返回 400 Bad Request 错误，并附带详细的错误信息。

**错误处理**：系统实现统一的错误处理机制，避免在错误信息中泄露敏感信息（如数据库结构、内部路径）。错误响应使用标准化的格式，包含错误代码、错误消息和请求ID。详细的错误信息记录在服务器日志中，供开发者调试使用。

**日志审计**：系统记录所有关键操作的审计日志，包括用户登录、创建会话、删除数据等。审计日志包含操作时间、操作用户、操作类型和操作结果等信息。日志采用结构化格式（JSON），便于后续分析和监控。

## 扩展性设计

### 水平扩展

系统采用无状态架构，支持水平扩展以应对高并发场景。

**无状态设计**：后端服务不在内存中存储会话状态，所有状态信息存储在数据库或外部缓存（如 Redis）中。无状态设计使得任意后端实例都可以处理任意请求，无需会话亲和性（Session Affinity）。这种设计简化了负载均衡和故障恢复。

**负载均衡**：系统使用负载均衡器（如 Nginx、HAProxy）将请求分发到多个后端实例。负载均衡策略包括轮询（Round Robin）、最少连接（Least Connections）和 IP 哈希（IP Hash）。负载均衡器定期检测后端实例的健康状态，自动剔除故障实例。

**WebSocket 扩展**：WebSocket 连接具有状态性，需要特殊的扩展策略。系统使用 Redis 作为 WebSocket 消息的发布-订阅（Pub/Sub）中间件。当一个后端实例需要向某个房间广播消息时，它将消息发布到 Redis 频道，所有订阅该频道的后端实例接收消息并转发到各自的 WebSocket 连接。这种设计实现了跨实例的消息广播。

**数据库扩展**：系统支持数据库的读写分离和分片（Sharding）。读写分离将读操作分发到只读副本，减轻主库压力。分片将数据按照某种规则（如用户ID）分散到多个数据库实例，提升并发能力和存储容量。Drizzle ORM 支持多数据源配置，简化数据库扩展的实现。

### 功能扩展

系统采用模块化和插件化设计，支持灵活的功能扩展。

**自定义智能体**：系统支持用户添加自定义智能体，只需在数据库中插入新的智能体记录，指定名称、角色、描述和系统提示词。自定义智能体会自动出现在创建讨论页面的选择列表中，无需修改代码。系统提供智能体管理界面，方便用户创建、编辑和删除智能体。

**自定义评分标准**：评分标准通过配置文件或数据库定义，支持灵活调整。用户可以修改评分维度、权重和提示词，定制符合特定场景的评分体系。系统提供评分标准的版本管理，支持回滚和比较。

**插件系统**：系统预留插件接口，支持第三方开发者扩展功能。插件可以注册自定义的 tRPC 路由、WebSocket 事件处理器和数据库模型。插件通过配置文件启用或禁用，支持热加载和热卸载。插件系统使得系统功能可以按需组合，满足不同用户的需求。

**多语言支持**：系统采用国际化（i18n）框架，支持多语言界面。语言包存储在独立的 JSON 文件中，包含所有界面文本的翻译。用户可以在设置中切换语言，系统自动加载对应的语言包并重新渲染界面。多语言支持使得系统可以服务全球用户。

### 监控与运维

系统实现全面的监控和运维能力，确保服务的稳定性和可靠性。

**性能监控**：系统集成性能监控工具（如 Prometheus、Grafana），实时追踪关键指标（如请求延迟、吞吐量、错误率、CPU使用率、内存使用率）。监控数据通过仪表盘可视化展示，支持历史数据查询和趋势分析。性能监控帮助开发者及时发现和解决性能瓶颈。

**日志聚合**：系统使用日志聚合工具（如 ELK Stack、Loki）集中管理日志。所有后端实例的日志统一收集、索引和存储，支持全文搜索和实时查询。日志聚合简化故障排查，提升运维效率。

**告警机制**：系统配置告警规则，当关键指标超过阈值时自动触发告警。告警通过多种渠道发送（如邮件、短信、Slack），确保运维人员及时响应。告警规则支持灵活配置，包括阈值、持续时间和告警级别。

**健康检查**：系统提供健康检查接口（`/health`），返回服务的健康状态。健康检查包括数据库连接、外部API可用性和关键服务状态。负载均衡器和监控工具定期调用健康检查接口，自动剔除不健康的实例。

---

**文档版本**: 1.0  
**最后更新**: 2026-01-12  
**作者**: Manus AI
