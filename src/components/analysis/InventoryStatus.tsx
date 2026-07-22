import type { MatchedPair } from "@/types/trade";
import { formatCurrency } from "@/lib/utils";
import { Package } from "lucide-react";
import { CATEGORY_LABELS } from "@/types/trade";

interface InventoryStatusProps {
  pairs: MatchedPair[];
}

export function InventoryStatus({ pairs }: InventoryStatusProps) {
  const holding = pairs.filter((p) => p.status === "holding");
  const totalCost = holding.reduce((s, p) => s + p.costPrice, 0);

  const grouped = new Map<string, { name: string; count: number; totalCost: number; category: string }>();
  for (const p of holding) {
    const key = p.templateId || p.commodityName;
    if (!grouped.has(key)) {
      grouped.set(key, { name: p.commodityName, count: 0, totalCost: 0, category: CATEGORY_LABELS[p.buyRecord.category] });
    }
    const g = grouped.get(key)!;
    g.count++;
    g.totalCost += p.costPrice;
  }

  const items = [...grouped.values()].sort((a, b) => b.totalCost - a.totalCost);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-semibold text-foreground">持仓状态</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">
            共 {holding.length} 件持仓
          </p>
          <p className="text-sm font-bold text-foreground">
            成本合计: {formatCurrency(totalCost)}
          </p>
        </div>
      </div>

      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.02] transition-colors"
          >
            <span className="text-xs text-muted-foreground w-16 shrink-0">{item.category}</span>
            <span className="flex-1 text-sm truncate">{item.name}</span>
            <span className="text-xs text-muted-foreground">x{item.count}</span>
            <span className="text-sm font-mono text-foreground">{formatCurrency(item.totalCost)}</span>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">暂无持仓</p>
        )}
      </div>
    </div>
  );
}
