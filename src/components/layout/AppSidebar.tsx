import { Link, useRouterState } from "@tanstack/react-router";
import { LogOut, UserCircle2 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAuth, ROLES_LABEL } from "@/auth";
import { NAV_GRUPOS } from "./nav-config";

interface AppSidebarProps {
  onLogout: () => void;
}

export function AppSidebar({ onLogout }: AppSidebarProps) {
  const { user, hasAnyPermission } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4 group-data-[collapsible=icon]:px-2">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sidebar-primary font-bold text-sidebar-primary-foreground">
            C
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="text-sm font-bold tracking-wide">CUCAIER</div>
            <div className="truncate text-[11px] text-sidebar-foreground/70">Gestión de Pacientes</div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GRUPOS.map((grupo) => {
          const visibles = grupo.items.filter((i) => hasAnyPermission(i.permisos));
          if (visibles.length === 0) return null;
          return (
            <SidebarGroup key={grupo.titulo}>
              <SidebarGroupLabel className="text-sidebar-foreground/60">{grupo.titulo}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibles.map((item) => {
                    const activo = pathname === item.to || pathname.startsWith(item.to + "/");
                    return (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton asChild isActive={activo} tooltip={item.titulo}>
                          <Link to={item.to}>
                            <item.icono />
                            <span>{item.titulo}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/perfil"} tooltip="Mi perfil">
              <Link to="/perfil">
                <UserCircle2 />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm">
                    {user ? `${user.nombre} ${user.apellido}` : ""}
                  </span>
                  <span className="truncate text-[11px] text-sidebar-foreground/60">
                    {user?.roles.map((r) => ROLES_LABEL[r]).join(", ")}
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onLogout} tooltip="Cerrar sesión">
              <LogOut />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
