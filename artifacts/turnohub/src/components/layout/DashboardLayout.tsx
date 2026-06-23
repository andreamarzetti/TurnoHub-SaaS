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
import {
  LayoutDashboard,
  Calendar,
  ListOrdered,
  Settings,
  Users,
  Clock,
  CreditCard,
  LogOut,
  Briefcase,
} from "lucide-react";

const navItems = [
  { title: "Inicio", href: "/dashboard", icon: LayoutDashboard },
  { title: "Calendario", href: "/calendar", icon: Calendar },
  { title: "Turnos", href: "/appointments", icon: ListOrdered },
  { title: "Servicios", href: "/services", icon: Briefcase },
  { title: "Horarios", href: "/schedule", icon: Clock },
  { title: "Clientes", href: "/clients", icon: Users },
  { title: "Configuración", href: "/settings", icon: Settings },
  { title: "Suscripción", href: "/suscripcion", icon: CreditCard },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!user) { setLocation("/login"); return; }
    if (user.role === "super_admin") { setLocation("/admin"); return; }
    if (user.role !== "professional") { setLocation("/"); return; }
    if (user.professional?.status === "suspended") { setLocation("/suscripcion"); return; }
    if (!user.professional?.onboardingCompleted) { setLocation("/onboarding"); return; }
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

  if (!user || user.role !== "professional" || !user.professional?.onboardingCompleted) {
    return null;
  }

  if (user.professional.status === "suspended") {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <Sidebar>
          <SidebarHeader className="p-4 border-b">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-xs">T</span>
              </div>
              <span className="font-bold text-foreground">Turno<span className="text-primary">Hub</span></span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu className="mt-3 px-2 space-y-0.5">
              {navItems.map((item) => {
                const isActive = location === item.href || location.startsWith(item.href + "/");
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
            <div className="flex items-center gap-3 px-2 py-2 mb-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                {user.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
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
            <span className="ml-4 font-semibold">TurnoHub</span>
          </div>
          <div className="p-6 md:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
