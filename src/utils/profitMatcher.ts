import type { TradeRecord, MatchedPair, DashboardStats, CategorySummary, TimeSeriesPoint, CommodityCategory } from "@/types/trade";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/types/trade";
import { calcWithdrawFee } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";

export function matchProfitLoss(records: TradeRecord[]): MatchedPair[] {
  const buys = records.filter((r) => r.type === "buy").sort((a, b) => a.tradeTime.getTime() - b.tradeTime.getTime());
  const sells = records.filter((r) => r.type === "sell").sort((a, b) => a.tradeTime.getTime() - b.tradeTime.getTime());

  const inventoryMap = new Map<string, TradeRecord[]>();
  for (const buy of buys) {
    const key = buy.templateId || buy.commodityName;
    if (!inventoryMap.has(key)) inventoryMap.set(key, []);
    inventoryMap.get(key)!.push(buy);
  }

  const pairs: MatchedPair[] = [];
  const usedBuyIndices = new Map<string, number>();

  for (const sell of sells) {
    const key = sell.templateId || sell.commodityName;
    const inventory = inventoryMap.get(key) || [];
    const startIdx = usedBuyIndices.get(key) || 0;

    let matched = false;
    for (let i = startIdx; i < inventory.length; i++) {
      if (inventory[i].tradeTime < sell.tradeTime) {
        const buyRecord = inventory[i];
        const holdingDays = differenceInDays(sell.tradeTime, buyRecord.tradeTime);
        const profitLoss = sell.priceYuan - buyRecord.priceYuan;
        const profitLossPercent = buyRecord.priceYuan > 0 ? profitLoss / buyRecord.priceYuan : 0;

        pairs.push({
          commodityName: sell.commodityName,
          templateId: sell.templateId,
          buyRecord,
          sellRecord: sell,
          costPrice: buyRecord.priceYuan,
          sellPrice: sell.priceYuan,
          profitLoss,
          profitLossPercent,
          holdingDays,
          withdrawFee: 0,
          netProfitLoss: profitLoss,
          status: "realized",
        });

        usedBuyIndices.set(key, i + 1);
        matched = true;
        break;
      }
    }

    if (!matched) {
      pairs.push({
        commodityName: sell.commodityName,
        templateId: sell.templateId,
        buyRecord: sell,
        sellRecord: sell,
        costPrice: 0,
        sellPrice: sell.priceYuan,
        profitLoss: null,
        profitLossPercent: null,
        holdingDays: 0,
        withdrawFee: 0,
        netProfitLoss: null,
        status: "unmatched",
      });
    }
  }

  for (const [key, inventory] of inventoryMap) {
    const startIdx = usedBuyIndices.get(key) || 0;
    for (let i = startIdx; i < inventory.length; i++) {
      const buyRecord = inventory[i];
      pairs.push({
        commodityName: buyRecord.commodityName,
        templateId: buyRecord.templateId,
        buyRecord,
        sellRecord: null,
        costPrice: buyRecord.priceYuan,
        sellPrice: null,
        profitLoss: null,
        profitLossPercent: null,
        holdingDays: null,
        withdrawFee: 0,
        netProfitLoss: null,
        status: "holding",
      });
    }
  }

  return pairs;
}

export function calcDashboardStats(records: TradeRecord[], pairs: MatchedPair[]): DashboardStats {
  const buyRecords = records.filter((r) => r.type === "buy");
  const sellRecords = records.filter((r) => r.type === "sell");

  const totalBuy = buyRecords.reduce((s, r) => s + r.priceYuan, 0);
  const totalSell = sellRecords.reduce((s, r) => s + r.priceYuan, 0);

  const realizedPairs = pairs.filter((p) => p.status === "realized");
  const realizedPL = realizedPairs.reduce((s, p) => s + (p.profitLoss || 0), 0);
  const withdrawFeeTotal = calcWithdrawFee(totalSell);
  const netProfitAfterFee = realizedPL - withdrawFeeTotal;

  const holdingPairs = pairs.filter((p) => p.status === "holding");
  const holdingValue = holdingPairs.reduce((s, p) => s + p.costPrice, 0);

  const profitRate = totalBuy > 0 ? realizedPL / totalBuy : 0;
  const avgHoldingDays = realizedPairs.length > 0
    ? realizedPairs.reduce((s, p) => s + (p.holdingDays || 0), 0) / realizedPairs.length
    : 0;

  return {
    totalBuy,
    totalSell,
    netProfitLoss: totalSell - totalBuy,
    totalTrades: records.length,
    buyCount: buyRecords.length,
    sellCount: sellRecords.length,
    realizedPL,
    holdingValue,
    profitRate,
    avgHoldingDays,
    withdrawFeeTotal,
    netProfitAfterFee,
  };
}

export function calcCategorySummaries(records: TradeRecord[], pairs: MatchedPair[]): CategorySummary[] {
  const categories = new Set<CommodityCategory>(records.map((r) => r.category));
  const summaries: CategorySummary[] = [];

  for (const cat of categories) {
    const catRecords = records.filter((r) => r.category === cat);
    const catPairs = pairs.filter((p) => {
      const pCat = p.buyRecord.category;
      return pCat === cat;
    });

    const buyAmount = catRecords.filter((r) => r.type === "buy").reduce((s, r) => s + r.priceYuan, 0);
    const sellAmount = catRecords.filter((r) => r.type === "sell").reduce((s, r) => s + r.priceYuan, 0);
    const realizedPL = catPairs.filter((p) => p.status === "realized").reduce((s, p) => s + (p.profitLoss || 0), 0);
    const holdingPairs = catPairs.filter((p) => p.status === "holding");
    const holdingValue = holdingPairs.reduce((s, p) => s + p.costPrice, 0);

    summaries.push({
      category: cat,
      label: CATEGORY_LABELS[cat] || cat,
      color: CATEGORY_COLORS[cat] || "#9CA3AF",
      buyAmount,
      sellAmount,
      count: catRecords.length,
      realizedPL,
      holdingCount: holdingPairs.length,
      holdingValue,
    });
  }

  return summaries.sort((a, b) => b.buyAmount - a.buyAmount);
}

export function calcTimeSeries(records: TradeRecord[], granularity: "day" | "week" | "month" = "day"): TimeSeriesPoint[] {
  const fmt = granularity === "day" ? "yyyy-MM-dd" : granularity === "week" ? "yyyy-II" : "yyyy-MM";

  const grouped = new Map<string, { buyAmount: number; sellAmount: number; count: number }>();

  for (const r of records) {
    const key = format(r.tradeTime, fmt);
    if (!grouped.has(key)) grouped.set(key, { buyAmount: 0, sellAmount: 0, count: 0 });
    const g = grouped.get(key)!;
    if (r.type === "buy") g.buyAmount += r.priceYuan;
    else g.sellAmount += r.priceYuan;
    g.count++;
  }

  const points: TimeSeriesPoint[] = [];
  const sortedKeys = [...grouped.keys()].sort();

  for (const key of sortedKeys) {
    const g = grouped.get(key)!;
    points.push({
      date: key,
      buyAmount: Math.round(g.buyAmount * 100) / 100,
      sellAmount: Math.round(g.sellAmount * 100) / 100,
      netAmount: Math.round((g.sellAmount - g.buyAmount) * 100) / 100,
      count: g.count,
    });
  }

  return points;
}
