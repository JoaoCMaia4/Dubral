import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Shield,
  FileText,
  BookTemplate,
  Settings,
  UserCircle,
  ChevronLeft,
  Building2,
  PlusCircle,
} from "lucide-react";
import { hasPermission } from "@/lib/permissions";

const menuSections = [
  {
    items: [
      { label: "Página Inicial", icon: LayoutDashboard, path: "/", permission: null },
    ],
  },
  {
    title: "Questionários",
    items: [
      { label: "Criar Questionário", icon: PlusCircle, path: "/surveys/new", permission: "create_surveys" },
      { label: "Questionários", icon: FileText, path: "/surveys", permission: null },
      { label: "Modelos", icon: BookTemplate, path: "/templates", permission: "manage_templates" },
    ],
  },
  {
    title: "Administração",
    items: [
      { label: "Funcionários", icon: Users, path: "/employees", permission: "manage_employees" },
      { label: "Setores", icon: Building2, path: "/sectors", permission: "manage_sectors" },
      { label: "Cargos e Permissões", icon: Shield, path: "/positions", permission: "manage_positions" },
      // Settings removed from sidebar
    ],
  },
  {
    items: [
      { label: "Perfil", icon: UserCircle, path: "/profile", permission: null },
    ],
  },
];

export default function Sidebar({
    user,
    positions,
    collapsed,
    onToggle,
    onNavigate,
}) {
  const location = useLocation();

  const isVisible = (item) => {
    if (!item.permission) return true;
    return hasPermission(user, positions, item.permission);
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-card border-r border-border transition-all duration-300",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border shrink-0">
        {collapsed ? (
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-primary-foreground">D</span>
          </div>
        ) : (
          <img
            src="/images/dubral-logo.jpg"
            alt="DUBRAL"
            className="h-10 object-contain"
          />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {menuSections.map((section, si) => {
          const visibleItems = section.items.filter(isVisible);
          if (visibleItems.length === 0) return null;

          return (
            <div key={si}>
              {section.title && !collapsed && (
                <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.path || 
                    (item.path !== "/" && location.pathname.startsWith(item.path));

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => onNavigate?.()}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-border shrink-0">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && <span>Recolher</span>}
        </button>
      </div>
    </aside>
  );
}