import { ArrowRight, Download, FileText, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ServerFile } from "@/types/stateless";

interface ServerFilesPanelProps {
  serverFiles: ServerFile[];
  serverChecked: boolean;
  serverLoading: boolean;
  isLoading: boolean;
  onRefreshFiles: () => void;
  onLoadPrimaryFiles: () => void;
  onDownloadFile: (filename: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatMtime(mtime: number): string {
  return new Date(mtime * 1000).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ServerFilesPanel({
  serverFiles,
  serverChecked,
  serverLoading,
  isLoading,
  onRefreshFiles,
  onLoadPrimaryFiles,
  onDownloadFile,
}: ServerFilesPanelProps) {
  if (!serverChecked && serverFiles.length === 0) return null;

  return (
    <section className="glass-card p-6 space-y-4 animate-fade-in border-primary/20">
      <div className="flex items-center gap-2 text-primary">
        <Download className="w-5 h-5" />
        <span className="font-semibold">服务器文件与原始导出</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {serverFiles.length} 个 CSV
        </span>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        自动加载时优先读取合并账单，避免把合并账单和拆分账单一起算两遍。下面的下载区仍保留所有原始文件。
      </p>

      <Button
        onClick={onRefreshFiles}
        disabled={serverLoading || isLoading}
        variant="outline"
        className="w-full"
      >
        刷新服务器文件
        <RefreshCcw className="w-4 h-4 ml-2" />
      </Button>

      {serverFiles.length > 0 ? (
        <>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {serverFiles.map((file) => (
              <div
                key={file.name}
                className="flex items-center gap-3 text-sm py-2 px-3 rounded-md bg-white/5"
              >
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate text-foreground/90">
                  {file.name}
                </span>
                <span className="text-muted-foreground text-xs">
                  {formatFileSize(file.size)}
                </span>
                <span className="text-muted-foreground text-xs hidden sm:block">
                  {formatMtime(file.mtime)}
                </span>
                <Button
                  onClick={() => onDownloadFile(file.name)}
                  disabled={serverLoading || isLoading}
                  variant="outline"
                  className="h-8 px-2"
                >
                  下载
                </Button>
              </div>
            ))}
          </div>

          <Button
            onClick={onLoadPrimaryFiles}
            disabled={isLoading || serverLoading}
            className="w-full h-11"
          >
            {serverLoading ? "加载中..." : "加载主账单并分析"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm text-muted-foreground text-center">
          当前会话还没有可自动加载的服务器文件。认证后抓取，或直接上传 CSV
          后即可开始分析。
        </div>
      )}
    </section>
  );
}
