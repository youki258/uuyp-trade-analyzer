import { useState } from "react";
import { Key, Smartphone, Lock, ShieldCheck, Download, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TokenLogin } from "./TokenLogin";
import { SmsLogin } from "./SmsLogin";
import { PasswordLogin } from "./PasswordLogin";
import type { AuthInfo, ServerFile } from "@/types/stateless";
import { authByToken, destroySession, startFetch } from "@/utils/statelessApi";

type TabKey = "token" | "sms" | "pwd";

interface AuthPanelProps {
  authInfo: AuthInfo;
  isBusy: boolean;
  onRefreshState: () => Promise<void>;
  onRefreshFiles: () => Promise<void>;
  onAuthSuccess: (info: AuthInfo) => void;
  onFetchStart: () => void;
  onFetchSuccess: (files: ServerFile[]) => void;
  onFetchError: (message: string) => void;
  onDestroy: () => void;
}

const tabs: { key: TabKey; icon: typeof Key; label: string }[] = [
  { key: "token", icon: Key, label: "Token" },
  { key: "sms", icon: Smartphone, label: "短信" },
  { key: "pwd", icon: Lock, label: "密码" },
];

export function AuthPanel({
  authInfo,
  isBusy,
  onRefreshState,
  onRefreshFiles,
  onAuthSuccess,
  onFetchStart,
  onFetchSuccess,
  onFetchError,
  onDestroy,
}: AuthPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("token");
  const [fetchLoading, setFetchLoading] = useState(false);
  const [destroyLoading, setDestroyLoading] = useState(false);

  async function handleTokenAuth(token: string) {
    return authByToken(token, "app");
  }

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
    <section className="glass-card p-6 space-y-4 border-primary/20">
      <div className="flex items-center gap-2 text-primary">
        <ShieldCheck className="w-5 h-5" />
        <span className="font-semibold">会话认证</span>
        {authInfo.authenticated && (
          <span className="text-xs text-emerald-400 ml-auto">
            {authInfo.nickname || authInfo.userId || "已认证"}
          </span>
        )}
      </div>

      {!authInfo.authenticated ? (
        <>
          <div className="flex rounded-lg bg-white/5 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-all",
                  activeTab === tab.key
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "token" && (
            <TokenLogin
              isBusy={isBusy}
              onAuth={handleTokenAuth}
              onRefreshState={onRefreshState}
              onRefreshFiles={onRefreshFiles}
              onAuthSuccess={onAuthSuccess}
            />
          )}
          {activeTab === "sms" && (
            <SmsLogin
              isBusy={isBusy}
              onRefreshState={onRefreshState}
              onRefreshFiles={onRefreshFiles}
              onAuthSuccess={onAuthSuccess}
            />
          )}
          {activeTab === "pwd" && (
            <PasswordLogin
              isBusy={isBusy}
              onRefreshState={onRefreshState}
              onRefreshFiles={onRefreshFiles}
              onAuthSuccess={onAuthSuccess}
            />
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              onClick={handleFetch}
              disabled={isBusy || fetchLoading}
              className="h-11"
            >
              {fetchLoading ? "正在抓取账单..." : "从悠悠有品抓取账单"}
              <Download className="w-4 h-4 ml-2" />
            </Button>
            <Button
              onClick={handleDestroy}
              disabled={isBusy || destroyLoading}
              variant="outline"
              className="h-11"
            >
              销毁会话
              <LogOut className="w-4 h-4 ml-2" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            认证后会保存会话，抓取后可加载账单文件
          </p>
        </>
      )}
    </section>
  );
}
