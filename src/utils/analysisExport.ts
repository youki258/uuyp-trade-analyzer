import type {
  CategorySummary,
  DashboardStats,
  MatchedPair,
  TimeSeriesPoint,
  TradeRecord,
} from "@/types/trade";
import type { ParseResult } from "@/utils/csvParser";

interface BuildAnalysisExportArgs {
  parseResult: ParseResult;
  stats: DashboardStats | null;
  records: TradeRecord[];
  pairs: MatchedPair[];
  categorySummaries: CategorySummary[];
  timeSeries: TimeSeriesPoint[];
}

function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toRow(values: unknown[]): string {
  return values.map(csvEscape).join(",");
}

function formatDate(value: Date | null | undefined): string {
  if (!value) return "";
  return value.toLocaleString("zh-CN");
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function addSection(
  lines: string[],
  title: string,
  headers: string[],
  rows: unknown[][],
) {
  lines.push(title);
  lines.push(toRow(headers));
  rows.forEach((row) => lines.push(toRow(row)));
  lines.push("");
}

export function buildAnalysisExportCsv({
  parseResult,
  stats,
  records,
  pairs,
  categorySummaries,
  timeSeries,
}: BuildAnalysisExportArgs): string {
  const lines: string[] = [];

  addSection(
    lines,
    "概览",
    ["指标", "值"],
    [
      ["总记录", parseResult.totalCount],
      ["买入笔数", parseResult.buyCount],
      ["卖出笔数", parseResult.sellCount],
      ["解析开始时间", formatDate(parseResult.dateRange.start)],
      ["解析结束时间", formatDate(parseResult.dateRange.end)],
      ["总买入", stats?.totalBuy ?? ""],
      ["总卖出", stats?.totalSell ?? ""],
      ["总盈亏", stats?.netProfitLoss ?? ""],
      ["已实现盈亏", stats?.realizedPL ?? ""],
      ["提现手续费", stats?.withdrawFeeTotal ?? ""],
      ["扣费后净盈亏", stats?.netProfitAfterFee ?? ""],
    ],
  );

  addSection(
    lines,
    "交易记录",
    [
      "订单号",
      "来源订单号",
      "类型",
      "商品名称",
      "模板ID",
      "类别",
      "成交价(元)",
      "成交时间",
      "买家昵称",
      "卖家昵称",
      "状态",
    ],
    records.map((record) => [
      record.id,
      record.sourceOrderId || "",
      record.type,
      record.commodityName,
      record.templateId,
      record.category,
      formatNumber(record.priceYuan),
      formatDate(record.tradeTime),
      record.buyerNickname,
      record.sellerNickname,
      record.status,
    ]),
  );

  addSection(
    lines,
    "已实现配对",
    [
      "商品名称",
      "模板ID",
      "买入时间",
      "卖出时间",
      "成本价",
      "卖出价",
      "毛利润",
      "手续费",
      "净利润",
      "持仓天数",
      "状态",
    ],
    pairs.map((pair) => [
      pair.commodityName,
      pair.templateId,
      formatDate(pair.buyRecord.tradeTime),
      formatDate(pair.sellRecord?.tradeTime),
      formatNumber(pair.costPrice),
      formatNumber(pair.sellPrice),
      formatNumber(pair.profitLoss),
      formatNumber(pair.withdrawFee),
      formatNumber(pair.netProfitLoss),
      formatNumber(pair.holdingDays),
      pair.status,
    ]),
  );

  addSection(
    lines,
    "分类汇总",
    [
      "类别",
      "名称",
      "买入金额",
      "卖出金额",
      "记录数",
      "已实现盈亏",
      "持仓数",
      "持仓价值",
    ],
    categorySummaries.map((summary) => [
      summary.category,
      summary.label,
      formatNumber(summary.buyAmount),
      formatNumber(summary.sellAmount),
      summary.count,
      formatNumber(summary.realizedPL),
      summary.holdingCount,
      formatNumber(summary.holdingValue),
    ]),
  );

  addSection(
    lines,
    "时间趋势",
    ["日期", "买入金额", "卖出金额", "净额", "笔数"],
    timeSeries.map((point) => [
      point.date,
      formatNumber(point.buyAmount),
      formatNumber(point.sellAmount),
      formatNumber(point.netAmount),
      point.count,
    ]),
  );

  return `\ufeff${lines.join("\n")}`;
}

export function downloadAnalysisExport(args: BuildAnalysisExportArgs): void {
  const csvText = buildAnalysisExportCsv(args);
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  link.href = url;
  link.download = `uuyp_analysis_${timestamp}.csv`;
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
