import { ReactNode, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Users, LogOut, Shield } from "lucide-react";

const adminNavItems = [
  { title: "Panel Admin", href: "/admin", icon: LayoutDashboard },
  { title: "Profesionales", href: "/admin/professionals", icon: Users },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!user) { setLocation("/login"); return; }
    if (user.role !== "super_admin") {
      setLocation(user.role === "professional" ? "/dashboard" : "/");
      return;
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "super_admin") return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <Sidebar>
          <SidebarHeader className="p-4 border-b">
            <Link href="/admin" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <div>
                <span className="font-bold text-foreground text-sm">TurnoHub</span>
                <p className="text-xs text-primary font-medium">Super Admin</p>
              </div>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu className="mt-3 px-2 space-y-0.5">
              {adminNavItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href} className="flex items-center gap-3 w-full">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-3 border-t">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={logout} className="text-muted-foreground hover:text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>Cerrar sesión</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1 overflow-auto">
          <div className="flex h-14 items-center border-b px-4 bg-background lg:hidden">
            <SidebarTrigger />
            <span className="ml-4 font-semibold text-primary">Admin Panel</span>
          </div>
          <div className="p-6 md:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
