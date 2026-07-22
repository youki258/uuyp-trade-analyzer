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
  const { hasData } = useTradeData();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-16 lg:w-56 bg-[#0B0F19]/90 backdrop-blur-xl border-r border-white/5 z-50 flex flex-col">
      <div className="h-16 flex items-center gap-2 px-4 border-b border-white/5">
        <Crosshair className="w-7 h-7 text-primary shrink-0" />
        <span className="hidden lg:block font-bold text-lg tracking-tight">
          <span className="text-primary">UUYP</span>{" "}
          <span className="text-foreground/80">Analyzer</span>
        </span>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems
          .filter((item) => item.always || hasData)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  "hover:bg-white/5 hover:text-foreground",
                  isActive
                    ? "bg-primary/10 text-primary glow-primary"
                    : "text-muted-foreground",
                )
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="hidden lg:block">{item.label}</span>
            </NavLink>
          ))}
      </nav>

      <div className="hidden lg:block p-4 border-t border-white/5">
        <p className="text-xs text-muted-foreground/50 text-center">
          CS2 饰品交易分析
        </p>
      </div>
    </aside>
  );
}
