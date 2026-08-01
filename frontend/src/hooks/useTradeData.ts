import { useContext } from "react";
import { TradeDataContext } from "@/context/trade-data-context";

export function useTradeData() {
  const ctx = useContext(TradeDataContext);
  if (!ctx) {
    throw new Error("useTradeData must be used within TradeDataProvider");
  }
  return ctx;
}
