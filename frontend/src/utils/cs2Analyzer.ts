/**
 * CS2 场景分析工具函数
 * 从商品名称中提取磨损等级、武器类型等 CS2 特有信息
 */

/** CS2 磨损等级 */
export type WearLevel =
  | "factory_new"
  | "minimal_wear"
  | "field_tested"
  | "well_worn"
  | "battle_scared";

export const WEAR_LEVEL_LABELS: Record<WearLevel, string> = {
  factory_new: "崭新出厂",
  minimal_wear: "略有磨损",
  field_tested: "久经沙场",
  well_worn: "破损不堪",
  battle_scared: "战痕累累",
};

export const WEAR_LEVEL_COLORS: Record<WearLevel, string> = {
  factory_new: "#4ADE80", // 绿色 - 最好
  minimal_wear: "#60A5FA", // 蓝色
  field_tested: "#FACC15", // 黄色
  well_worn: "#FB923C", // 橙色
  battle_scared: "#EF4444", // 红色 - 最差
};

export const WEAR_LEVEL_ORDER: WearLevel[] = [
  "factory_new",
  "minimal_wear",
  "field_tested",
  "well_worn",
  "battle_scared",
];

/** 武器类型 */
export type WeaponType =
  | "rifle"
  | "smg"
  | "pistol"
  | "shotgun"
  | "sniper"
  | "machine_gun"
  | "knife"
  | "gloves"
  | "other";

export const WEAPON_TYPE_LABELS: Record<WeaponType, string> = {
  rifle: "步枪",
  smg: "冲锋枪",
  pistol: "手枪",
  shotgun: "霰弹枪",
  sniper: "狙击枪",
  machine_gun: "机枪",
  knife: "刀/匕首",
  gloves: "手套",
  other: "其他",
};

/** 从商品名称提取磨损等级 */
export function extractWearLevel(name: string): WearLevel | null {
  if (name.includes("崭新出厂")) return "factory_new";
  if (name.includes("略有磨损")) return "minimal_wear";
  if (name.includes("久经沙场")) return "field_tested";
  if (name.includes("破损不堪")) return "well_worn";
  if (name.includes("战痕累累")) return "battle_scared";
  return null;
}

/** 从商品名称提取武器类型 */
export function extractWeaponType(name: string): WeaponType | null {
  const rifles = ["AK-47", "M4A4", "M4A1-S", "AUG", "FAMAS", "Galil", "SG 553", "AK47"];
  const smgs = ["MP9", "MAC-10", "MP7", "UMP-45", "P90", "PP-Bizon", "MP5-SD"];
  const pistols = ["USP-S", "Glock", "P250", "Five-SeveN", "Tec-9", "CZ75", "Desert Eagle", "Dual Berettas", "P2000"];
  const shotguns = ["Nova", "XM1014", "Sawed-Off", "MAG-7"];
  const snipers = ["AWP", "SSG 08", "SCAR-20", "G3SG1"];
  const machineGuns = ["M249", "Negev"];
  const knives = ["蝴蝶刀", "爪子刀", "M9 刺刀", "刺刀", "折叠刀", "穿肠刀", "熊刀", "锯齿爪刀", "骷髅匕首", "鲍伊刀", "猎杀者匕首", "短剑", "诺曼底", "Karambit", "Butterfly", "Bayonet", "M9 Bayonet", "Flip Knife", "Gut Knife", "Kukri", "Talon Knife", "Skeleton Knife", "Bowie Knife", "Huntsman Knife", "Stiletto Knife", "Nomad Knife", "Classic Knife", "Paracord Knife", "Survival Knife"];
  const glovesList = ["手套", "motorcycle", "specialist", "sport", "driver", "hand wraps", "bloodhound"];

  const upper = name;

  if (knives.some((k) => upper.includes(k))) return "knife";
  if (glovesList.some((g) => upper.toLowerCase().includes(g.toLowerCase()))) return "gloves";
  if (rifles.some((r) => upper.includes(r))) return "rifle";
  if (smgs.some((s) => upper.includes(s))) return "smg";
  if (pistols.some((p) => upper.includes(p))) return "pistol";
  if (shotguns.some((s) => upper.includes(s))) return "shotgun";
  if (snipers.some((s) => upper.includes(s))) return "sniper";
  if (machineGuns.some((m) => upper.includes(m))) return "machine_gun";

  return null;
}

/** 磨损等级统计 */
export interface WearStats {
  wear: WearLevel;
  label: string;
  color: string;
  count: number;
  buyAmount: number;
  sellAmount: number;
  avgPrice: number;
  profitLoss: number;
}

