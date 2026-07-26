import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("zh-CN");
}

// 悠悠有品提现费计算：1%，最低2元，按元向上取整
export function calcWithdrawFee(amount: number): number {
  if (amount <= 0) return 0;
  const fee = amount * 0.01;
  return Math.max(Math.ceil(fee), 2);
}
