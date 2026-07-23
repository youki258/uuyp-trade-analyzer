import { useState } from "react";
import { Download, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SmsLogin } from "./SmsLogin";
import { TokenLogin } from "./TokenLogin";
import { PasswordLogin } from "./PasswordLogin";
import type { AuthInfo, ServerFile } from "@/types/stateless";
import { destroySession, startFetch } from "@/utils/statelessApi";

type LoginMethod = "sms" | "password" | "token";

const LOGIN_TABS: { key: LoginMethod; label: string; recommended?: boolean }[] =
  [
    { key: "sms", label: "短信", recommended: true },
    { key: "password", label: "密码" },
    { key: "token", label: "Token" },
  ];

interface AuthPanelProps {
  authInfo: AuthInfo;
  isBusy: boolean;
  onRefreshState: () => Promise<void>;
  onRefreshFiles: () => Promise<void>;
  onFetchStart: () => void;
  onFetchSuccess: (files: ServerFile[]) => void;
  onFetchError: (message: string) => void;
  onDestroy: () => void;
}

export function AuthPanel({
  authInfo,
  isBusy,
  onRefreshState,
  onRefreshFiles,
  onFetchStart,
  onFetchSuccess,
  onFetchError,
  onDestroy,
}: AuthPanelProps) {
  const [fetchLoading, setFetchLoading] = useState(false);
  const [destroyLoading, setDestroyLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("sms");

  async function handleFetch() {
    setFetchLoading(true);
    onFetchStart();
    try {
      const result = await startFetch({ exportSplit: true });
      if (result.status === "ok") {
        const files = Array.isArray(result.files) ? result.files : [];
        onFetchSuccess(files);
      } else {
        onFetchError(result.message || "抓取失败");
      }
    } catch {
      onFetchError("网络错误，请重试");
    } finally {
      setFetchLoading(false);
    }
  }

  async function handleDestroy() {
    setDestroyLoading(true);
    try {
      const result = await destroySession();
      if (result.status === "ok") {
        onDestroy();
      }
    } finally {
      setDestroyLoading(false);
    }
  }

  return (
    <section className="panel">
      <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
        <h3 className="text-sm font-medium text-foreground">会话认证</h3>
        {authInfo.authenticated && (
          <span className="text-xs text-emerald-400">
            {authInfo.nickname || authInfo.userId || "已认证"}
          </span>
        )}
      </div>

      <div className="p-5">
        {!authInfo.authenticated ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-0.5 rounded-md border border-hairline bg-inset p-0.5">
              {LOGIN_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setLoginMethod(tab.key)}
                  disabled={isBusy}
                  className={`h-7 rounded px-2 text-xs transition-colors ${
                    loginMethod === tab.key
                      ? "bg-white/[0.08] text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  {tab.recommended && (
                    <span className="ml-1 text-[11px] text-primary">推荐</span>
                  )}
                </button>
              ))}
            </div>
            {loginMethod === "token" && (
              <TokenLogin
                isBusy={isBusy}
                onRefreshState={onRefreshState}
                onRefreshFiles={onRefreshFiles}
              />
            )}
            {loginMethod === "sms" && (
              <SmsLogin
                isBusy={isBusy}
                onRefreshState={onRefreshState}
                onRefreshFiles={onRefreshFiles}
              />
            )}
            {loginMethod === "password" && (
              <PasswordLogin
                isBusy={isBusy}
                onRefreshState={onRefreshState}
                onRefreshFiles={onRefreshFiles}
              />
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                onClick={handleFetch}
                disabled={isBusy || fetchLoading}
              >
                {fetchLoading ? "正在抓取账单..." : "从悠悠有品抓取账单"}
                <Download className="ml-2 h-4 w-4" />
              </Button>
              <Button
                onClick={handleDestroy}
                disabled={isBusy || destroyLoading}
                variant="outline"
              >
                销毁会话
                <LogOut className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              认证后会保存会话，抓取后可加载账单文件
            </p>
          </>
        )}
      </div>
    </section>
  );
}
