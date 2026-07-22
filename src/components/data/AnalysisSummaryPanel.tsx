import { ArrowRight, CheckCircle2, Download, RefreshCcw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { DashboardStats } from "@/types/trade";
import type { ParseResult } from "@/utils/csvParser";

interface AnalysisSummaryPanelProps {
  parseResult: ParseResult;
  stats: DashboardStats | null;
  onNavigateDashboard: () => void;
  onReset: () => void;
  onExportAnalysis: () => void;
  exportLoading: boolean;
}

function formatPL(value: number): { color: string; prefix: string } {
  if (value > 0) return { color: "text-red-400", prefix: "+" };
  if (value < 0) return { color: "text-green-400", prefix: "" };
  return { color: "text-muted-foreground", prefix: "" };
}

export function AnalysisSummaryPanel({
  parseResult,
  stats,
  onNavigateDashboard,
  onReset,
  onExportAnalysis,
  exportLoading,
}: AnalysisSummaryPanelProps) {
  return (
    <section className="glass-card p-6 space-y-4 animate-fade-in">
      <div className="flex items-center gap-2 text-profit">
        <CheckCircle2 className="w-5 h-5" />
        <span className="font-semibold">数据解析成功</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">总记录</p>
          <p className="text-lg font-bold">
            {formatNumber(parseResult.totalCount)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">买入笔数</p>
          <p className="text-lg font-bold text-blue-400">
            {formatNumber(parseResult.buyCount)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">卖出笔数</p>
          <p className="text-lg font-bold text-orange-400">
            {formatNumber(parseResult.sellCount)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">已实现盈亏</p>
          {stats ? (
            <p className={`text-lg font-bold ${formatPL(stats.realizedPL).color}`}>
              {formatCurrency(stats.realizedPL)}
            </p>
          ) : (
            <p className="text-lg font-bold">-</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground space-y-2">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p>
              <span className="text-foreground font-medium">总盈亏</span>（卖出总额 − 买入总额）={" "}
              {stats ? (
                <span className={formatPL(stats.netProfitLoss).color}>
                  {formatCurrency(stats.netProfitLoss)}
                </span>
              ) : "-"}
              {stats && stats.buyCount > stats.sellCount && (
                <span className="text-muted-foreground">
                  {" "}· 买入 {stats.buyCount} 笔 &gt; 卖出 {stats.sellCount} 笔，未卖出部分暂不计入盈亏
                </span>
              )}
            </p>
            <p>
              <span className="text-foreground font-medium">持仓估值</span>（手持未卖出商品）={" "}
              {stats ? (
                <span className="text-foreground">
                  {formatCurrency(stats.holdingValue)}
                </span>
              ) : "-"}
              <span className="text-muted-foreground"> · 仅买卖均有且完成配对才计入已实现盈亏</span>
            </p>
            <p>
              <span className="text-foreground font-medium">已实现盈亏</span>（FIFO 配对后实际利润）={" "}
              {stats ? (
                <span className={formatPL(stats.realizedPL).color}>
                  {formatCurrency(stats.realizedPL)}
                </span>
              ) : "-"}
            </p>
            {stats && (
              <p>
                <span className="text-foreground font-medium">扣费后净盈亏</span>（已实现盈亏 − 提现手续费）={" "}
                <span className={formatPL(stats.netProfitAfterFee).color}>
                  {formatCurrency(stats.netProfitAfterFee)}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Button
          onClick={onNavigateDashboard}
          className="h-12 text-base md:col-span-1"
        >
          进入分析仪表盘
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
        <Button
          onClick={onExportAnalysis}
          disabled={exportLoading}
          variant="outline"
          className="h-12 text-base md:col-span-1"
        >
          {exportLoading ? "导出中..." : "导出分析结果"}
          <Download className="w-5 h-5 ml-2" />
        </Button>
        <Button
          onClick={onReset}
          variant="outline"
          className="h-12 text-base md:col-span-1"
        >
          重新上传
          <RefreshCcw className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </section>
  );
}
