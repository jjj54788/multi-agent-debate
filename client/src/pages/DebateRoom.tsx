import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useDebateSocket } from "@/hooks/useDebateSocket";
import { ArrowLeft, Loader2, Play, CheckCircle2, TrendingUp, Sparkles, Quote } from "lucide-react";
import { Link, useParams } from "wouter";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { DebateFlowChart } from "@/components/DebateFlowChart";

export default function DebateRoom() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user, loading: authLoading } = useAuth();

  const { data: session, isLoading: sessionLoading } = trpc.debate.get.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );

  const { data: agents } = trpc.agents.list.useQuery();

  const {
    connected,
    messages,
    agentStatuses,
    currentRound,
    isDebateComplete,
    completedSession,
    error,
    startDebate,
  } = useDebateSocket(sessionId || null);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const selectedAgents = useMemo(() => {
    if (!agents || !session) return [];
    return agents.filter((agent) => session.agentIds.includes(agent.id));
  }, [agents, session]);

  const getAgentById = (id: string) => {
    return selectedAgents.find((agent) => agent.id === id);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      idle: { label: "空闲", variant: "secondary" as const },
      thinking: { label: "思考中", variant: "default" as const },
      speaking: { label: "发言中", variant: "default" as const },
      waiting: { label: "等待中", variant: "outline" as const },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.idle;
  };

  if (authLoading || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>讨论不存在</CardTitle>
            <CardDescription>找不到该讨论会话</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button>返回首页</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canStart = session.status === "pending" && connected;
  const isRunning = session.status === "running" || messages.length > 0;
  const isCompleted = session.status === "completed" || isDebateComplete;
  const progress = ((currentRound || session.currentRound) / session.maxRounds) * 100;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回
              </Button>
            </Link>
            <div className="flex items-center gap-4">
              <Badge variant={connected ? "default" : "secondary"}>
                {connected ? "已连接" : "未连接"}
              </Badge>
              {canStart && (
                <Button onClick={startDebate} size="sm">
                  <Play className="h-4 w-4 mr-2" />
                  开始讨论
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6">
        {!connected && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                正在连接到讨论服务器...
              </p>
            </div>
          </div>
        )}

        {/* Topic and Progress Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{session.topic}</CardTitle>
                <CardDescription>
                  {selectedAgents.length} 个智能体正在参与讨论
                </CardDescription>
              </div>
              {isCompleted && (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  已完成
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">讨论进度</span>
                <span className="font-medium">
                  第 {currentRound || session.currentRound} / {session.maxRounds} 轮
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Agent Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {selectedAgents.map((agent) => {
            const status = agentStatuses[agent.id] || "idle";
            const statusInfo = getStatusBadge(status);
            const isActive = status === "thinking" || status === "speaking";
            
            return (
              <Card 
                key={agent.id} 
                className={`transition-all duration-300 ${isActive ? 'ring-2 ring-offset-2' : ''}`}
                style={{ 
                  boxShadow: isActive ? `0 0 20px ${agent.color}40` : undefined 
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${isActive ? 'animate-pulse' : ''}`}
                      style={{ backgroundColor: agent.color }}
                    >
                      {agent.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{agent.name}</div>
                      <Badge variant={statusInfo.variant} className="text-xs mt-1">
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {agent.profile}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Split View: Messages + Flow Chart */}
        {!isRunning && !isCompleted ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {!connected ? (
              <>
                <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
                <h3 className="text-lg font-semibold mb-2">正在连接...</h3>
                <p className="text-sm text-muted-foreground">
                  请稍候，正在建立实时连接
                </p>
              </>
            ) : (
              <>
                <Play className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">准备就绪</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  点击右上角的 <span className="font-semibold text-primary">"开始讨论"</span> 按钮启动智能体讨论
                </p>
                <Button onClick={startDebate} size="lg">
                  <Play className="h-5 w-5 mr-2" />
                  开始讨论
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left: Messages Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>讨论记录</CardTitle>
                <CardDescription>实时显示智能体的发言内容</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[700px] pr-4">
                  <div className="space-y-6">
                    {messages.map((message, index) => {
                      const agent = getAgentById(message.sender);
                      const isLatest = index === messages.length - 1;
                      
                      return (
                        <div 
                          key={message.id} 
                          className={`message-enter ${isLatest ? 'animate-in fade-in slide-in-from-bottom-4 duration-500' : ''}`}
                        >
                          <div className="flex gap-4">
                            <div
                              className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-semibold ${isLatest ? 'ring-2 ring-offset-2' : ''}`}
                              style={{ 
                                backgroundColor: agent?.color || "#999"
                              }}
                            >
                              {agent?.name.charAt(0)}
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{agent?.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  第 {message.round} 轮
                                </Badge>
                                {isLatest && (
                                  <Badge variant="default" className="text-xs">
                                    最新
                                  </Badge>
                                )}
                              </div>
                              <div className="prose prose-sm max-w-none dark:prose-invert">
                                <Streamdown>{message.content}</Streamdown>
                              </div>
                              {/* Display scores if available */}
                              {message.totalScore != null && message.totalScore > 0 && (
                                <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2">
                                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                    <span>📊 评分</span>
                                    <Badge variant="secondary" className="text-xs">
                                      总分: {(message.totalScore ?? 0).toFixed(1)}/30
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className="flex items-center gap-1">
                                      <span className="text-muted-foreground">逻辑:</span>
                                      <span className="font-semibold text-indigo-600">{message.logicScore?.toFixed(1) || 0}/10</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-muted-foreground">创新:</span>
                                      <span className="font-semibold text-pink-600">{message.innovationScore?.toFixed(1) || 0}/10</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-muted-foreground">表达:</span>
                                      <span className="font-semibold text-teal-600">{message.expressionScore?.toFixed(1) || 0}/10</span>
                                    </div>
                                  </div>
                                  {message.scoringReasons && (
                                    <details className="text-xs">
                                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">查看评分理由</summary>
                                      <div className="mt-2 space-y-1 pl-2 border-l-2 border-muted">
                                        {typeof message.scoringReasons === 'string' ? (
                                          <p className="text-muted-foreground">{message.scoringReasons}</p>
                                        ) : (
                                          <>
                                            <p><span className="font-semibold text-indigo-600">逻辑:</span> {message.scoringReasons.logic}</p>
                                            <p><span className="font-semibold text-pink-600">创新:</span> {message.scoringReasons.innovation}</p>
                                            <p><span className="font-semibold text-teal-600">表达:</span> {message.scoringReasons.expression}</p>
                                          </>
                                        )}
                                      </div>
                                    </details>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          {index < messages.length - 1 && <Separator className="my-6" />}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Right: Flow Chart */}
            <Card>
              <CardHeader>
                <CardTitle>讨论流程可视化</CardTitle>
                <CardDescription>实时展示智能体之间的交互关系和消息传递</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[700px] border rounded-lg overflow-hidden">
                  <DebateFlowChart
                    agents={selectedAgents}
                    agentStatuses={agentStatuses}
                    messages={messages}
                    currentRound={currentRound || session.currentRound}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Highlights Section - Show after completion */}
        {isCompleted && completedSession && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                讨论亮点
              </CardTitle>
              <CardDescription>自动提取的精华内容</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                {/* Best Viewpoint */}
                {completedSession.bestViewpoint && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400">
                      <TrendingUp className="h-4 w-4" />
                      最佳观点
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm">{completedSession.bestViewpoint}</p>
                    </div>
                  </div>
                )}

                {/* Most Innovative */}
                {completedSession.mostInnovative && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-purple-600 dark:text-purple-400">
                      <Sparkles className="h-4 w-4" />
                      最创新观点
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <p className="text-sm">{completedSession.mostInnovative}</p>
                    </div>
                  </div>
                )}

                {/* Golden Quote */}
                {completedSession.goldenQuotes && completedSession.goldenQuotes.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                      <Quote className="h-4 w-4" />
                      精彩金句
                    </div>
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <p className="text-sm italic">"{completedSession.goldenQuotes[0]}"</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Full Summary */}
              <Separator className="my-6" />
              <div className="space-y-4">
                <h4 className="font-semibold">完整总结</h4>
                {completedSession.summary && (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <Streamdown>{completedSession.summary}</Streamdown>
                  </div>
                )}

                {completedSession.keyPoints && completedSession.keyPoints.length > 0 && (
                  <>
                    <h4 className="font-semibold mt-6">关键观点</h4>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                      {completedSession.keyPoints.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                  </>
                )}

                {completedSession.disagreements && completedSession.disagreements.length > 0 && (
                  <>
                    <h4 className="font-semibold mt-6">分歧点</h4>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                      {completedSession.disagreements.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
