import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ProfitAnalysisPage } from "@/pages/ProfitAnalysisPage";
import { CS2AnalysisPage } from "@/pages/CS2AnalysisPage";
import { TrendPage } from "@/pages/TrendPage";
import { TradeDetailPage } from "@/pages/TradeDetailPage";
import { TradeDataProvider, useTradeData } from "@/context/TradeDataContext";

function RequireData({ children }: { children: React.ReactNode }) {
  const { hasData } = useTradeData();
  if (!hasData) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <TradeDataProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <RequireData>
                  <DashboardPage />
                </RequireData>
              }
            />
            <Route
              path="/profit"
              element={
                <RequireData>
                  <ProfitAnalysisPage />
                </RequireData>
              }
            />
            <Route
              path="/cs2"
              element={
                <RequireData>
                  <CS2AnalysisPage />
                </RequireData>
              }
            />
            <Route
              path="/trend"
              element={
                <RequireData>
                  <TrendPage />
                </RequireData>
              }
            />
            <Route
              path="/trades"
              element={
                <RequireData>
                  <TradeDetailPage />
                </RequireData>
              }
            />
          </Route>
        </Routes>
      </HashRouter>
    </TradeDataProvider>
  );
}

export default App;
