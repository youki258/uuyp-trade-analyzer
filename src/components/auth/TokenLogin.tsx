import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loginWithToken } from "@/utils/statelessApi";
import type { AuthInfo } from "@/types/stateless";

interface TokenLoginProps {
  isBusy: boolean;
  onRefreshState: () => Promise<void>;
  onRefreshFiles: () => Promise<void>;
  onAuthSuccess: (info: AuthInfo) => void;
}

export function TokenLogin({
  isBusy,
  onRefreshState,
  onRefreshFiles,
  onAuthSuccess,
}: TokenLoginProps) {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    const tokenTrim = token.trim();
    if (!tokenTrim) {
      setMessage("请粘贴 Bearer Token");
      return;
    }
    if (tokenTrim.length < 20) {
      setMessage("Token 长度异常，请确认粘贴完整");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const result = await loginWithToken(tokenTrim);
      if (result.status === "ok") {
        setToken("");
        setMessage("Token 登录成功");
        await onRefreshState();
        await onRefreshFiles();
      } else {
        setMessage(result.message || "登录失败");
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
        <KeyRound className="w-4 h-4" />
        <span>粘贴 Bearer Token 登录（适合公网服务器部署）</span>
      </div>
      <input
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="粘贴 Token（可通过 APP 抓包获取）"
        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
        disabled={isBusy || loading}
        autoComplete="off"
      />
      <Button
        onClick={handleLogin}
        disabled={isBusy || loading}
        variant="outline"
        className="w-full"
      >
        {loading ? "验证中..." : "Token 登录"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Token 仅保存在服务端内存会话中，会话过期即清除，不会落盘。
      </p>
      {message && <p className="text-sm text-primary">{message}</p>}
    </div>
  );
}
