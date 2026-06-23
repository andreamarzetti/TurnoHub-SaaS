import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
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
import { Link } from "wouter";
import { 
  LayoutDashboard, 
  Calendar, 
  ListOrdered, 
  Settings, 
  Users, 
  Clock, 
  CreditCard,
  LogOut,
  Briefcase
} from "lucide-react";

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Calendar", href: "/calendar", icon: Calendar },
  { title: "Appointments", href: "/appointments", icon: ListOrdered },
  { title: "Services", href: "/services", icon: Briefcase },
  { title: "Schedule", href: "/schedule", icon: Clock },
  { title: "Clients", href: "/clients", icon: Users },
  { title: "Settings", href: "/settings", icon: Settings },
  { title: "Subscription", href: "/subscription", icon: CreditCard },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    } else if (!isLoading && user && user.role !== "professional") {
      setLocation(user.role === "super_admin" ? "/admin" : "/");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading || !user || user.role !== "professional") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <Sidebar>
          <SidebarHeader className="p-4 border-b">
            <h2 className="text-xl font-bold text-primary">TurnoHub</h2>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu className="mt-4 px-2 space-y-1">
              {navItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href} className="flex items-center gap-3 w-full">
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={logout} className="text-destructive">
                  <LogOut className="h-5 w-5 mr-2" />
                  <span>Log out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1 overflow-auto">
          <div className="flex h-14 items-center border-b px-4 bg-background lg:hidden">
            <SidebarTrigger />
            <h1 className="ml-4 font-semibold">TurnoHub</h1>
          </div>
          <div className="p-6 md:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
