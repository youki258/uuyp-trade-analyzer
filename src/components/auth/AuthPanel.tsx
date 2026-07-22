import { useState } from "react";
import { ShieldCheck, Download, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SmsLogin } from "./SmsLogin";
import type { AuthInfo, ServerFile } from "@/types/stateless";
import { destroySession, startFetch } from "@/utils/statelessApi";

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
  const [fetchLoading, setFetchLoading] = useState(false);
  const [destroyLoading, setDestroyLoading] = useState(false);

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
        <SmsLogin
          isBusy={isBusy}
          onRefreshState={onRefreshState}
          onRefreshFiles={onRefreshFiles}
          onAuthSuccess={onAuthSuccess}
        />
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