/** 武器类型统计 */
export interface WeaponStats {
  type: WeaponType;
  label: string;
  count: number;
  buyAmount: number;
  sellAmount: number;
  profitLoss: number;
  avgHoldingDays: number;
}

/** 磨损等级盈亏对比 */
export interface WearProfitComparison {
  wear: string;
  avgProfit: number;
  profitRate: number;
  count: number;
}

/** 计算磨损等级统计 */
export function calcWearStats(
  records: { commodityName: string; priceYuan: number; type: string }[],
  pairs: { buyRecord: { commodityName: string; priceYuan: number }; sellRecord: { commodityName: string; priceYuan: number } | null; profitLoss: number | null; netProfitLoss: number | null }[]
): WearStats[] {
  const wearMap = new Map<WearLevel, { count: number; buyAmount: number; sellAmount: number; pl: number }>();

  for (const r of records) {
    const wear = extractWearLevel(r.commodityName);
    if (!wear) continue;
    const entry = wearMap.get(wear) || { count: 0, buyAmount: 0, sellAmount: 0, pl: 0 };
    entry.count++;
    if (r.type === "buy") entry.buyAmount += r.priceYuan;
    else entry.sellAmount += r.priceYuan;
    wearMap.set(wear, entry);
  }

  for (const p of pairs) {
    const wear = extractWearLevel(p.buyRecord.commodityName);
    if (!wear || p.profitLoss == null) continue;
    const entry = wearMap.get(wear);
    if (entry) entry.pl += p.profitLoss;
  }

  return WEAR_LEVEL_ORDER.filter((w) => wearMap.has(w)).map((wear) => {
    const data = wearMap.get(wear)!;
    return {
      wear,
      label: WEAR_LEVEL_LABELS[wear],
      color: WEAR_LEVEL_COLORS[wear],
      count: data.count,
      buyAmount: Math.round(data.buyAmount * 100) / 100,
      sellAmount: Math.round(data.sellAmount * 100) / 100,
      avgPrice: data.count > 0 ? Math.round(((data.buyAmount + data.sellAmount) / data.count) * 100) / 100 : 0,
      profitLoss: Math.round(data.pl * 100) / 100,
    };
  });
}

/** 计算武器类型统计 */
export function calcWeaponStats(
  records: { commodityName: string; priceYuan: number; type: string; category: string }[],
  pairs: { buyRecord: { commodityName: string; priceYuan: number; tradeTime: Date }; sellRecord: { commodityName: string; priceYuan: number; tradeTime: Date } | null; profitLoss: number | null; netProfitLoss: number | null; holdingDays: number | null }[]
): WeaponStats[] {
  const weaponMap = new Map<WeaponType, { count: number; buyAmount: number; sellAmount: number; pl: number; holdingDays: number; holdingCount: number }>();

  for (const r of records) {
    if (r.category !== "weapon_skin") continue;
    const wt = extractWeaponType(r.commodityName);
    if (!wt) continue;
    const entry = weaponMap.get(wt) || { count: 0, buyAmount: 0, sellAmount: 0, pl: 0, holdingDays: 0, holdingCount: 0 };
    entry.count++;
    if (r.type === "buy") entry.buyAmount += r.priceYuan;
    else entry.sellAmount += r.priceYuan;
    weaponMap.set(wt, entry);
  }

  for (const p of pairs) {
    const wt = extractWeaponType(p.buyRecord.commodityName);
    if (!wt) continue;
    const entry = weaponMap.get(wt);
    if (!entry) continue;
    if (p.profitLoss != null) entry.pl += p.profitLoss;
    if (p.holdingDays != null) {
      entry.holdingDays += p.holdingDays;
      entry.holdingCount++;
    }
  }

  return Array.from(weaponMap.entries())
    .map(([type, data]) => ({
      type,
      label: WEAPON_TYPE_LABELS[type],
      count: data.count,
      buyAmount: Math.round(data.buyAmount * 100) / 100,
      sellAmount: Math.round(data.sellAmount * 100) / 100,
      profitLoss: Math.round(data.pl * 100) / 100,
      avgHoldingDays: data.holdingCount > 0 ? Math.round(data.holdingDays / data.holdingCount) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

/** 提取武器基础名（去除磨损后缀） */
export function extractBaseName(name: string): string {
  return name.replace(/\s*[(（](崭新出厂|略有磨损|久经沙场|破损不堪|战痕累累)[)）]\s*/, "").trim();
}
