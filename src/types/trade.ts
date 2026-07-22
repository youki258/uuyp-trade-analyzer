export type TradeType = "buy" | "sell" | "lease";

export type CommodityCategory =
  | "weapon_skin"
  | "sticker"
  | "case"
  | "gloves"
  | "music_kit"
  | "graffiti"
  | "key"
  | "agent"
  | "other";

export const CATEGORY_LABELS: Record<CommodityCategory, string> = {
  weapon_skin: "武器皮肤",
  sticker: "印花",
  case: "武器箱",
  gloves: "手套",
  music_kit: "音乐盒",
  graffiti: "涂鸦",
  key: "钥匙",
  agent: "探员",
  other: "其他",
};

export const CATEGORY_COLORS: Record<CommodityCategory, string> = {
  weapon_skin: "#4B69FF",
  sticker: "#D32CE6",
  case: "#DE9B35",
  gloves: "#8847FF",
  music_kit: "#EB4B4B",
  graffiti: "#5C9A2E",
  key: "#FFD700",
  agent: "#6B7280",
  other: "#9CA3AF",
};

export interface TradeRecord {
  id: string;
  sourceOrderId?: string;
  type: TradeType;
  commodityName: string;
  templateId: string;
  status: string;
  priceFen: number;
  priceYuan: number;
  tradeTime: Date;
  tradeTimeStr: string;
  buyerNickname: string;
  sellerNickname: string;
  category: CommodityCategory;
}

export interface MatchedPair {
  commodityName: string;
  templateId: string;
  buyRecord: TradeRecord;
  sellRecord: TradeRecord | null;
  costPrice: number;
  sellPrice: number | null;
  profitLoss: number | null;
  profitLossPercent: number | null;
  holdingDays: number | null;
  withdrawFee: number;
  netProfitLoss: number | null;
  status: "realized" | "holding";
}

export interface CategorySummary {
  category: CommodityCategory;
  label: string;
  color: string;
  buyAmount: number;
  sellAmount: number;
  count: number;
  realizedPL: number;
  holdingCount: number;
  holdingValue: number;
}

export interface TimeSeriesPoint {
  date: string;
  buyAmount: number;
  sellAmount: number;
  netAmount: number;
  count: number;
}

export interface DashboardStats {
  totalBuy: number;
  totalSell: number;
  netProfitLoss: number;
  totalTrades: number;
  buyCount: number;
  sellCount: number;
  realizedPL: number;
  holdingValue: number;
  profitRate: number;
  avgHoldingDays: number;
  withdrawFeeTotal: number;
  netProfitAfterFee: number;
}
