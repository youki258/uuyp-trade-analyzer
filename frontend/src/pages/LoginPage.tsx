import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, useCallback } from "react";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { FileUploader } from "@/components/data/FileUploader";
import { OperationProgressCard } from "@/components/data/OperationProgressCard";
import { ServerFilesPanel } from "@/components/data/ServerFilesPanel";
import { AnalysisSummaryPanel } from "@/components/data/AnalysisSummaryPanel";
import { useTradeData } from "@/hooks/useTradeData";
import { Crosshair } from "lucide-react";
import type { AuthInfo, ServerFile } from "@/types/stateless";
import {
  createDownloadTicket,
  getAuthInfo,
  getServerFiles,
  uploadCsvToSession,
} from "@/utils/statelessApi";
import { downloadAnalysisExport } from "@/utils/analysisExport";

function isServerFile(value: unknown): value is ServerFile {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.name === "string" &&
    typeof item.size === "number" &&
    typeof item.mtime === "number"
  );
}

async function loadCsvFromServer(filename: string): Promise<File> {
  const res = await fetch(`/api/csv/${encodeURIComponent(filename)}`);
  if (!res.ok) throw new Error(`加载失败: ${filename}`);
  const text = await res.text();
  return new File([text], filename, { type: "text/csv" });
}

function pickPrimaryServerFiles(files: ServerFile[]): ServerFile[] {
  const combined = files.filter(
    (file) =>
      /(?:^|[_-])(bills?|combined|merged)(?:[_-]|\.|$)/i.test(file.name) ||
      /合并|汇总/.test(file.name),
  );
  if (combined.length > 0) return combined;

  const nonSplit = files.filter(
    (file) =>
      !/(?:^|[_-])(buy|sell|lease)(?:[_-]|\.|$)/i.test(file.name) &&
      !/买入|卖出|租入|租出/.test(file.name),
  );
  if (nonSplit.length > 0) return nonSplit;

  return files;
}

