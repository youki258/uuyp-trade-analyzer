import { describe, it, expect } from "vitest";
import { parseCsvFile, detectFileMode } from "./csvParser";

/** 构造 UTF-8 编码的 CSV File 对象（vitest node 环境提供 File 全局） */
function makeCsvFile(content: string, name = "test.csv"): File {
  return new File([content], name, { type: "text/csv" });
}

const COMBINED_HEADER = "订单类型,订单号,商品名称,商品模板ID,订单状态,成交数量,成交价格(分),成交时间,买家昵称,卖家昵称,Steam报价ID";

describe("parseCsvFile", () => {
  it("正常解析合并账单：买卖方向、价格单位(分)与时间", async () => {
    const csv = [
      COMBINED_HEADER,
      "买入,B001,AK-47 | 红线 (久经沙场),1001,已完成,1,12345,2026-01-01 10:00:00,buyer,seller,offer-1",
      "卖出,S001,AK-47 | 红线 (久经沙场),1001,已完成,1,15000,2026-02-01 12:00:00,buyer,seller,offer-2",
    ].join("\n");

    const result = await parseCsvFile(makeCsvFile(csv), "combined");
    expect(result.totalCount).toBe(2);
    expect(result.buyCount).toBe(1);
    expect(result.sellCount).toBe(1);
    expect(result.skippedCount).toBe(0);

    const buy = result.records.find((r) => r.type === "buy")!;
    expect(buy.priceFen).toBe(12345);
    expect(buy.priceYuan).toBeCloseTo(123.45);
    expect(buy.tradeOfferId).toBe("offer-1");
    expect(buy.buyerNickname).toBe("buyer");
    expect(buy.sellerNickname).toBe("seller");
    expect(buy.tradeTime.getFullYear()).toBe(2026);
    expect(result.dateRange.start!.getTime()).toBeLessThan(result.dateRange.end!.getTime());
  });

  it("0 元价格订单不被丢弃", async () => {
    const csv = [
      COMBINED_HEADER,
      "买入,B001,免费赠品,1001,已完成,1,0,2026-01-01 10:00:00,,,",
    ].join("\n");

    const result = await parseCsvFile(makeCsvFile(csv), "combined");
    expect(result.totalCount).toBe(1);
    expect(result.records[0].priceFen).toBe(0);
    expect(result.records[0].priceYuan).toBe(0);
  });

  it("无效成交时间的行被跳过并计入 skippedCount", async () => {
    const csv = [
      COMBINED_HEADER,
      "买入,B001,AK-47 | 红线,1001,已完成,1,10000,not-a-date,,,",
      "卖出,S001,AK-47 | 红线,1001,已完成,1,15000,2026-02-01 12:00:00,,,",
    ].join("\n");

    const result = await parseCsvFile(makeCsvFile(csv), "combined");
    expect(result.totalCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    // 跳过的行不应伪造当前时间进入记录
    expect(result.records.every((r) => !isNaN(r.tradeTime.getTime()))).toBe(true);
  });

  it("多数量订单按数量拆分且总金额守恒", async () => {
    const csv = [
      COMBINED_HEADER,
      "买入,B001,武器箱,1001,已完成,3,10001,2026-01-01 10:00:00,,,",
    ].join("\n");

    const result = await parseCsvFile(makeCsvFile(csv), "combined");
    expect(result.totalCount).toBe(3);
    const sum = result.records.reduce((acc, r) => acc + r.priceFen, 0);
    expect(sum).toBe(10001);
  });

  it("列名不含(分)时价格按元处理并转为分", async () => {
    const csv = [
      "订单类型,订单号,商品名称,成交价格,成交时间",
      "买入,B001,AK-47 | 红线,123.45,2026-01-01 10:00:00",
    ].join("\n");

    const result = await parseCsvFile(makeCsvFile(csv), "combined");
    expect(result.records[0].priceFen).toBe(12345);
  });

  it("空文件应 reject", async () => {
    await expect(parseCsvFile(makeCsvFile(""), "combined")).rejects.toThrow("CSV文件为空");
  });

  // GBK 场景：Node 环境无 GBK 编码器（TextEncoder 仅支持 UTF-8），
  // 无法在测试中构造 GBK 字节流，按计划允许跳过；解码回退逻辑由手动验证覆盖。
  it.skip("GBK 编码文件自动回退解码", () => {});
});

describe("detectFileMode", () => {
  it("按文件名识别买入/卖出/合并", () => {
    expect(detectFileMode("uuyp_buy_20260101.csv")).toBe("buy");
    expect(detectFileMode("卖出账单.csv")).toBe("sell");
    expect(detectFileMode("uuyp_bills_20260101.csv")).toBe("combined");
  });
});
