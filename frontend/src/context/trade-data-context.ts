import { createContext } from "react";
import type { TradeDataState } from "@/hooks/useTradeDataCore";

interface TradeDataContextType extends TradeDataState {
  loadFiles: (files: File[]) => Promise<void>;
  getTimeSeries: (granularity: "day" | "week" | "month") => import("@/types/trade").TimeSeriesPoint[];
  reset: () => void;
  hasData: boolean;
}

export const TradeDataContext = createContext<TradeDataContextType | null>(null);
