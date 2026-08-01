import type { ReactNode } from "react";
import { useTradeDataCore } from "@/hooks/useTradeDataCore";
import { TradeDataContext } from "./trade-data-context";

export function TradeDataProvider({ children }: { children: ReactNode }) {
  const tradeData = useTradeDataCore();
  return (
    <TradeDataContext.Provider value={tradeData}>
      {children}
    </TradeDataContext.Provider>
  );
}
