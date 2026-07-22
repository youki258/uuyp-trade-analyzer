import { useState, useMemo } from "react";
import type { TradeRecord, CommodityCategory } from "@/types/trade";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS } from "@/types/trade";

interface TradeTableProps {
  records: TradeRecord[];
}

export function TradeTable({ records }: TradeTableProps) {
  const [typeFilter, setTypeFilter] = useState<"all" | "buy" | "sell">("all");
  const [categoryFilter, setCategoryFilter] = useState<CommodityCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const categories = useMemo(() => {
    const cats = new Set(records.map((r) => r.category));
    return [...cats];
  }, [records]);

  const filtered = useMemo(() => {
    return records
      .filter((r) => {
        if (typeFilter !== "all" && r.type !== typeFilter) return false;
        if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
        if (search && !r.commodityName.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => b.tradeTime.getTime() - a.tradeTime.getTime());
  }, [records, typeFilter, categoryFilter, search]);

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="text-sm text-muted-foreground">
          共 {filtered.length} 条记录
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <input
            type="text"
            placeholder="搜索商品..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-36"
          />
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as typeof typeFilter); setPage(0); }}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">全部类型</option>
            <option value="buy">买入</option>
            <option value="sell">卖出</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value as typeof categoryFilter); setPage(0); }}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">全部类别</option>
            {categories.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-muted-foreground">
              <th className="text-left px-4 py-3 font-medium">类型</th>
              <th className="text-left px-4 py-3 font-medium">商品名称</th>
              <th className="text-left px-4 py-3 font-medium">类别</th>
              <th className="text-right px-4 py-3 font-medium">价格</th>
              <th className="text-left px-4 py-3 font-medium">时间</th>
              <th className="text-left px-4 py-3 font-medium">订单号</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paged.map((r, i) => (
              <tr key={r.id + i} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <Badge variant={r.type === "buy" ? "buy" : "sell"}>
                    {r.type === "buy" ? "买入" : "卖出"}
                  </Badge>
                </td>
                <td className="px-4 py-3 max-w-[250px] truncate">{r.commodityName}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{CATEGORY_LABELS[r.category]}</td>
                <td className={`px-4 py-3 text-right font-mono font-medium ${r.type === "buy" ? "text-blue-400" : "text-orange-400"}`}>
                  {r.type === "buy" ? "-" : "+"}{formatCurrency(r.priceYuan)}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.tradeTimeStr}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{r.id.slice(-8)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t border-white/5 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            第 {page + 1} / {totalPages} 页
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1 rounded-lg text-xs bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              上一页
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 rounded-lg text-xs bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
