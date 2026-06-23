import { useGetAdminStats, useGetAdminProfessionals } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building, BadgeDollarSign, Activity } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboard() {
  const { data: stats, isLoading: loadingStats } = useGetAdminStats();
  const { data: professionals, isLoading: loadingProfs } = useGetAdminProfessionals({ query: { status: 'active' } });

  if (loadingStats || loadingProfs) {
    return <div className="p-8 animate-pulse space-y-6">
      <div className="grid grid-cols-4 gap-4"><div className="h-32 bg-muted rounded-xl" /><div className="h-32 bg-muted rounded-xl" /><div className="h-32 bg-muted rounded-xl" /><div className="h-32 bg-muted rounded-xl" /></div>
      <div className="h-96 bg-muted rounded-xl" />
    </div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform-wide statistics and management.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Total Professionals</p>
              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
            <h2 className="text-3xl font-bold">{stats?.totalProfessionals || 0}</h2>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Active Subscriptions</p>
              <div className="h-10 w-10 bg-green-500/10 rounded-full flex items-center justify-center">
                <Activity className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <h2 className="text-3xl font-bold">{stats?.activeProfessionals || 0}</h2>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Total Appointments Today</p>
              <div className="h-10 w-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                <Building className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <h2 className="text-3xl font-bold">{stats?.totalAppointmentsToday || 0}</h2>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Estimated Revenue (ARS)</p>
              <div className="h-10 w-10 bg-amber-500/10 rounded-full flex items-center justify-center">
                <BadgeDollarSign className="h-5 w-5 text-amber-500" />
              </div>
            </div>
            <h2 className="text-3xl font-bold">${stats?.totalRevenueThisMonth?.toLocaleString() || 0}</h2>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Active Professionals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y border rounded-lg">
            {professionals?.slice(0, 5).map(prof => (
              <div key={prof.id} className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{prof.name}</h4>
                  <p className="text-sm text-muted-foreground">{prof.profession} • {prof.email}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="mb-1">{prof.currentPlan || "Free"}</Badge>
                  <p className="text-xs text-muted-foreground">Joined {format(parseISO(prof.createdAt), 'MMM dd, yyyy')}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
