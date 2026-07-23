import { useState } from "react";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendSmsCode, verifySmsCode } from "@/utils/statelessApi";

// 中国大陆手机号：1 开头、第二位 3-9、共 11 位数字
const PHONE_REGEX = /^1[3-9]\d{9}$/;

interface SmsLoginProps {
  isBusy: boolean;
  onRefreshState: () => Promise<void>;
  onRefreshFiles: () => Promise<void>;
}

export function SmsLogin({
  isBusy,
  onRefreshState,
  onRefreshFiles,
}: SmsLoginProps) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [smsUpContent, setSmsUpContent] = useState("");
  const [smsUpNumber, setSmsUpNumber] = useState("");
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
        const manual = result.requiresManualSms === true;
        setManualMode(manual);
        setSmsUpContent(result.smsUpContent || "");
        setSmsUpNumber(result.smsUpNumber || "");
        setMessage(
          result.requiresManualSms
            ? "自动发送受限，请改用手动短信验证"
            : "验证码已发送",
        );
      } else {
        setManualMode(false);
        setMessage(
          result.hint === "manual_or_token"
            ? `${result.message || "发送失败"}（可改用 Token 登录）`
            : result.message || "发送失败",
        );
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
        setManualMode(false);
        setSmsUpContent("");
        setSmsUpNumber("");
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
        className="h-9 w-full rounded-md border border-hairline bg-inset px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
        className="h-9 w-full rounded-md border border-hairline bg-inset px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        disabled={isBusy || loading}
      />
      {manualMode && (
        <div className="space-y-1 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
          <p className="font-medium">手动短信验证步骤：</p>
          <ol className="list-decimal list-inside space-y-0.5">
            {smsUpContent && smsUpNumber ? (
              <li>
                用上方手机号对应的手机发送短信「
                <span className="font-semibold select-all">{smsUpContent}</span>
                」到号码「
                <span className="font-semibold select-all">{smsUpNumber}</span>
                」；
              </li>
            ) : (
              <li>打开悠悠有品官方 APP 并用上方手机号触发登录，APP 会显示上行短信的内容与目标号码，按提示用本机发送；</li>
            )}
            <li>发送完成后回到本页面，验证码留空；</li>
            <li>直接点击「验证码登录」完成登录。</li>
          </ol>
        </div>
      )}
      {message && (
        <p className="text-sm text-primary">{message}</p>
      )}
    </div>
  );
}
