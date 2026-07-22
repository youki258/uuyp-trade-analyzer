import { useState } from "react";
import { Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApiResult, AuthInfo } from "@/types/stateless";

interface TokenLoginProps {
  isBusy: boolean;
  onAuth: (token: string) => Promise<ApiResult>;
  onRefreshState: () => Promise<void>;
  onRefreshFiles: () => Promise<void>;
  onAuthSuccess: (info: AuthInfo) => void;
}

export function TokenLogin({
  isBusy,
  onAuth,
  onRefreshState,
  onRefreshFiles,
  onAuthSuccess,
}: TokenLoginProps) {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!token.trim()) {
      setMessage("请输入 Token");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const result = await onAuth(token.trim());
      if (result.status === "ok") {
        setToken("");
        setMessage("Token 认证成功");
        await onRefreshState();
        await onRefreshFiles();
      } else {
        setMessage(result.message || "Token 认证失败");
      }
    } catch {
      setMessage("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Key className="w-4 h-4" />
        <span>粘贴从 App 抓取的 Bearer Token</span>
      </div>
      <input
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="eyJhbGciOi..."
        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-mono"
        disabled={isBusy || loading}
      />
      <Button
        onClick={handleSubmit}
        disabled={isBusy || loading}
        className="w-full"
      >
        {loading ? "认证中..." : "Token 登录"}
      </Button>
      {message && (
        <p className="text-sm text-primary">{message}</p>
      )}
    </div>
  );
}
