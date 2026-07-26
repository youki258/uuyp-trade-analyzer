import Papa from "papaparse";
import type { TradeRecord, TradeType } from "@/types/trade";

export interface ParseResult {
  records: TradeRecord[];
  totalCount: number;
  buyCount: number;
  sellCount: number;
  dateRange: { start: Date | null; end: Date | null };
}

/** 去除 UTF-8 BOM 和首尾空白 */
function stripBom(str: string): string {
  return str.replace(/^\uFEFF/, "").trim();
}

/** 模糊匹配 header 名（去除 BOM、空白、全角半角差异） */
function findFieldValue(row: Record<string, string>, keywords: string[]): string {
  for (const [key, val] of Object.entries(row)) {
    const cleanKey = stripBom(key);
    for (const kw of keywords) {
      if (cleanKey.includes(kw)) return val || "";
    }
  }
  return "";
}

function parsePrice(raw: string | undefined, unitIsFen: boolean = true): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[¥￥,，\s]/g, "");
  const val = parseFloat(cleaned);
  if (isNaN(val)) return 0;
  // 悠悠有品 CSV 合并账单中成交价格列名含"(分)"则单位为分，否则视作元需×100
  if (unitIsFen) {
    return Math.round(val);
  }
  return Math.round(val * 100);
}

function parseQuantity(raw: string | undefined): number {
  if (!raw) return 1;
  const cleaned = raw.replace(/[^\d.]/g, "");
  const val = Number.parseInt(cleaned, 10);
  return Number.isFinite(val) && val > 0 ? val : 1;
}

function splitTotalPriceFen(totalPriceFen: number, quantity: number): number[] {
  if (quantity <= 1) return [totalPriceFen];
  const safeQty = Math.max(1, quantity);
  const base = Math.floor(totalPriceFen / safeQty);
  const remainder = totalPriceFen - base * safeQty;
  return Array.from({ length: safeQty }, (_, i) => base + (i < remainder ? 1 : 0));
}

function parseTradeType(direction: string | undefined, isBuyFile: boolean, isSellFile: boolean): TradeType {
  if (isBuyFile) return "buy";
  if (isSellFile) return "sell";
  if (!direction) return "buy";
  const d = direction.trim();
  if (d.includes("卖") || d.includes("卖出") || d === "sell") return "sell";
  if (d.includes("买") || d.includes("买入") || d === "buy") return "buy";
  return "buy";
}

function identifyCategory(name: string): TradeRecord["category"] {
  if (!name) return "weapon_skin";
  if (/武器箱|武器盒|案例|Case/i.test(name)) return "case";
  if (/印花|Sticker/i.test(name)) return "sticker";
  if (/手套|Gloves?|Wraps?/i.test(name)) return "gloves";
  if (/音乐盒|Music Kit/i.test(name)) return "music_kit";
  if (/涂鸦|Graffiti/i.test(name)) return "graffiti";
  if (/钥匙|Key/i.test(name)) return "key";
  if (/探员|Agent/i.test(name)) return "agent";
  return "weapon_skin";
}

/**
 * 读取文件内容为字符串，自动检测编码（UTF-8 / GBK）
 * 优先尝试 UTF-8，如果出现乱码则回退到 GBK
 */
async function readFileWithEncodingDetection(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(buffer);

  // 检测 UTF-8 BOM
  const hasUtf8Bom = uint8.length >= 3 && uint8[0] === 0xEF && uint8[1] === 0xBB && uint8[2] === 0xBF;

  // 先尝试 UTF-8 解码
  const utf8Decoder = new TextDecoder("utf-8", { fatal: false });
  let text = utf8Decoder.decode(buffer);

  // 简单检测是否乱码：UTF-8 解码出现大量替换字符 (U+FFFD)
  const replacementCount = (text.match(/\uFFFD/g) || []).length;
  const totalChars = text.length;

  if (replacementCount > totalChars * 0.05 && !hasUtf8Bom) {
    // 超过 5% 的字符是替换字符，很可能是 GBK 编码
    try {
      const gbkDecoder = new TextDecoder("gbk", { fatal: false });
      text = gbkDecoder.decode(buffer);
      console.log("[UUYP] Detected GBK encoding, re-decoded with GBK");
    } catch {
      console.warn("[UUYP] GBK decode failed, using UTF-8 result");
    }
  }

  return text;
}

