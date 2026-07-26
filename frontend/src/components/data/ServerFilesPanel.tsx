import { ArrowRight, FileText, RefreshCcw } from "lucide-react";
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
    <section className="panel animate-fade-in">
      <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
        <h3 className="text-sm font-medium text-foreground">服务器文件与原始导出</h3>
        <span className="text-xs text-muted-foreground tnum">
          {serverFiles.length} 个 CSV
        </span>
      </div>

      <div className="space-y-4 p-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          自动加载时优先读取合并账单，避免把合并账单和拆分账单一起算两遍。下面的下载区仍保留所有原始文件。
        </p>

        <Button
          onClick={onRefreshFiles}
          disabled={serverLoading || isLoading}
          variant="outline"
          className="w-full"
        >
          刷新服务器文件
          <RefreshCcw className="ml-2 h-4 w-4" />
        </Button>

        {serverFiles.length > 0 ? (
          <>
            <div className="max-h-56 overflow-y-auto">
              {serverFiles.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center gap-3 border-b border-hairline py-2.5 text-sm last:border-0"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-foreground/90">
                    {file.name}
                  </span>
                  <span className="text-xs text-muted-foreground tnum">
                    {formatFileSize(file.size)}
                  </span>
                  <span className="hidden text-xs text-muted-foreground sm:block">
                    {formatMtime(file.mtime)}
                  </span>
                  <Button
                    onClick={() => onDownloadFile(file.name)}
                    disabled={serverLoading || isLoading}
                    variant="outline"
                    className="h-7 px-2 text-xs"
                  >
                    下载
                  </Button>
                </div>
              ))}
            </div>

            <Button
              onClick={onLoadPrimaryFiles}
              disabled={isLoading || serverLoading}
              className="w-full"
            >
              {serverLoading ? "加载中..." : "加载主账单并分析"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </>
        ) : (
          <div className="rounded-md border border-dashed border-white/[0.12] px-4 py-5 text-center text-sm text-muted-foreground">
            当前会话还没有可自动加载的服务器文件。认证后抓取，或直接上传 CSV
            后即可开始分析。
          </div>
        )}
      </div>
    </section>
  );
}
