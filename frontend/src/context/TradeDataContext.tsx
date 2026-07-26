import { createContext, useContext, type ReactNode } from "react";
import { useTradeDataCore, type TradeDataState } from "@/hooks/useTradeDataCore";

interface TradeDataContextType extends TradeDataState {
  loadFiles: (files: File[]) => Promise<void>;
  getTimeSeries: (granularity: "day" | "week" | "month") => import("@/types/trade").TimeSeriesPoint[];
  reset: () => void;
  hasData: boolean;
}

const TradeDataContext = createContext<TradeDataContextType | null>(null);

export function TradeDataProvider({ children }: { children: ReactNode }) {
  const tradeData = useTradeDataCore();
  return (
    <TradeDataContext.Provider value={tradeData}>
      {children}
    </TradeDataContext.Provider>
  );
}

export function useTradeData() {
  const ctx = useContext(TradeDataContext);
  if (!ctx) {
    throw new Error("useTradeData must be used within TradeDataProvider");
  }
  return ctx;
}
