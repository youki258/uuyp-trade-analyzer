import { describe, expect, it } from "vitest";
import { buildAnalysisExportCsv } from "./analysisExport";
import type { TradeRecord } from "@/types/trade";

const record: TradeRecord = {
  id: "record-1",
  sourceOrderId: "order-1",
  type: "buy",
  commodityName: "AK-47 | Redline",
  templateId: "template-1",
  status: "done",
  priceFen: 10000,
  priceYuan: 100,
  tradeTime: new Date("2026-01-01T00:00:00Z"),
  tradeTimeStr: "2026-01-01",
  buyerNickname: "buyer-secret",
  sellerNickname: "seller-secret",
  category: "weapon_skin",
};

describe("buildAnalysisExportCsv", () => {
  it("preserves buyer and seller names in the client analysis export", () => {
    const csv = buildAnalysisExportCsv({
      parseResult: {
        records: [],
        totalCount: 1,
        buyCount: 1,
        sellCount: 0,
        skippedCount: 0,
        dateRange: { start: record.tradeTime, end: record.tradeTime },
      },
      stats: {
        totalBuy: 100,
        totalSell: 0,
        netProfitLoss: -100,
        totalTrades: 1,
        buyCount: 1,
        sellCount: 0,
        realizedPL: 0,
        holdingValue: 100,
        profitRate: 0,
        avgHoldingDays: 0,
        withdrawFeeTotal: 0,
        netProfitAfterFee: -100,
      },
      records: [record],
      pairs: [],
      categorySummaries: [],
      timeSeries: [],
    });

    expect(csv).toContain("买家昵称");
    expect(csv).toContain("卖家昵称");
    expect(csv).toContain("buyer-secret");
    expect(csv).toContain("seller-secret");
    expect(csv).toContain("商品名称");
  });
});
