import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loginWithPassword } from "@/utils/statelessApi";

// 中国大陆手机号：1 开头、第二位 3-9、共 11 位数字
const PHONE_REGEX = /^1[3-9]\d{9}$/;

interface PasswordLoginProps {
  isBusy: boolean;
  onRefreshState: () => Promise<void>;
  onRefreshFiles: () => Promise<void>;
}

export function PasswordLogin({
  isBusy,
  onRefreshState,
  onRefreshFiles,
}: PasswordLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    const usernameTrim = username.trim();
    if (!usernameTrim) {
      setMessage("请输入手机号");
      return;
    }
    if (!PHONE_REGEX.test(usernameTrim)) {
      setMessage("请输入有效的中国大陆手机号");
      return;
    }
    if (!password) {
      setMessage("请输入密码");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const result = await loginWithPassword(usernameTrim, password);
      if (result.status === "ok") {
        setUsername("");
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
        <span>使用手机号 + 密码登录</span>
      </div>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="手机号"
        className="h-9 w-full rounded-md border border-hairline bg-inset px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        disabled={isBusy || loading}
        autoComplete="username"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="密码"
        className="h-9 w-full rounded-md border border-hairline bg-inset px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        disabled={isBusy || loading}
        autoComplete="current-password"
      />
      <Button
        onClick={handleLogin}
        disabled={isBusy || loading}
        variant="outline"
        className="w-full"
      >
        {loading ? "登录中..." : "密码登录"}
      </Button>
      <p className="text-xs text-muted-foreground">
        密码仅用于本次登录换取 Token，服务端不存储。
      </p>
      {message && <p className="text-sm text-primary">{message}</p>}
    </div>
  );
}