export function LoginPage() {
  const {
    loadFiles,
    isLoading,
    error,
    parseResult,
    hasData,
    stats,
    reset,
    records,
    pairs,
    categorySummaries,
    timeSeries,
  } = useTradeData();
  const navigate = useNavigate();

  const [serverFiles, setServerFiles] = useState<ServerFile[]>([]);
  const [serverLoading, setServerLoading] = useState(false);
  const [serverChecked, setServerChecked] = useState(false);
  const [serverError, setServerError] = useState("");

  const [authInfo, setAuthInfo] = useState<AuthInfo>({ authenticated: false });

  const [workflowMessage, setWorkflowMessage] = useState("请先登录或直接上传 CSV 开始分析");
  const [workflowTone, setWorkflowTone] = useState<
    "loading" | "info" | "success" | "error"
  >("info");
  const [exportLoading, setExportLoading] = useState(false);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshServerFiles = useCallback(async () => {
    setServerLoading(true);
    setWorkflowTone("loading");
    setWorkflowMessage("正在刷新服务器文件列表");
    try {
      const files = await getServerFiles();
      if (!mountedRef.current) return;
      setServerFiles(files.filter(isServerFile));
      setWorkflowTone("success");
      setWorkflowMessage(
        files.length > 0
          ? `发现 ${files.length} 个服务器文件`
          : "会话暂无服务器文件",
      );
    } catch {
      if (!mountedRef.current) return;
      setServerFiles([]);
      setServerError("无法获取服务器文件列表");
      setWorkflowTone("error");
      setWorkflowMessage("刷新服务器文件失败");
    } finally {
      if (mountedRef.current) {
        setServerChecked(true);
        setServerLoading(false);
      }
    }
  }, []);

  const refreshAuthState = useCallback(async () => {
    try {
      const auth = await getAuthInfo();
      if (!mountedRef.current) return;
      setAuthInfo(auth);
    } catch {
      if (!mountedRef.current) return;
      setAuthInfo({ authenticated: false });
    }
  }, []);

  useEffect(() => {
    refreshServerFiles();
    refreshAuthState();
  }, [refreshServerFiles, refreshAuthState]);

  async function handleFetchSuccess(files: ServerFile[]) {
    setServerFiles(files);
    setWorkflowTone("success");
    setWorkflowMessage(
      files.length > 0
        ? `抓取完成，${files.length} 个文件就绪`
        : "抓取完成，暂无文件",
    );
    await refreshAuthState();
  }

  async function handleDestroy() {
    setServerFiles([]);
    setServerError("");
    setAuthInfo({ authenticated: false });
    reset();
    setWorkflowTone("info");
    setWorkflowMessage("会话已销毁");
    await refreshServerFiles();
    await refreshAuthState();
  }

  async function handleUploadToServer(files: File[]) {
    setServerLoading(true);
    setWorkflowTone("loading");
    setWorkflowMessage(`正在上传 ${files.length} 个文件`);
    try {
      const result = await uploadCsvToSession(files);
      if (result.status !== "ok") {
        throw new Error(result.message || "上传失败");
      }
      const resultFiles = Array.isArray(result.files)
        ? result.files.filter(isServerFile)
        : [];
      if (resultFiles.length === 0) {
        throw new Error("上传成功但未返回文件");
      }
      setServerFiles(resultFiles);
      setServerError("");
      setWorkflowTone("success");
      setWorkflowMessage(`上传完成，${resultFiles.length} 个文件就绪`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "上传失败";
      setServerError(message);
      setWorkflowTone("error");
      setWorkflowMessage(message);
    } finally {
      setServerLoading(false);
    }
  }

  async function handleLoadAllFromServer() {
    const primaryFiles = pickPrimaryServerFiles(serverFiles);
    setWorkflowTone("loading");
    setWorkflowMessage(`正在加载并解析 ${primaryFiles.length} 个文件`);
    try {
      const fileObjs = await Promise.all(
        primaryFiles.map((f) => loadCsvFromServer(f.name)),
      );
      await loadFiles(fileObjs);
      setServerError("");
      setWorkflowTone("success");
      setWorkflowMessage(`解析完成，已加载 ${primaryFiles.length} 个文件`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "未知错误";
      setServerError(`从服务器加载失败: ${msg}`);
      setWorkflowTone("error");
      setWorkflowMessage(`从服务器加载失败: ${msg}`);
    }
  }

  async function handleFilesDirect(files: File[]) {
    setWorkflowTone("loading");
    setWorkflowMessage(`正在解析 ${files.length} 个文件`);
    try {
      await loadFiles(files);
      setWorkflowTone("success");
      setWorkflowMessage("解析完成");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "未知错误";
      setWorkflowTone("error");
      setWorkflowMessage(`解析失败: ${msg}`);
    }
  }

  async function handleDownloadFile(filename: string) {
    setWorkflowTone("loading");
    setWorkflowMessage(`正在生成 ${filename} 的下载链接`);
    try {
      const result = await createDownloadTicket(filename);
      if (result.status !== "ok" || !result.downloadUrl) {
        setWorkflowTone("error");
        setWorkflowMessage(`生成下载链接失败: ${result.message || "未知错误"}`);
        return;
      }
      // 校验下载 URL 是同源相对路径，防止开放重定向
      const url = result.downloadUrl;
      if (!url.startsWith("/") && !url.startsWith(window.location.origin)) {
        setWorkflowTone("error");
        setWorkflowMessage("下载链接不合法");
        return;
      }
      window.location.href = url;
      setWorkflowTone("success");
      setWorkflowMessage(`下载链接已生成`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "未知错误";
      setWorkflowTone("error");
      setWorkflowMessage(`下载失败: ${msg}`);
    }
  }

  async function handleExportAnalysis() {
    if (!parseResult || !stats) return;
    setExportLoading(true);
    setWorkflowTone("loading");
    setWorkflowMessage("正在导出分析结果 CSV");
    try {
      downloadAnalysisExport({
        parseResult,
        stats,
        records,
        pairs,
        categorySummaries,
        timeSeries,
      });
      setWorkflowTone("success");
      setWorkflowMessage("分析结果已导出为 CSV");
    } catch {
      setWorkflowTone("error");
      setWorkflowMessage("导出失败");
    } finally {
      setExportLoading(false);
    }
  }

  const globalBusy = isLoading || serverLoading;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center animate-fade-in">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2">
            <Crosshair className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold">
              <span className="text-primary">UUYP</span>{" "}
              <span className="text-foreground/90">Bill Analyzer</span>
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            上传悠悠有品导出的 CSV 交易账单，自动计算盈亏、追踪持仓、分析交易趋势
          </p>
        </div>

        <AuthPanel
          authInfo={authInfo}
          isBusy={globalBusy}
          onRefreshState={refreshAuthState}
          onRefreshFiles={refreshServerFiles}
          onFetchStart={() => {
            setWorkflowTone("loading");
            setWorkflowMessage("正在从悠悠有品抓取账单，请稍候...");
          }}
          onFetchSuccess={handleFetchSuccess}
          onFetchError={(message) => {
            setWorkflowTone("error");
            setWorkflowMessage(message);
          }}
          onDestroy={handleDestroy}
        />

        <OperationProgressCard
          title="当前操作进度"
          message={workflowMessage}
          tone={workflowTone}
        />

        {serverChecked && serverFiles.length > 0 && (
          <ServerFilesPanel
            serverFiles={serverFiles}
            serverChecked={serverChecked}
            serverLoading={serverLoading}
            isLoading={isLoading}
            onRefreshFiles={refreshServerFiles}
            onLoadPrimaryFiles={handleLoadAllFromServer}
            onDownloadFile={handleDownloadFile}
          />
        )}

        <FileUploader
          onFilesSelected={handleFilesDirect}
          onFilesUploadToServer={handleUploadToServer}
          isLoading={isLoading || serverLoading}
        />

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        {serverError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-center text-sm text-red-400">
            {serverError}
          </div>
        )}

        {hasData && parseResult && (
          <AnalysisSummaryPanel
            parseResult={parseResult}
            stats={stats}
            onNavigateDashboard={() => navigate("/dashboard")}
            onReset={reset}
            onExportAnalysis={handleExportAnalysis}
            exportLoading={exportLoading}
          />
        )}
      </div>
    </div>
  );
}
