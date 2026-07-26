import { useState, useCallback, useEffect, useRef } from "react";
import type {
  TradeRecord,
  MatchedPair,
  DashboardStats,
  CategorySummary,
  TimeSeriesPoint,
} from "@/types/trade";
import {
  parseCsvFile,
  detectFileMode,
  type ParseResult,
} from "@/utils/csvParser";
import {
  matchProfitLoss,
  calcDashboardStats,
  calcCategorySummaries,
  calcTimeSeries,
} from "@/utils/profitMatcher";

export interface TradeDataState {
  records: TradeRecord[];
  pairs: MatchedPair[];
  stats: DashboardStats | null;
  categorySummaries: CategorySummary[];
  timeSeries: TimeSeriesPoint[];
  isLoading: boolean;
  error: string | null;
  parseResult: ParseResult | null;
}

const STORAGE_KEY = "uuyp_trade_data";

const initialState: TradeDataState = {
  records: [],
  pairs: [],
  stats: null,
  categorySummaries: [],
  timeSeries: [],
  isLoading: false,
  error: null,
  parseResult: null,
};

/** 从 sessionStorage 恢复数据（开发模式 HMR 兼容） */
function loadFromStorage(): TradeDataState | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // 恢复 Date 对象
    if (parsed.records) {
      for (const r of parsed.records) {
        r.tradeTime = new Date(r.tradeTime);
      }
    }
    console.log(
      `[UUYP] Restored ${parsed.records?.length || 0} records from sessionStorage`,
    );
    return parsed;
  } catch {
    return null;
  }
}

/** 保存数据到 sessionStorage */
function saveToStorage(state: TradeDataState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("[UUYP] Failed to save to sessionStorage:", e);
  }
}

/** 清除 sessionStorage */
function clearStorage(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function dedupeRecords(records: TradeRecord[]): TradeRecord[] {
  const seen = new Set<string>();
  const deduped: TradeRecord[] = [];

  for (const record of records) {
    const key = record.id;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(record);
  }

  return deduped;
}

export function useTradeDataCore() {
  const isProcessingRef = useRef(false);
  const [state, setState] = useState<TradeDataState>(() => {
    const stored = loadFromStorage();
    return stored || initialState;
  });

  useEffect(() => {
    if (state.records.length > 0 && !state.isLoading) {
      saveToStorage(state);
    }
  }, [state]);

  const loadFiles = useCallback(async (files: File[]) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    clearStorage();
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const allRecords: TradeRecord[] = [];

      for (const file of files) {
        const mode = detectFileMode(file.name);
        const result = await parseCsvFile(file, mode);
        console.log(
          `[UUYP] Parsed ${file.name}: ${result.records.length} records`,
        );
        allRecords.push(...result.records);
      }

      if (allRecords.length === 0) {
        const errMsg = "未解析到任何交易记录，请检查 CSV 格式";
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errMsg,
        }));
        throw new Error(errMsg);
      }

      allRecords.sort((a, b) => a.tradeTime.getTime() - b.tradeTime.getTime());

      const normalizedRecords = dedupeRecords(allRecords);

      const pairs = matchProfitLoss(normalizedRecords);
      const stats = calcDashboardStats(normalizedRecords, pairs);
      const categorySummaries = calcCategorySummaries(normalizedRecords, pairs);
      const timeSeries = calcTimeSeries(normalizedRecords, "day");

      const buyCount = normalizedRecords.filter((r) => r.type === "buy").length;
      const sellCount = normalizedRecords.filter(
        (r) => r.type === "sell",
      ).length;
      const dates = normalizedRecords
        .map((r) => r.tradeTime)
        .sort((a, b) => a.getTime() - b.getTime());

      setState({
        records: normalizedRecords,
        pairs,
        stats,
        categorySummaries,
        timeSeries,
        isLoading: false,
        error: null,
        parseResult: {
          totalCount: normalizedRecords.length,
          buyCount,
          sellCount,
          dateRange: { start: dates[0], end: dates[dates.length - 1] },
          records: [],
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : `数据处理出错: ${err}`;
      console.error("[UUYP] loadFiles error:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      throw err;
    } finally {
      isProcessingRef.current = false;
    }
  }, []);

  const getTimeSeries = useCallback(
    (granularity: "day" | "week" | "month") => {
      return calcTimeSeries(state.records, granularity);
    },
    [state.records],
  );

  const reset = useCallback(() => {
    clearStorage();
    setState(initialState);
  }, []);

  const hasData = state.records.length > 0;

  return { ...state, loadFiles, getTimeSeries, reset, hasData };
}
