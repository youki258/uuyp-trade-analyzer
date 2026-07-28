import { describe, it, expect } from "vitest";
import {
  extractWearLevel,
  extractWeaponType,
  extractBaseName,
  calcWearStats,
  calcWeaponStats,
  WEAR_LEVEL_LABELS,
  WEAR_LEVEL_ORDER,
} from "./cs2Analyzer";

describe("extractWearLevel", () => {
  it("识别五种磨损等级", () => {
    expect(extractWearLevel("AK-47 | 红线 (崭新出厂)")).toBe("factory_new");
    expect(extractWearLevel("AK-47 | 红线 (略有磨损)")).toBe("minimal_wear");
    expect(extractWearLevel("AK-47 | 红线 (久经沙场)")).toBe("field_tested");
    expect(extractWearLevel("AK-47 | 红线 (破损不堪)")).toBe("well_worn");
    expect(extractWearLevel("AK-47 | 红线 (战痕累累)")).toBe("battle_scared");
  });

  it("无磨损后缀返回 null", () => {
    expect(extractWearLevel("音乐盒 | AWOLNATION")).toBeNull();
    expect(extractWearLevel("")).toBeNull();
  });

  it("WEAR_LEVEL_ORDER 与 LABELS 一一对应", () => {
    expect(WEAR_LEVEL_ORDER).toHaveLength(5);
    for (const wear of WEAR_LEVEL_ORDER) {
      expect(WEAR_LEVEL_LABELS[wear]).toBeTruthy();
    }
  });
});

describe("extractWeaponType", () => {
  it("步枪/狙击枪/手枪归类", () => {
    expect(extractWeaponType("AK-47 | 红线 (久经沙场)")).toBe("rifle");
    expect(extractWeaponType("M4A1-S | 印花集 (崭新出厂)")).toBe("rifle");
    expect(extractWeaponType("AWP | 二西莫夫 (破损不堪)")).toBe("sniper");
    expect(extractWeaponType("Desert Eagle | 炽烈之炎")).toBe("pistol");
  });

  it("刀具优先级高于其它类型（中英文名）", () => {
    expect(extractWeaponType("蝴蝶刀 | 渐变大理石 (崭新出厂)")).toBe("knife");
    expect(extractWeaponType("Karambit | Doppler")).toBe("knife");
    expect(extractWeaponType("M9 刺刀 | 深红之网")).toBe("knife");
  });

  it("手套归类（大小写不敏感）", () => {
    expect(extractWeaponType("专业手套 | 深红和服")).toBe("gloves");
    expect(extractWeaponType("Sport Gloves | Pandora's Box")).toBe("gloves");
  });

  it("冲锋枪/霰弹枪/机枪归类", () => {
    expect(extractWeaponType("P90 | 二西莫夫")).toBe("smg");
    expect(extractWeaponType("Nova | 锦鲤")).toBe("shotgun");
    expect(extractWeaponType("Negev | 狮子鱼")).toBe("machine_gun");
  });

  it("未知名称返回 null", () => {
    expect(extractWeaponType("印花 | 天堂之门")).toBeNull();
  });
});

describe("extractBaseName", () => {
  it("去除中文括号磨损后缀", () => {
    expect(extractBaseName("AK-47 | 红线 （久经沙场）")).toBe("AK-47 | 红线");
  });

  it("去除半角括号磨损后缀", () => {
    expect(extractBaseName("AWP | 二西莫夫 (破损不堪)")).toBe("AWP | 二西莫夫");
  });

  it("无后缀名称保持不变", () => {
    expect(extractBaseName("音乐盒 | AWOLNATION")).toBe("音乐盒 | AWOLNATION");
  });
});

describe("calcWearStats", () => {
  it("按磨损聚合数量/金额并合并盈亏", () => {
    const records = [
      { commodityName: "AK-47 | 红线 (久经沙场)", priceYuan: 100, type: "buy" },
      { commodityName: "AK-47 | 红线 (久经沙场)", priceYuan: 150, type: "sell" },
      { commodityName: "AWP | 二西莫夫 (崭新出厂)", priceYuan: 500, type: "buy" },
    ];
    const pairs = [
      {
        buyRecord: { commodityName: "AK-47 | 红线 (久经沙场)", priceYuan: 100 },
        sellRecord: { commodityName: "AK-47 | 红线 (久经沙场)", priceYuan: 150 },
        profitLoss: 50,
        netProfitLoss: 48,
      },
    ];
    const stats = calcWearStats(records, pairs);
    // 按 WEAR_LEVEL_ORDER 排序：崭新出厂在前
    expect(stats.map((s) => s.wear)).toEqual(["factory_new", "field_tested"]);
    const ft = stats.find((s) => s.wear === "field_tested")!;
    expect(ft.count).toBe(2);
    expect(ft.buyAmount).toBe(100);
    expect(ft.sellAmount).toBe(150);
    expect(ft.profitLoss).toBe(50);
  });

  it("无磨损信息的记录被忽略", () => {
    const stats = calcWearStats(
      [{ commodityName: "印花 | 天堂之门", priceYuan: 10, type: "buy" }],
      []
    );
    expect(stats).toHaveLength(0);
  });
});

describe("calcWeaponStats", () => {
  it("仅统计 weapon_skin 分类并按数量排序", () => {
    const records = [
      { commodityName: "AK-47 | 红线 (久经沙场)", priceYuan: 100, type: "buy", category: "weapon_skin" },
      { commodityName: "AK-47 | 红线 (久经沙场)", priceYuan: 150, type: "sell", category: "weapon_skin" },
      { commodityName: "AWP | 二西莫夫 (崭新出厂)", priceYuan: 500, type: "buy", category: "weapon_skin" },
      // 非 weapon_skin 分类应被跳过
      { commodityName: "AK-47 武器箱", priceYuan: 5, type: "buy", category: "case" },
    ];
    const pairs = [
      {
        buyRecord: { commodityName: "AK-47 | 红线 (久经沙场)", priceYuan: 100, tradeTime: new Date("2026-01-01") },
        sellRecord: { commodityName: "AK-47 | 红线 (久经沙场)", priceYuan: 150, tradeTime: new Date("2026-01-11") },
        profitLoss: 50,
        netProfitLoss: 48,
        holdingDays: 10,
      },
    ];
    const stats = calcWeaponStats(records, pairs);
    expect(stats.map((s) => s.type)).toEqual(["rifle", "sniper"]);
    const rifle = stats[0];
    expect(rifle.count).toBe(2);
    expect(rifle.profitLoss).toBe(50);
    expect(rifle.avgHoldingDays).toBe(10);
  });
});
