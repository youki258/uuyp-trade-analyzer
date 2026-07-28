import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SmsLogin } from "./SmsLogin";
import { TokenLogin } from "./TokenLogin";
import { PasswordLogin } from "./PasswordLogin";
import type { AuthInfo, FetchProgress, ServerFile } from "@/types/stateless";
import {
  destroySession,
  getFetchProgress,
  getFullToken,
  getServerFiles,
  startFetch,
} from "@/utils/statelessApi";

type LoginMethod = "sms" | "password" | "token";

const LOGIN_TABS: { key: LoginMethod; label: string; recommended?: boolean }[] =
  [
    { key: "sms", label: "短信", recommended: true },
    { key: "token", label: "Token" },
    { key: "password", label: "密码" },
  ];

interface AuthPanelProps {
  authInfo: AuthInfo;
  isBusy: boolean;
  onRefreshState: () => Promise<void>;
  onRefreshFiles: () => Promise<void>;
  onFetchStart: () => void;
  onFetchProgress?: (message: string) => void;
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
  onFetchProgress,
  onFetchSuccess,
  onFetchError,
  onDestroy,
}: AuthPanelProps) {
  const [fetchLoading, setFetchLoading] = useState(false);
  const [destroyLoading, setDestroyLoading] = useState(false);
  const [confirmDestroy, setConfirmDestroy] = useState(false);
  const confirmTimerRef = useRef<number | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("sms");

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) window.clearTimeout(confirmTimerRef.current);
    };
  }, []);

  function formatProgressMessage(progress: FetchProgress): string {
    const stageName = progress.stageName || progress.stage || "抓取中";
    const parts = [`正在抓取：${stageName}`];
    if (progress.page) parts.push(`第 ${progress.page} 页`);
    if (progress.count) parts.push(`累计 ${progress.count} 条`);
    return parts.join("，");
  }

  /** 轮询抓取进度（2s 间隔，上限 20 分钟），完成后返回文件列表 */
  async function pollFetchProgress(): Promise<ServerFile[]> {
    const deadline = Date.now() + 20 * 60 * 1000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000));
      const progress = await getFetchProgress();
      if (progress.status === "error") {
        throw new Error(progress.message || "抓取失败");
      }
      if (progress.status === "done") {
        if (Array.isArray(progress.files) && progress.files.length > 0) {
          return progress.files;
        }
        return getServerFiles();
      }
      if (progress.status === "running") {
        onFetchProgress?.(formatProgressMessage(progress));
      }
    }
    throw new Error("抓取超时，请稍后刷新文件列表");
  }

  async function handleFetch() {
    setFetchLoading(true);
    onFetchStart();
    try {
      const result = await startFetch({ exportSplit: true });
      if (result.status !== "ok") {
        onFetchError(result.message || "抓取失败");
        return;
      }
      if (result.started) {
        const files = await pollFetchProgress();
        onFetchSuccess(files);
      } else {
        // 兼容旧后端同步返回的情况
        onFetchSuccess(Array.isArray(result.files) ? result.files : []);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "网络错误，请重试";
      onFetchError(message);
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

  /** 两步确认：首次点击进入确认态，3 秒未确认自动还原 */
  function handleDestroyClick() {
    if (!confirmDestroy) {
      setConfirmDestroy(true);
      confirmTimerRef.current = window.setTimeout(() => {
        setConfirmDestroy(false);
        confirmTimerRef.current = null;
      }, 3000);
      return;
    }
    if (confirmTimerRef.current) {
      window.clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }
    setConfirmDestroy(false);
    void handleDestroy();
  }

  /** 复制完整 Token：明文仅在点击时通过会话接口返回一次，不在前端留存 */
  async function handleCopyToken() {
    try {
      const token = await getFullToken();
      if (!token) {
        setCopyState("failed");
        return;
      }
      await navigator.clipboard.writeText(token);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    } finally {
      window.setTimeout(() => setCopyState("idle"), 2000);
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
            {authInfo.tokenMasked && (
              <div className="mb-4 flex items-center justify-between gap-2 rounded-md border border-hairline bg-inset px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">会话 Token</p>
                  <p className="truncate font-mono text-sm text-foreground">
                    {authInfo.tokenMasked}
                  </p>
                </div>
                <Button
                  onClick={handleCopyToken}
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                >
                  {copyState === "copied" ? (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
                      已复制
                    </>
                  ) : copyState === "failed" ? (
                    "复制失败"
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      复制完整 Token
                    </>
                  )}
                </Button>
              </div>
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                onClick={handleFetch}
                disabled={isBusy || fetchLoading}
              >
                {fetchLoading ? "正在抓取账单..." : "从悠悠有品抓取账单"}
                <Download className="ml-2 h-4 w-4" />
              </Button>
              <Button
                onClick={handleDestroyClick}
                disabled={isBusy || destroyLoading}
                variant="outline"
                className={`border-destructive/50 text-red-400 hover:bg-destructive/10 hover:text-red-300 ${
                  confirmDestroy ? "bg-destructive/15 border-destructive" : ""
                }`}
              >
                {confirmDestroy ? "确认销毁？" : "销毁会话"}
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
