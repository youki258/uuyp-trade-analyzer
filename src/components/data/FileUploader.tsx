import { useState, useCallback } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  onFilesUploadToServer?: (files: File[]) => Promise<void>;
  isLoading: boolean;
}

export function FileUploader({
  onFilesSelected,
  onFilesUploadToServer,
  isLoading,
}: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploadingToServer, setIsUploadingToServer] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.name.endsWith(".csv"),
    );
    if (files.length > 0) {
      setSelectedFiles(files);
    }
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        setSelectedFiles(files);
      }
    },
    [],
  );

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(() => {
    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles);
    }
  }, [selectedFiles, onFilesSelected]);

  const handleUploadToServer = useCallback(async () => {
    if (!onFilesUploadToServer || selectedFiles.length === 0) return;
    setIsUploadingToServer(true);
    try {
      await onFilesUploadToServer(selectedFiles);
    } finally {
      setIsUploadingToServer(false);
    }
  }, [onFilesUploadToServer, selectedFiles]);

  return (
    <div className="space-y-6">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer",
          isDragOver
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]",
        )}
        onClick={() => document.getElementById("csv-input")?.click()}
      >
        <Upload
          className={cn(
            "w-12 h-12 mx-auto mb-4 transition-colors",
            isDragOver ? "text-primary" : "text-muted-foreground",
          )}
        />
        <p className="text-lg font-medium text-foreground mb-2">
          拖拽 CSV 文件到此处，或点击选择
        </p>
        <p className="text-sm text-muted-foreground">
          支持悠悠有品导出的合并账单 / 买入账单 / 卖出账单 CSV
          文件，可同时上传多个文件
        </p>
        <input
          id="csv-input"
          type="file"
          accept=".csv"
          multiple
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            已选择文件：
          </p>
          {selectedFiles.map((file, i) => (
            <div
              key={i}
              className="glass-card flex items-center gap-3 px-4 py-3"
            >
              <FileText className="w-5 h-5 text-primary shrink-0" />
              <span className="flex-1 text-sm truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile(i);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          <Button
            onClick={handleSubmit}
            disabled={isLoading || isUploadingToServer}
            className="w-full h-12 text-base"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                解析中...
              </>
            ) : (
              "开始解析并分析"
            )}
          </Button>

          {onFilesUploadToServer && (
            <Button
              onClick={handleUploadToServer}
              disabled={isLoading || isUploadingToServer}
              variant="outline"
              className="w-full h-12 text-base"
            >
              {isUploadingToServer ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  上传中...
                </>
              ) : (
                "上传到临时会话并分析"
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
