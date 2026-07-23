import type { DashboardStats } from "@/types/trade";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface StatCardsProps {
  stats: DashboardStats;
}

const items = [
  { key: "totalBuy" as const, label: "总买入" },
  { key: "totalSell" as const, label: "总卖出" },
  { key: "realizedPL" as const, label: "已实现盈亏", isPL: true },
  { key: "netProfitAfterFee" as const, label: "扣费后净盈亏", isPL: true },
  { key: "totalTrades" as const, label: "交易笔数", isCount: true },
  { key: "profitRate" as const, label: "盈利率", isRate: true },
];

export function StatCards({ stats }: StatCardsProps) {
  return (
    <div className="panel overflow-hidden">
      <div className="grid grid-cols-2 gap-px bg-hairline md:grid-cols-3 xl:grid-cols-6">
        {items.map((item) => {
          const value = stats[item.key];
          const isNegative = typeof value === "number" && value < 0;
          const isColored = item.isPL || item.isRate;

          return (
            <div key={item.key} className="bg-panel px-5 py-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p
                className={cn(
                  "mt-1.5 text-metric tnum",
                  isColored
                    ? isNegative
                      ? "text-loss-light"
                      : "text-profit-light"
                    : "text-foreground"
                )}
              >
                {item.isCount
                  ? formatNumber(value as number)
                  : item.isRate
                  ? `${((value as number) * 100).toFixed(2)}%`
                  : formatCurrency(value as number)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
