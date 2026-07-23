import { useNavigate } from "react-router-dom";
import { useTradeData } from "@/hooks/useTradeData";
import { TradeTable } from "@/components/table/TradeTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export function TradeDetailPage() {
  const { records, hasData } = useTradeData();
  const navigate = useNavigate();

  if (!hasData) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <EmptyState
          title="暂无交易数据"
          description="上传悠悠有品导出的账单 CSV，或从服务器抓取账单后开始分析"
          action={
            <Button onClick={() => navigate("/")} variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              上传账单文件
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="交易明细"
        description="全量交易记录，支持搜索筛选"
        actions={
          <span className="text-sm text-muted-foreground tnum">
            共 {records.length} 条
          </span>
        }
      />

      <TradeTable records={records} />
    </div>
  );
}
