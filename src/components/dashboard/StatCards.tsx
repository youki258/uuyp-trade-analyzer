import { TrendingUp, ShoppingCart, Tag, Percent, Wallet } from "lucide-react";
import type { DashboardStats } from "@/types/trade";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface StatCardsProps {
  stats: DashboardStats;
}

const cards = [
  {
    key: "totalBuy" as const,
    label: "总买入",
    icon: ShoppingCart,
    color: "text-blue-400",
    glow: "shadow-[0_0_20px_rgba(96,165,250,0.15)]",
    bg: "bg-blue-500/10",
  },
  {
    key: "totalSell" as const,
    label: "总卖出",
    icon: Tag,
    color: "text-orange-400",
    glow: "shadow-[0_0_20px_rgba(251,146,60,0.15)]",
    bg: "bg-orange-500/10",
  },
  {
    key: "realizedPL" as const,
    label: "已实现盈亏",
    icon: TrendingUp,
    color: "text-emerald-400",
    glow: "shadow-[0_0_20px_rgba(52,211,153,0.15)]",
    bg: "bg-emerald-500/10",
    isPL: true,
  },
  {
    key: "netProfitAfterFee" as const,
    label: "扣费后净盈亏",
    icon: Wallet,
    color: "text-primary",
    glow: "shadow-[0_0_20px_rgba(0,229,160,0.15)]",
    bg: "bg-primary/10",
    isPL: true,
  },
  {
    key: "totalTrades" as const,
    label: "交易笔数",
    icon: Percent,
    color: "text-purple-400",
    glow: "shadow-[0_0_20px_rgba(192,132,252,0.15)]",
    bg: "bg-purple-500/10",
    isCount: true,
  },
  {
    key: "profitRate" as const,
    label: "盈利率",
    icon: TrendingUp,
    color: "text-cyan-400",
    glow: "shadow-[0_0_20px_rgba(34,211,238,0.15)]",
    bg: "bg-cyan-500/10",
    isRate: true,
  },
];

export function StatCards({ stats }: StatCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => {
        const value = stats[card.key];
        const isNegative = typeof value === "number" && value < 0;

        return (
          <div
            key={card.key}
            className={cn(
              "glass-card p-4 transition-all duration-300 hover:scale-[1.02]",
              card.glow
            )}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={cn("p-1.5 rounded-lg", card.bg)}>
                <card.icon className={cn("w-4 h-4", card.color)} />
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {card.label}
              </span>
            </div>

            <p
              className={cn(
                "text-xl font-bold tracking-tight",
                card.isPL || card.isRate
                  ? isNegative
                    ? "text-loss"
                    : "text-profit"
                  : "text-foreground"
              )}
            >
              {card.isCount
                ? formatNumber(value as number)
                : card.isRate
                ? `${((value as number) * 100).toFixed(2)}%`
                : formatCurrency(value as number)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