export function parseCsvFile(
  file: File,
  mode: "combined" | "buy" | "sell" = "combined"
): Promise<ParseResult> {
  return readFileWithEncodingDetection(file).then((csvText) => {
    return new Promise<ParseResult>((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as Record<string, string>[];
          if (rows.length === 0) {
            reject(new Error("CSV文件为空"));
            return;
          }

          const isBuyFile = mode === "buy";
          const isSellFile = mode === "sell";
          const records: TradeRecord[] = [];
          const headers = Object.keys(rows[0]).map(stripBom);

          // 检测方向字段：优先"订单类型"，其次"交易方向"
          const hasOrderType = headers.some((h) => h.includes("订单类型"));
          const hasDirection = headers.some((h) => h.includes("交易方向"));
          // 检测价格单位：列名含"(分)"则数据为分，否则为元
          const priceHeaderIsFen = headers.some((h) => /成交价格.*\(分\)|价格.*\(分\)/.test(h));

          rows.forEach((row, rowIndex) => {
            // 使用模糊匹配提取字段值，兼容 BOM 和全角半角差异
            const id = findFieldValue(row, ["订单号"]);
            const commodityName = findFieldValue(row, ["商品名称"]);
            const templateId = findFieldValue(row, ["商品模板ID", "模板ID"]);
            const status = findFieldValue(row, ["订单状态"]);
            const priceStr = findFieldValue(row, ["成交价格", "价格"]);
            const quantityStr = findFieldValue(row, ["成交数量", "商品数量", "数量", "num"]);
            const timeStr = findFieldValue(row, ["成交时间", "时间"]);
            const direction = findFieldValue(row, ["交易方向", "方向", "订单类型", "类型"]);
            const buyerNickname = findFieldValue(row, ["买家昵称", "买家"]);
            const sellerNickname = findFieldValue(row, ["卖家昵称", "卖家"]);

            const quantity = parseQuantity(quantityStr);
            const totalPriceFen = parsePrice(priceStr, priceHeaderIsFen);
            const unitPriceFenList = splitTotalPriceFen(totalPriceFen, quantity);
            const tradeTime = new Date(timeStr.replace(/-/g, "/"));

            let type: TradeType;
            if (hasOrderType || hasDirection) {
              // 合并账单：通过"订单类型"或"交易方向"字段判断买/卖
              type = parseTradeType(direction, false, false);
            } else {
              type = parseTradeType(undefined, isBuyFile, isSellFile);
            }

            // 跳过空行或无关键信息的行
            if (!id && !commodityName && !priceStr) return;

            const safeBaseId = id || `${commodityName || "unknown"}-${timeStr || rowIndex}`;
            unitPriceFenList.forEach((unitPriceFen, unitIndex) => {
              records.push({
                id: unitPriceFenList.length > 1 ? `${safeBaseId}#${unitIndex + 1}` : safeBaseId,
                sourceOrderId: safeBaseId,
                type,
                commodityName,
                templateId,
                status,
                priceFen: unitPriceFen,
                priceYuan: unitPriceFen / 100,
                tradeTime: isNaN(tradeTime.getTime()) ? new Date() : tradeTime,
                tradeTimeStr: timeStr,
                buyerNickname,
                sellerNickname,
                category: identifyCategory(commodityName),
              });
            });
          });

          console.log(`[UUYP] Parsed ${records.length} records from ${file.name}`);

          const buyCount = records.filter((r) => r.type === "buy").length;
          const sellCount = records.filter((r) => r.type === "sell").length;
          const dates = records
            .map((r) => r.tradeTime)
            .filter((d) => !isNaN(d.getTime()))
            .sort((a, b) => a.getTime() - b.getTime());

          resolve({
            records,
            totalCount: records.length,
            buyCount,
            sellCount,
            dateRange: {
              start: dates[0] || null,
              end: dates[dates.length - 1] || null,
            },
          });
        },
        error: (error: unknown) => {
          const message = error instanceof Error ? error.message : "未知错误";
          reject(new Error(`CSV解析失败: ${message}`));
        },
      });
    });
  });
}

export function detectFileMode(fileName: string): "combined" | "buy" | "sell" {
  const lower = fileName.toLowerCase();
  if (lower.includes("buy") || lower.includes("买入")) return "buy";
  if (lower.includes("sell") || lower.includes("卖出")) return "sell";
  return "combined";
}
