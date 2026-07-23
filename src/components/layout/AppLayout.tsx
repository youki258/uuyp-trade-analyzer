import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-16 lg:ml-56 min-h-screen">
        <div className="px-6 lg:px-10 xl:px-12 py-8 lg:py-10 max-w-[1440px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
