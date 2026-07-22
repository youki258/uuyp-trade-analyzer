import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authByPassword } from "@/utils/statelessApi";
import type { AuthInfo } from "@/types/stateless";

interface PasswordLoginProps {
  isBusy: boolean;
  onRefreshState: () => Promise<void>;
  onRefreshFiles: () => Promise<void>;
  onAuthSuccess: (info: AuthInfo) => void;
}

export function PasswordLogin({
  isBusy,
  onRefreshState,
  onRefreshFiles,
  onAuthSuccess,
}: PasswordLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!username.trim() || !password.trim()) {
      setMessage("请输入账号和密码");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const result = await authByPassword(username.trim(), password);
      if (result.status === "ok") {
        setPassword("");
        setMessage("密码登录成功");
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
        <Lock className="w-4 h-4" />
        <span>使用账号密码登录（网页版）</span>
      </div>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="手机号"
        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
        disabled={isBusy || loading}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="密码"
        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
        disabled={isBusy || loading}
      />
      <Button
        onClick={handleSubmit}
        disabled={isBusy || loading}
        className="w-full"
      >
        {loading ? "登录中..." : "密码登录"}
      </Button>
      {message && (
        <p className="text-sm text-primary">{message}</p>
      )}
    </div>
  );
}
