import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Plus, Trash2, Check } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function AIProviderSettings() {
  const { user, loading: authLoading } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    provider: "manus" as "manus" | "openai" | "anthropic" | "custom",
    name: "",
    apiKey: "",
    baseURL: "",
    model: "",
  });

  const { data: providers, isLoading, refetch } = trpc.aiProvider.list.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: activeProvider } = trpc.aiProvider.getActive.useQuery(undefined, {
    enabled: !!user,
  });

  const createProvider = trpc.aiProvider.create.useMutation({
    onSuccess: () => {
      toast.success("AI 提供商配置已创建");
      setIsDialogOpen(false);
      setFormData({
        provider: "manus",
        name: "",
        apiKey: "",
        baseURL: "",
        model: "",
      });
      refetch();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const deleteProvider = trpc.aiProvider.delete.useMutation({
    onSuccess: () => {
      toast.success("AI 提供商配置已删除");
      refetch();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  const setActive = trpc.aiProvider.setActive.useMutation({
    onSuccess: () => {
      toast.success("已切换活跃的 AI 提供商");
      refetch();
    },
    onError: (error) => {
      toast.error(`切换失败: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProvider.mutate(formData);
  };

  if (authLoading || isLoading) {
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
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">AI 提供商设置</h1>
              <p className="text-muted-foreground mt-2">
                配置多个 AI 提供商，支持 OpenAI、Anthropic 等
              </p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  添加提供商
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>添加 AI 提供商</DialogTitle>
                  <DialogDescription>
                    配置新的 AI 提供商以用于讨论系统
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="provider">提供商类型</Label>
                      <Select
                        value={formData.provider}
                        onValueChange={(value: any) =>
                          setFormData({ ...formData, provider: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manus">Manus (内置)</SelectItem>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="anthropic">Anthropic</SelectItem>
                          <SelectItem value="custom">自定义</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">配置名称</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="例如：我的 OpenAI 配置"
                        required
                      />
                    </div>

                    {formData.provider !== "manus" && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="apiKey">API Key</Label>
                          <Input
                            id="apiKey"
                            type="password"
                            value={formData.apiKey}
                            onChange={(e) =>
                              setFormData({ ...formData, apiKey: e.target.value })
                            }
                            placeholder="sk-..."
                          />
                        </div>

                        {formData.provider === "custom" && (
                          <div className="space-y-2">
                            <Label htmlFor="baseURL">Base URL</Label>
                            <Input
                              id="baseURL"
                              value={formData.baseURL}
                              onChange={(e) =>
                                setFormData({ ...formData, baseURL: e.target.value })
                              }
                              placeholder="https://api.example.com/v1"
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="model">模型名称（可选）</Label>
                          <Input
                            id="model"
                            value={formData.model}
                            onChange={(e) =>
                              setFormData({ ...formData, model: e.target.value })
                            }
                            placeholder={
                              formData.provider === "openai"
                                ? "gpt-4o-mini"
                                : formData.provider === "anthropic"
                                  ? "claude-3-5-sonnet-20241022"
                                  : "default"
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      取消
                    </Button>
                    <Button type="submit" disabled={createProvider.isPending}>
                      {createProvider.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      创建
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {providers?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  暂无 AI 提供商配置，点击上方按钮添加
                </CardContent>
              </Card>
            ) : (
              providers?.map((provider) => (
                <Card key={provider.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {provider.name}
                          {activeProvider?.id === provider.id && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                              <Check className="h-3 w-3" />
                              活跃
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {provider.provider === "manus" && "Manus 内置 AI"}
                          {provider.provider === "openai" && "OpenAI"}
                          {provider.provider === "anthropic" && "Anthropic"}
                          {provider.provider === "custom" && "自定义 API"}
                          {provider.model && ` · ${provider.model}`}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {activeProvider?.id !== provider.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActive.mutate({ id: provider.id })}
                            disabled={setActive.isPending}
                          >
                            设为活跃
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteProvider.mutate({ id: provider.id })}
                          disabled={deleteProvider.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {provider.baseURL && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Base URL: {provider.baseURL}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
