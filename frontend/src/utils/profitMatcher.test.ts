import { describe, it, expect } from "vitest";
import { matchProfitLoss, calcDashboardStats } from "./profitMatcher";
import type { TradeRecord } from "@/types/trade";

function makeRecord(
  id: string,
  type: "buy" | "sell",
  priceYuan: number,
  dateStr: string,
  templateId = "w1",
  commodityName = "AK-47 | Redline",
): TradeRecord {
  return {
    id,
    sourceOrderId: `order_${id}`,
    type,
    commodityName,
    templateId,
    status: "done",
    priceFen: priceYuan * 100,
    priceYuan,
    tradeTime: new Date(dateStr),
    tradeTimeStr: dateStr,
    buyerNickname: "buyer",
    sellerNickname: "seller",
    category: "weapon_skin",
  };
}

describe("matchProfitLoss", () => {
  it("卖出匹配到先买入的记录 (FIFO)", () => {
    const records = [
      makeRecord("b1", "buy", 100, "2026-01-01"),
      makeRecord("b2", "buy", 200, "2026-02-01"),
      makeRecord("s1", "sell", 150, "2026-03-01"),
    ];
    const pairs = matchProfitLoss(records);
    const realized = pairs.find((p) => p.status === "realized");
    expect(realized).toBeDefined();
    expect(realized!.costPrice).toBe(100);
    expect(realized!.sellPrice).toBe(150);
    expect(realized!.profitLoss).toBe(50);
  });

  it("未匹配的买入标记为 holding", () => {
    const records = [
      makeRecord("b1", "buy", 100, "2026-01-01"),
      makeRecord("b2", "buy", 200, "2026-02-01"),
      makeRecord("s1", "sell", 150, "2026-03-01"),
    ];
    const pairs = matchProfitLoss(records);
    const holding = pairs.find((p) => p.status === "holding");
    expect(holding).toBeDefined();
    expect(holding!.costPrice).toBe(200);
    expect(holding!.sellPrice).toBeNull();
  });

  it("未匹配的卖出标记为 unmatched，不计入 realizedPL", () => {
    const records = [
      makeRecord("s1", "sell", 150, "2026-03-01"),
    ];
    const pairs = matchProfitLoss(records);
    const unmatched = pairs.find((p) => p.status === "unmatched");
    expect(unmatched).toBeDefined();
    expect(unmatched!.profitLoss).toBeNull();
    expect(unmatched!.sellPrice).toBe(150);

    const stats = calcDashboardStats(records, pairs);
    expect(stats.realizedPL).toBe(0);
  });

  it("多笔买入卖出按 FIFO 顺序匹配", () => {
    const records = [
      makeRecord("b1", "buy", 100, "2026-01-01"),
      makeRecord("b2", "buy", 120, "2026-01-15"),
      makeRecord("s1", "sell", 150, "2026-02-01"),
      makeRecord("s2", "sell", 160, "2026-03-01"),
    ];
    const pairs = matchProfitLoss(records);
    const realized = pairs.filter((p) => p.status === "realized");
    expect(realized).toHaveLength(2);

    // 第一笔卖出匹配第一笔买入 (100 -> 150, profit 50)
    expect(realized[0].costPrice).toBe(100);
    expect(realized[0].sellPrice).toBe(150);
    expect(realized[0].profitLoss).toBe(50);

    // 第二笔卖出匹配第二笔买入 (120 -> 160, profit 40)
    expect(realized[1].costPrice).toBe(120);
    expect(realized[1].sellPrice).toBe(160);
    expect(realized[1].profitLoss).toBe(40);

    const stats = calcDashboardStats(records, pairs);
    expect(stats.realizedPL).toBe(90); // 50 + 40
  });

  it("不同商品的买卖不交叉匹配", () => {
    const records = [
      makeRecord("b1", "buy", 100, "2026-01-01", "w1", "AK-47"),
      makeRecord("s1", "sell", 150, "2026-02-01", "w2", "AWP"),
    ];
    const pairs = matchProfitLoss(records);
    // 不同 templateId，不应该匹配
    const realized = pairs.find((p) => p.status === "realized");
    expect(realized).toBeUndefined();
    const unmatched = pairs.find((p) => p.status === "unmatched");
    expect(unmatched).toBeDefined();
  });

  it("realizedPL 不包含 unmatched 卖出金额", () => {
    // 2 买入 + 3 卖出（第 3 笔卖出无法匹配）
    const records = [
      makeRecord("b1", "buy", 100, "2026-01-01"),
      makeRecord("b2", "buy", 200, "2026-02-01"),
      makeRecord("s1", "sell", 150, "2026-03-01"),
      makeRecord("s2", "sell", 250, "2026-04-01"),
      makeRecord("s3", "sell", 300, "2026-05-01"),
    ];
    const pairs = matchProfitLoss(records);
    const stats = calcDashboardStats(records, pairs);

    // 只有 2 笔匹配：150-100=50, 250-200=50
    expect(stats.realizedPL).toBe(100);
    // 第 3 笔卖出 (300) 不应出现在 realizedPL 中
    expect(stats.realizedPL).not.toBe(400);
  });
});
