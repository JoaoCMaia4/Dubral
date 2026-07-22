import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { cn } from "@/lib/utils";
import ReminderChecker from "@/components/ReminderChecker";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { user, employee, authUser, permissions, hasPermission } = useAuth();

  const { data: positions = [] } = useQuery({
    queryKey: ["positions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("positions")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", employee?.id],
    queryFn: async () => {
      if (!employee?.id) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("employee_id", employee.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.warn("Tabela notifications ainda não existe ou não está configurada:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!employee?.id,
    initialData: [],
  });

  const layoutUser = employee
    ? {
        ...employee,
        id: employee.id,
        auth_user_id: authUser?.id,
        email: employee.email || authUser?.email,
        full_name: employee.full_name || authUser?.email,
        name: employee.full_name || authUser?.email,
        permissions,
      }
    : authUser
      ? {
          id: authUser.id,
          auth_user_id: authUser.id,
          email: authUser.email,
          full_name: authUser.email,
          name: authUser.email,
          permissions,
        }
      : null;

  return (
    <div className="min-h-screen bg-background">
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className={cn("hidden md:block")}>
        <Sidebar
          user={layoutUser}
          positions={positions}
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          hasPermission={hasPermission}
        />
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-y-0 left-0 z-40">
          <Sidebar
            user={layoutUser}
            positions={positions}
            collapsed={false}
            onToggle={() => setMobileOpen(false)}
            onNavigate={() => setMobileOpen(false)}
            hasPermission={hasPermission}
          />
        </div>
      )}

      <Header
        user={layoutUser}
        sidebarCollapsed={collapsed}
        notifications={notifications}
        onMobileToggle={() => setMobileOpen(!mobileOpen)}
      />

      <ReminderChecker user={layoutUser} positions={positions} />

      <main
        className={cn(
          "pt-16 min-h-screen transition-all duration-300",
          collapsed ? "md:pl-[68px]" : "md:pl-[260px]"
        )}
      >
        <div className="p-4 md:p-6 lg:p-8">
          <Outlet
            context={{
              user: layoutUser,
              employee,
              authUser,
              positions,
              notifications,
              permissions,
              hasPermission,
            }}
          />
        </div>
      </main>
    </div>
  );
}