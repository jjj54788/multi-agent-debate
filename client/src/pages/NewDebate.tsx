import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function NewDebate() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [topic, setTopic] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [maxRounds, setMaxRounds] = useState(5);

  const { data: agents, isLoading: agentsLoading } = trpc.agents.list.useQuery();
  const createDebate = trpc.debate.create.useMutation({
    onSuccess: (data) => {
      toast.success("讨论创建成功！");
      setLocation(`/debates/${data.sessionId}`);
    },
    onError: (error) => {
      toast.error(`创建失败：${error.message}`);
    },
  });

  const handleAgentToggle = (agentId: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!topic.trim()) {
      toast.error("请输入讨论话题");
      return;
    }

    if (selectedAgents.length < 2) {
      toast.error("请至少选择 2 个智能体");
      return;
    }

    createDebate.mutate({
      topic: topic.trim(),
      agentIds: selectedAgents,
      maxRounds,
    });
  };

  if (authLoading || agentsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container py-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回首页
            </Button>
          </Link>
        </div>
      </header>

      <main className="container py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">创建新讨论</h1>
            <p className="text-muted-foreground">
              选择智能体并输入话题，让 AI 们为你深入分析
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Topic Input */}
            <Card>
              <CardHeader>
                <CardTitle>讨论话题</CardTitle>
                <CardDescription>输入你想要讨论的问题或话题</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="例如：人工智能是否会取代人类的工作？"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </CardContent>
            </Card>

            {/* Agent Selection */}
            <Card>
              <CardHeader>
                <CardTitle>选择参与智能体</CardTitle>
                <CardDescription>至少选择 2 个智能体参与讨论</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {agents?.map((agent) => (
                    <div
                      key={agent.id}
                      className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => handleAgentToggle(agent.id)}
                    >
                      <Checkbox
                        id={agent.id}
                        checked={selectedAgents.includes(agent.id)}
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: agent.color }}
                          />
                          <Label
                            htmlFor={agent.id}
                            className="text-base font-semibold cursor-pointer"
                          >
                            {agent.name}
                          </Label>
                          <span className="text-sm text-muted-foreground">
                            {agent.profile}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {agent.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Rounds Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>讨论轮数</CardTitle>
                <CardDescription>设置讨论的轮数（1-10 轮）</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={maxRounds}
                    onChange={(e) => setMaxRounds(parseInt(e.target.value) || 5)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    每个智能体将发言 {maxRounds} 次
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Link href="/">
                <Button type="button" variant="outline">
                  取消
                </Button>
              </Link>
              <Button type="submit" disabled={createDebate.isPending}>
                {createDebate.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  "开始讨论"
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
