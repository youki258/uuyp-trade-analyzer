import { useNavigate } from "react-router-dom";
import { useTradeData } from "@/hooks/useTradeData";
import { TradeTable } from "@/components/table/TradeTable";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export function TradeDetailPage() {
  const { records, hasData } = useTradeData();
  const navigate = useNavigate();

  if (!hasData) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center space-y-4">
        <p className="text-muted-foreground text-lg">暂无数据</p>
        <Button onClick={() => navigate("/")} variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          上传账单文件
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">交易明细</h1>
        <p className="text-sm text-muted-foreground mt-1">全量交易记录，支持搜索筛选</p>
      </div>

      <TradeTable records={records} />
    </div>
  );
}
