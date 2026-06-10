import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, UserCircle, LogOut, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Header({
  user,
  sidebarCollapsed,
  notifications = [],
  onMobileToggle,
}) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 transition-all duration-300",
        sidebarCollapsed ? "left-[68px]" : "left-0 md:left-[260px]"
      )}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMobileToggle}
          className="md:hidden p-2 rounded-lg hover:bg-accent"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-medium">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-80">
            <div className="p-3 border-b border-border">
              <p className="font-semibold text-sm">Notificações</p>
            </div>

            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Sem notificações
              </div>
            ) : (
              notifications.slice(0, 5).map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex flex-col items-start p-3 gap-1"
                >
                  <span className={cn("text-sm", !notification.read && "font-medium")}>
                    {notification.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {notification.message}
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCircle className="w-5 h-5 text-primary" />
              </div>

              <span className="hidden md:block text-sm font-medium max-w-[120px] truncate">
                {user?.full_name || user?.name || "Utilizador"}
              </span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <div className="p-3 border-b border-border">
              <p className="font-medium text-sm">
                {user?.full_name || user?.name || "Utilizador"}
              </p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>

            <DropdownMenuItem asChild>
              <Link to="/profile" className="flex items-center gap-2">
                <UserCircle className="w-4 h-4" />
                Perfil
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Terminar sessão
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}