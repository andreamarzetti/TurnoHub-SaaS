import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";

import { PublicLayout } from "@/components/layout/PublicLayout";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";

import Landing from "@/pages/public/Landing";
import Login from "@/pages/public/Login";
import Register from "@/pages/public/Register";
import Onboarding from "@/pages/public/Onboarding";
import PublicBooking from "@/pages/public/PublicBooking";

import Dashboard from "@/pages/dashboard/Dashboard";
import Appointments from "@/pages/dashboard/Appointments";
import AppointmentDetail from "@/pages/dashboard/AppointmentDetail";
import Clients from "@/pages/dashboard/Clients";
import ClientDetail from "@/pages/dashboard/ClientDetail";
import Schedule from "@/pages/dashboard/Schedule";
import Services from "@/pages/dashboard/Services";
import Settings from "@/pages/dashboard/Settings";
import Subscription from "@/pages/dashboard/Subscription";
import Calendar from "@/pages/dashboard/Calendar";
import Suspended from "@/pages/dashboard/Suspended";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminProfessionals from "@/pages/admin/AdminProfessionals";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/">
        {() => <PublicLayout><Landing /></PublicLayout>}
      </Route>
      <Route path="/login">
        {() => <PublicLayout><Login /></PublicLayout>}
      </Route>
      <Route path="/register">
        {() => <PublicLayout><Register /></PublicLayout>}
      </Route>
      <Route path="/booking/:slug" component={PublicBooking} />

      {/* Onboarding (standalone, no sidebar) */}
      <Route path="/onboarding">
        {() => <Onboarding />}
      </Route>

      {/* Suspended / trial expired (standalone) */}
      <Route path="/suscripcion-vencida">
        {() => <Suspended />}
      </Route>

      {/* Professional Routes (protected: professional + onboarded + not suspended) */}
      <Route path="/dashboard">
        {() => <DashboardLayout><Dashboard /></DashboardLayout>}
      </Route>
      <Route path="/calendar">
        {() => <DashboardLayout><Calendar /></DashboardLayout>}
      </Route>
      <Route path="/appointments">
        {() => <DashboardLayout><Appointments /></DashboardLayout>}
      </Route>
      <Route path="/appointments/:id">
        {() => <DashboardLayout><AppointmentDetail /></DashboardLayout>}
      </Route>
      <Route path="/services">
        {() => <DashboardLayout><Services /></DashboardLayout>}
      </Route>
      <Route path="/schedule">
        {() => <DashboardLayout><Schedule /></DashboardLayout>}
      </Route>
      <Route path="/clients">
        {() => <DashboardLayout><Clients /></DashboardLayout>}
      </Route>
      <Route path="/clients/:id">
        {() => <DashboardLayout><ClientDetail /></DashboardLayout>}
      </Route>
      <Route path="/settings">
        {() => <DashboardLayout><Settings /></DashboardLayout>}
      </Route>
      <Route path="/suscripcion">
        {() => <DashboardLayout><Subscription /></DashboardLayout>}
      </Route>

      {/* Admin Routes (protected: super_admin only) */}
      <Route path="/admin">
        {() => <AdminLayout><AdminDashboard /></AdminLayout>}
      </Route>
      <Route path="/admin/professionals">
        {() => <AdminLayout><AdminProfessionals /></AdminLayout>}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
