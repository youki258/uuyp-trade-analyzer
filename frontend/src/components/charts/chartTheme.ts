/** 全站图表统一视觉规范（仅样式，不动 Recharts 数据结构） */
export const CHART = {
  grid: "rgba(255,255,255,0.05)",
  axis: "rgba(255,255,255,0.08)",
  tick: { fill: "#8A8F98", fontSize: 11 },
  legend: { fontSize: 12, color: "#8A8F98" },
  buy: "#60A5FA",
  sell: "#FB923C",
  primary: "hsl(40, 92%, 55%)",
  /** 中国惯例：盈红 */
  profit: "#EF4444",
  /** 中国惯例：亏绿 */
  loss: "#10B981",
} as const;
