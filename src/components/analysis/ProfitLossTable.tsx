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
    <div className="panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-hairline px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-medium text-foreground">盈亏匹配明细</h3>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="搜索商品..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-40 rounded-md border border-hairline bg-inset px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex items-center gap-0.5 rounded-md border border-hairline bg-inset p-0.5">
            {(["all", "realized", "holding"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`h-7 rounded px-2.5 text-xs transition-colors ${
                  filter === f
                    ? "bg-white/[0.08] text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all" ? "全部" : f === "realized" ? "已实现" : "持仓中"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline bg-inset/50 text-xs text-muted-foreground">
              <th className="px-4 py-2.5 text-left font-medium">状态</th>
              <th className="px-4 py-2.5 text-left font-medium">商品名称</th>
              <th className="cursor-pointer px-4 py-2.5 text-right font-medium" onClick={() => toggleSort("costPrice")}>
                买入价 {sortKey === "costPrice" && (sortDir === "desc" ? "↓" : "↑")}
              </th>
              <th className="px-4 py-2.5 text-right font-medium">卖出价</th>
              <th className="cursor-pointer px-4 py-2.5 text-right font-medium" onClick={() => toggleSort("profitLoss")}>
                盈亏 {sortKey === "profitLoss" && (sortDir === "desc" ? "↓" : "↑")}
              </th>
              <th className="cursor-pointer px-4 py-2.5 text-right font-medium" onClick={() => toggleSort("holdingDays")}>
                持仓天数 {sortKey === "holdingDays" && (sortDir === "desc" ? "↓" : "↑")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {pageItems.map((p, i) => (
              <tr key={`${p.buyRecord.id}-${p.sellRecord?.id || "holding"}-${i}`} className="transition-colors hover:bg-white/[0.03]">
                <td className="px-4 py-2.5">
                  <Badge variant={p.status === "realized" ? "profit" : "secondary"}>
                    {p.status === "realized" ? "已实现" : "持仓"}
                  </Badge>
                </td>
                <td className="max-w-[200px] truncate px-4 py-2.5">{p.commodityName}</td>
                <td className="px-4 py-2.5 text-right tnum">{formatCurrency(p.costPrice)}</td>
                <td className="px-4 py-2.5 text-right tnum">
                  {p.sellPrice !== null ? formatCurrency(p.sellPrice) : "-"}
                </td>
                <td className={`px-4 py-2.5 text-right tnum font-medium ${p.profitLoss !== null ? (p.profitLoss >= 0 ? "text-profit-light" : "text-loss-light") : "text-muted-foreground"}`}>
                  {p.profitLoss !== null ? (p.profitLoss >= 0 ? "+" : "") + formatCurrency(p.profitLoss) : "-"}
                </td>
                <td className="px-4 py-2.5 text-right tnum text-muted-foreground">
                  {p.holdingDays !== null ? `${p.holdingDays}天` : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-col items-center justify-between gap-2 border-t border-hairline px-4 py-3 text-xs text-muted-foreground sm:flex-row">
          <span className="tnum">
            第 {currentPage}/{totalPages} 页，共 {filtered.length} 条
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-7 rounded-md px-2 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
            >
              上一页
            </button>
            {pageNumbers.map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`h-7 min-w-7 rounded-md px-1.5 tnum transition-colors ${
                  n === currentPage ? "bg-white/[0.08] text-foreground" : "hover:bg-white/[0.06]"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-7 rounded-md px-2 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
