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

/** 中国惯例：盈红亏绿（语义 token，勿硬编码 red-/green-） */
function formatPL(value: number): { color: string; prefix: string } {
  if (value > 0) return { color: "text-profit-light", prefix: "+" };
  if (value < 0) return { color: "text-loss-light", prefix: "" };
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
    <section className="panel animate-fade-in">
      <div className="flex items-center gap-2 border-b border-hairline px-5 py-4">
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        <h3 className="text-sm font-medium text-foreground">数据解析成功</h3>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">总记录</p>
            <p className="mt-1 text-lg font-semibold tnum">
              {formatNumber(parseResult.totalCount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">买入笔数</p>
            <p className="mt-1 text-lg font-semibold tnum text-blue-400">
              {formatNumber(parseResult.buyCount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">卖出笔数</p>
            <p className="mt-1 text-lg font-semibold tnum text-orange-400">
              {formatNumber(parseResult.sellCount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">已实现盈亏</p>
            {stats ? (
              <p className={`mt-1 text-lg font-semibold tnum ${formatPL(stats.realizedPL).color}`}>
                {formatCurrency(stats.realizedPL)}
              </p>
            ) : (
              <p className="mt-1 text-lg font-semibold tnum">-</p>
            )}
          </div>
        </div>

        <div className="rounded-md border border-hairline bg-inset px-4 py-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p>
                <span className="font-medium text-foreground">总盈亏</span>（卖出总额 − 买入总额）={" "}
                {stats ? (
                  <span className={`tnum ${formatPL(stats.netProfitLoss).color}`}>
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
                <span className="font-medium text-foreground">持仓估值</span>（手持未卖出商品）={" "}
                {stats ? (
                  <span className="tnum text-foreground">
                    {formatCurrency(stats.holdingValue)}
                  </span>
                ) : "-"}
                <span className="text-muted-foreground"> · 仅买卖均有且完成配对才计入已实现盈亏</span>
              </p>
              <p>
                <span className="font-medium text-foreground">已实现盈亏</span>（FIFO 配对后实际利润）={" "}
                {stats ? (
                  <span className={`tnum ${formatPL(stats.realizedPL).color}`}>
                    {formatCurrency(stats.realizedPL)}
                  </span>
                ) : "-"}
              </p>
              {stats && (
                <p>
                  <span className="font-medium text-foreground">扣费后净盈亏</span>（已实现盈亏 − 提现手续费）={" "}
                  <span className={`tnum ${formatPL(stats.netProfitAfterFee).color}`}>
                    {formatCurrency(stats.netProfitAfterFee)}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Button
            onClick={onNavigateDashboard}
            className="md:col-span-1"
          >
            进入分析仪表盘
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            onClick={onExportAnalysis}
            disabled={exportLoading}
            variant="outline"
            className="md:col-span-1"
          >
            {exportLoading ? "导出中..." : "导出分析结果"}
            <Download className="ml-2 h-4 w-4" />
          </Button>
          <Button
            onClick={onReset}
            variant="outline"
            className="md:col-span-1"
          >
            重新上传
            <RefreshCcw className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
