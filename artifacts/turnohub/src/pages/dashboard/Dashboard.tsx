import { useGetDashboardSummary, useGetUpcomingAppointments, useGetRecentClients, useGetAppointmentsByDay } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, Users, ListOrdered, CheckCircle2, TrendingDown } from "lucide-react";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: upcoming, isLoading: loadingUpcoming } = useGetUpcomingAppointments({ query: { limit: 5 } });
  const { data: recentClients, isLoading: loadingClients } = useGetRecentClients();
  const { data: chartData, isLoading: loadingChart } = useGetAppointmentsByDay();

  if (loadingSummary || loadingUpcoming || loadingClients || loadingChart) {
    return <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => <Card key={i} className="h-32 animate-pulse bg-muted" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-2 h-96 animate-pulse bg-muted" />
        <Card className="h-96 animate-pulse bg-muted" />
      </div>
    </div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Here's an overview of your schedule and clients.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Today's Appointments</p>
              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-bold">{summary?.totalAppointmentsToday || 0}</h2>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Pending</p>
              <div className="h-10 w-10 bg-amber-500/10 rounded-full flex items-center justify-center">
                <ListOrdered className="h-5 w-5 text-amber-500" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-bold">{summary?.pendingAppointments || 0}</h2>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
              <div className="h-10 w-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-bold">{summary?.totalClients || 0}</h2>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Cancellation Rate</p>
              <div className="h-10 w-10 bg-destructive/10 rounded-full flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-bold">{(summary?.cancellationRate || 0).toFixed(1)}%</h2>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Appointments Over Time</CardTitle>
            <CardDescription>Your appointment volume for the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {chartData && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="dayLabel" 
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground border border-dashed rounded-lg">
                  No data available yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Upcoming</CardTitle>
              <CardDescription>Next appointments</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/appointments">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcoming && upcoming.length > 0 ? (
              <div className="space-y-4 mt-4">
                {upcoming.map(apt => (
                  <Link key={apt.id} href={`/appointments/${apt.id}`}>
                    <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border cursor-pointer">
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-md bg-primary/10 text-primary font-medium shrink-0">
                        <span className="text-xs">{format(parseISO(apt.date), 'MMM')}</span>
                        <span className="text-lg leading-none">{format(parseISO(apt.date), 'dd')}</span>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="font-medium truncate">{apt.clientName}</p>
                        <p className="text-sm text-muted-foreground truncate">{apt.serviceName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium">{apt.startTime.substring(0, 5)}</p>
                        <p className="text-xs text-muted-foreground">{apt.status}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p>No upcoming appointments</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
