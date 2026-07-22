import { useState } from "react";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendSmsCode, verifySmsCode } from "@/utils/statelessApi";
import type { AuthInfo } from "@/types/stateless";

// 中国大陆手机号：1 开头、第二位 3-9、共 11 位数字
const PHONE_REGEX = /^1[3-9]\d{9}$/;

interface SmsLoginProps {
  isBusy: boolean;
  onRefreshState: () => Promise<void>;
  onRefreshFiles: () => Promise<void>;
  onAuthSuccess: (info: AuthInfo) => void;
}

export function SmsLogin({
  isBusy,
  onRefreshState,
  onRefreshFiles,
  onAuthSuccess,
}: SmsLoginProps) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    const phoneTrim = phone.trim();
    if (!phoneTrim) {
      setMessage("请输入手机号");
      return;
    }
    if (!PHONE_REGEX.test(phoneTrim)) {
      setMessage("请输入有效的中国大陆手机号");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const result = await sendSmsCode(phoneTrim);
      if (result.status === "ok") {
        setMessage(
          result.requiresManualSms
            ? "需手动短信验证，完成后可直接点验证码登录"
            : "验证码已发送",
        );
      } else {
        setMessage(result.message || "发送失败");
      }
    } catch {
      setMessage("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    const phoneTrim = phone.trim();
    if (!phoneTrim) {
      setMessage("请输入手机号");
      return;
    }
    if (!PHONE_REGEX.test(phoneTrim)) {
      setMessage("请输入有效的中国大陆手机号");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const result = await verifySmsCode(phoneTrim, code.trim());
      if (result.status === "ok") {
        setPhone("");
        setCode("");
        setMessage("短信登录成功");
        await onRefreshState();
        await onRefreshFiles();
      } else {
        setMessage(result.message || "验证失败");
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
        <Smartphone className="w-4 h-4" />
        <span>使用手机号 + 短信验证码登录</span>
      </div>
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="手机号"
        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
        disabled={isBusy || loading}
      />
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={handleSend}
          disabled={isBusy || loading}
          variant="outline"
        >
          {loading ? "发送中..." : "发送验证码"}
        </Button>
        <Button
          onClick={handleVerify}
          disabled={isBusy || loading}
          variant="outline"
        >
          验证码登录
        </Button>
      </div>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="验证码（手动短信可留空）"
        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
        disabled={isBusy || loading}
      />
      {message && (
        <p className="text-sm text-primary">{message}</p>
      )}
    </div>
  );
}
