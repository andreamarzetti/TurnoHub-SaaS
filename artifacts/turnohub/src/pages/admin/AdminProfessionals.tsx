import { useGetAdminProfessionals } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

export default function AdminProfessionals() {
  const { data: professionals, isLoading } = useGetAdminProfessionals();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Professionals Directory</h1>
        <p className="text-muted-foreground">Manage all professionals on the platform.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y border rounded-lg">
            {isLoading ? (
               <div className="p-6 text-center text-muted-foreground animate-pulse">Loading...</div>
            ) : professionals?.map(prof => (
              <div key={prof.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-lg">{prof.name}</h4>
                    <Badge variant={prof.status === 'active' ? 'default' : 'secondary'}>{prof.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{prof.profession} • {prof.email}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-right shrink-0">
                  <div>
                    <p className="text-muted-foreground">Plan</p>
                    <p className="font-medium uppercase text-xs mt-1">{prof.currentPlan || "Trial"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Clients</p>
                    <p className="font-medium">{prof.totalClients}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Appointments</p>
                    <p className="font-medium">{prof.totalAppointments}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Joined</p>
                    <p className="font-medium">{format(parseISO(prof.createdAt), 'MMM dd, yyyy')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
