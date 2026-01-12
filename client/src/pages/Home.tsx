import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { MessageSquare, Users, TrendingUp, History } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">多智能体讨论系统</h1>
          </div>
          <div>
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">欢迎，{user?.name}</span>
                <Link href="/debates">
                  <Button>进入讨论</Button>
                </Link>
              </div>
            ) : (
              <Button asChild>
                <a href={getLoginUrl()}>登录</a>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-20">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-5xl font-bold tracking-tight">
            让 AI 智能体为你
            <span className="text-primary"> 多角度分析问题</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            基于 MetaGPT 架构，多个不同人格的 AI 智能体协同工作，从反对、批判、支持、中立和创新等多个角度深入讨论任何话题
          </p>
          <div className="flex gap-4 justify-center pt-4">
            {isAuthenticated ? (
              <Link href="/debates/new">
                <Button size="lg">开始新讨论</Button>
              </Link>
            ) : (
              <Button size="lg" asChild>
                <a href={getLoginUrl()}>立即开始</a>
              </Button>
            )}
            <Link href="/debates">
              <Button size="lg" variant="outline">
                查看历史讨论
              </Button>
            </Link>
            {isAuthenticated && (
              <Link href="/settings/ai-providers">
                <Button size="lg" variant="outline">
                  AI 设置
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <Users className="h-10 w-10 text-primary mb-2" />
              <CardTitle>多人格智能体</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                5 种预设人格：反对者、批判者、支持者、中立者和创新者，每个智能体都有独特的思维模式
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <MessageSquare className="h-10 w-10 text-primary mb-2" />
              <CardTitle>实时讨论</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                通过 WebSocket 实时推送讨论进度，观看智能体之间的精彩辩论过程
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-10 w-10 text-primary mb-2" />
              <CardTitle>智能分析</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                自动生成讨论摘要、提取关键观点、识别共识和分歧点，帮助你快速理解讨论结果
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <History className="h-10 w-10 text-primary mb-2" />
              <CardTitle>历史记录</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                完整保存所有讨论记录，支持随时回顾和分析历史讨论内容
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">如何使用</h2>
          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">输入讨论话题</h3>
                <p className="text-muted-foreground">
                  输入你想要讨论的任何话题，可以是技术问题、商业决策、社会议题等
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">选择参与智能体</h3>
                <p className="text-muted-foreground">
                  从 5 种人格中选择至少 2 个智能体参与讨论，不同组合会产生不同的讨论效果
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">观看实时讨论</h3>
                <p className="text-muted-foreground">
                  智能体们会依次发言，实时显示讨论过程，你可以看到每个智能体的状态和发言内容
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                4
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">查看分析结果</h3>
                <p className="text-muted-foreground">
                  讨论结束后，系统会自动生成摘要、关键观点、共识和分歧点的分析报告
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t mt-20">
        <div className="container py-8 text-center text-sm text-muted-foreground">
          <p>基于 MetaGPT 架构的多智能体讨论系统</p>
        </div>
      </footer>
    </div>
  );
}
