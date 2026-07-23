import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Table2,
  Upload,
  Crosshair,
  Swords,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTradeData } from "@/hooks/useTradeData";

const navItems = [
  { to: "/", icon: Upload, label: "数据导入", always: true },
  { to: "/dashboard", icon: LayoutDashboard, label: "总览" },
  { to: "/profit", icon: TrendingUp, label: "盈亏分析" },
  { to: "/cs2", icon: Swords, label: "CS2 场景" },
  { to: "/trend", icon: BarChart3, label: "时间趋势" },
  { to: "/trades", icon: Table2, label: "交易明细" },
];

export function Sidebar() {
  const { hasData, records } = useTradeData();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-16 lg:w-56 bg-[hsl(220_13%_6%)] border-r border-hairline z-50 flex flex-col">
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-hairline">
        <Crosshair className="w-6 h-6 text-primary shrink-0" />
        <span className="hidden lg:block font-semibold text-[15px]">
          <span className="text-primary">UUYP</span>{" "}
          <span className="text-foreground/80">Analyzer</span>
        </span>
      </div>

      <nav className="flex-1 py-3 space-y-0.5 px-2">
        {navItems
          .filter((item) => item.always || hasData)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center gap-3 h-9 px-3 rounded-md text-[13px] transition-colors duration-200",
                  "hover:text-foreground hover:bg-white/[0.04]",
                  isActive
                    ? "bg-white/[0.05] text-foreground before:absolute before:left-0 before:inset-y-1.5 before:w-0.5 before:rounded-full before:bg-primary"
                    : "text-muted-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      "w-[18px] h-[18px] shrink-0",
                      isActive && "text-primary",
                    )}
                  />
                  <span className="hidden lg:block">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
      </nav>

      <div className="p-4 border-t border-hairline">
        <div className="flex items-center gap-2 justify-center lg:justify-start">
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full shrink-0",
              hasData ? "bg-profit-light" : "bg-muted-foreground/40",
            )}
          />
          <p className="hidden lg:block text-xs text-muted-foreground">
            {hasData ? `已加载 ${records.length} 条记录` : "未加载数据"}
          </p>
        </div>
      </div>
    </aside>
  );
}
