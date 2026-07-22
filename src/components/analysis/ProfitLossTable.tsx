import { useEffect, useMemo, useState } from "react";
import type { MatchedPair } from "@/types/trade";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ProfitLossTableProps {
  pairs: MatchedPair[];
}

export function ProfitLossTable({ pairs }: ProfitLossTableProps) {
  const [filter, setFilter] = useState<"all" | "realized" | "holding">("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"profitLoss" | "holdingDays" | "costPrice">("profitLoss");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const filtered = useMemo(
    () =>
      pairs
        .filter((p) => {
          if (filter === "realized") return p.status === "realized";
          if (filter === "holding") return p.status === "holding";
          return true;
        })
        .filter((p) =>
          p.commodityName.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => {
          const aVal = a[sortKey] ?? 0;
          const bVal = b[sortKey] ?? 0;
          return sortDir === "desc" ? bVal - aVal : aVal - bVal;
        }),
    [pairs, filter, search, sortKey, sortDir]
  );

  useEffect(() => {
    setPage(1);
  }, [filter, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(pageStart, pageStart + pageSize);
  const pageNumbers = Array.from(
    { length: Math.min(5, totalPages) },
    (_, i) => Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
  ).filter((n) => n <= totalPages);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">盈亏匹配明细</h3>
        <div className="flex gap-2 items-center flex-wrap">
          <input
            type="text"
            placeholder="搜索商品..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-40"
          />
          {(["all", "realized", "holding"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-primary/20 text-primary"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              {f === "all" ? "全部" : f === "realized" ? "已实现" : "持仓中"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-muted-foreground">
              <th className="text-left px-4 py-3 font-medium">状态</th>
              <th className="text-left px-4 py-3 font-medium">商品名称</th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer" onClick={() => toggleSort("costPrice")}>
                买入价 {sortKey === "costPrice" && (sortDir === "desc" ? "↓" : "↑")}
              </th>
              <th className="text-right px-4 py-3 font-medium">卖出价</th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer" onClick={() => toggleSort("profitLoss")}>
                盈亏 {sortKey === "profitLoss" && (sortDir === "desc" ? "↓" : "↑")}
              </th>
              <th className="text-right px-4 py-3 font-medium cursor-pointer" onClick={() => toggleSort("holdingDays")}>
                持仓天数 {sortKey === "holdingDays" && (sortDir === "desc" ? "↓" : "↑")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {pageItems.map((p, i) => (
              <tr key={`${p.buyRecord.id}-${p.sellRecord?.id || "holding"}-${i}`} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <Badge variant={p.status === "realized" ? "profit" : "secondary"}>
                    {p.status === "realized" ? "已实现" : "持仓"}
                  </Badge>
                </td>
                <td className="px-4 py-3 max-w-[200px] truncate">{p.commodityName}</td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(p.costPrice)}</td>
                <td className="px-4 py-3 text-right font-mono">
                  {p.sellPrice !== null ? formatCurrency(p.sellPrice) : "-"}
                </td>
                <td className={`px-4 py-3 text-right font-mono font-medium ${p.profitLoss !== null ? (p.profitLoss >= 0 ? "text-profit" : "text-loss") : "text-muted-foreground"}`}>
                  {p.profitLoss !== null ? (p.profitLoss >= 0 ? "+" : "") + formatCurrency(p.profitLoss) : "-"}
                </td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                  {p.holdingDays !== null ? `${p.holdingDays}天` : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            第 {currentPage}/{totalPages} 页，共 {filtered.length} 条
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            {pageNumbers.map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`px-2 py-1 rounded ${
                  n === currentPage ? "bg-primary/20 text-primary" : "bg-white/5 hover:bg-white/10"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
