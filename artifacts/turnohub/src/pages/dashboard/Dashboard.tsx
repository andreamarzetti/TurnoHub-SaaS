import { useGetDashboardSummary, useGetUpcomingAppointments, useGetRecentClients, useGetAppointmentsByDay } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, Users, Clock, TrendingUp, ArrowRight, CheckCircle2, AlertCircle, Share2 } from "lucide-react";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmado",
  pending: "Pendiente",
  cancelled: "Cancelado",
  completed: "Completado",
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  completed: "bg-blue-100 text-blue-700 border-blue-200",
};

export default function Dashboard() {
  const { user } = useAuth();
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: upcoming, isLoading: loadingUpcoming } = useGetUpcomingAppointments({ query: { limit: 5 } });
  const { data: chartData, isLoading: loadingChart } = useGetAppointmentsByDay();

  const firstName = user?.name?.split(" ")[0] ?? "Profesional";
  const today = format(new Date(), "EEEE d 'de' MMMM", { locale: es });
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);

  const metricCards = [
    {
      label: "Turnos hoy",
      value: summary?.totalAppointmentsToday ?? 0,
      icon: Calendar,
      color: "text-primary",
      bg: "bg-primary/10",
      trend: null,
    },
    {
      label: "Pendientes",
      value: summary?.pendingAppointments ?? 0,
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      trend: null,
    },
    {
      label: "Clientes activos",
      value: summary?.totalClients ?? 0,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      trend: null,
    },
    {
      label: "Tasa de cancelación",
      value: `${(summary?.cancellationRate ?? 0).toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
      trend: null,
    },
  ];

  if (loadingSummary || loadingUpcoming || loadingChart) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-muted rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-muted rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="col-span-2 h-80 bg-muted rounded-2xl" />
          <div className="h-80 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-2xl border border-primary/10">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{todayCapitalized}</p>
          <h1 className="text-2xl font-bold">¡Hola, {firstName}! 👋</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {summary?.totalAppointmentsToday
              ? `Tenés ${summary.totalAppointmentsToday} turno${summary.totalAppointmentsToday !== 1 ? "s" : ""} hoy.`
              : "No tenés turnos agendados para hoy."}
          </p>
        </div>
        {user?.professional?.slug && (
          <Button variant="outline" className="shrink-0 gap-2" asChild>
            <a href={`/booking/${user.professional.slug}`} target="_blank" rel="noopener noreferrer">
              <Share2 className="h-4 w-4" />
              Tu link de reservas
            </a>
          </Button>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((m) => (
          <Card key={m.label} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">{m.label}</p>
                <div className={`h-9 w-9 ${m.bg} rounded-xl flex items-center justify-center`}>
                  <m.icon className={`h-4 w-4 ${m.color}`} />
                </div>
              </div>
              <p className="text-3xl font-bold tracking-tight">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="col-span-1 lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-base font-semibold">Turnos por día</CardTitle>
            <CardDescription>Últimos 30 días</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64 w-full">
              {chartData && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="dayLabel"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      dy={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted))", radius: 4 }}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid hsl(var(--border))",
                        backgroundColor: "hsl(var(--card))",
                        fontSize: "12px",
                      }}
                      formatter={(v: any) => [v, "Turnos"]}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground border border-dashed rounded-xl gap-2">
                  <Calendar className="h-8 w-8 opacity-30" />
                  <p className="text-sm">Aún no hay turnos para mostrar</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Próximos turnos</CardTitle>
              <CardDescription>Los siguientes agendados</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-primary text-xs gap-1" asChild>
              <Link href="/appointments">
                Ver todos <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {upcoming && upcoming.length > 0 ? (
              <div className="space-y-2">
                {upcoming.map(apt => (
                  <Link key={apt.id} href={`/appointments/${apt.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-colors cursor-pointer group">
                      <div className="flex flex-col items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary font-semibold shrink-0">
                        <span className="text-[10px] uppercase">{format(parseISO(apt.date), "MMM", { locale: es })}</span>
                        <span className="text-base leading-tight">{format(parseISO(apt.date), "d")}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{apt.clientName}</p>
                        <p className="text-xs text-muted-foreground truncate">{apt.serviceName} · {apt.startTime.substring(0, 5)}</p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${STATUS_COLORS[apt.status] ?? ""}`}>
                        {STATUS_LABELS[apt.status] ?? apt.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                <CheckCircle2 className="h-8 w-8 opacity-30" />
                <p className="text-sm">No hay turnos próximos</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
