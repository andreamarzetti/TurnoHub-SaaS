import { useGetAdminStats, useGetAdminProfessionals, getGetAdminProfessionalsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, Calendar, BadgeDollarSign } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

const STATUS_LABELS: Record<string, string> = {
  trial: "Prueba",
  active: "Activo",
  suspended: "Suspendido",
  cancelled: "Cancelado",
};

export default function AdminDashboard() {
  const { data: stats, isLoading: loadingStats } = useGetAdminStats();
  const params = { status: "active" };
  const { data: professionals, isLoading: loadingProfs } = useGetAdminProfessionals(params, {
    query: { queryKey: getGetAdminProfessionalsQueryKey(params) },
  });

  if (loadingStats || loadingProfs) {
    return (
      <div className="p-8 animate-pulse space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-muted rounded-xl" />)}
        </div>
        <div className="h-96 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel Super Admin</h1>
        <p className="text-muted-foreground text-sm mt-1">Estadísticas globales de la plataforma.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Profesionales</p>
              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
            <h2 className="text-3xl font-bold">{stats?.totalProfessionals || 0}</h2>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Suscripciones activas</p>
              <div className="h-10 w-10 bg-emerald-500/10 rounded-full flex items-center justify-center">
                <Activity className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
            <h2 className="text-3xl font-bold">{stats?.activeProfessionals || 0}</h2>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Turnos hoy</p>
              <div className="h-10 w-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <h2 className="text-3xl font-bold">{stats?.totalAppointmentsToday || 0}</h2>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Ingresos estimados (ARS)</p>
              <div className="h-10 w-10 bg-amber-500/10 rounded-full flex items-center justify-center">
                <BadgeDollarSign className="h-5 w-5 text-amber-500" />
              </div>
            </div>
            <h2 className="text-3xl font-bold">${stats?.totalRevenueThisMonth?.toLocaleString("es-AR") || 0}</h2>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Profesionales activos recientes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {professionals?.slice(0, 5).map(prof => (
              <div key={prof.id} className="px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {prof.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{prof.name}</h4>
                    <p className="text-xs text-muted-foreground">{prof.profession} · {prof.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="mb-1 capitalize">{STATUS_LABELS[prof.status] || prof.currentPlan || "Prueba"}</Badge>
                  <p className="text-xs text-muted-foreground">Desde {format(parseISO(prof.createdAt), "d MMM yyyy", { locale: es })}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
