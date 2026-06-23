import { useGetClient } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Phone, Mail, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const clientId = Number(id);
  const { data: client, isLoading } = useGetClient(clientId, { query: { enabled: !!clientId }});

  if (isLoading) {
    return <div className="p-8 animate-pulse space-y-6">
      <div className="h-8 bg-muted w-1/4 rounded" />
      <div className="h-40 bg-muted rounded-xl" />
      <div className="h-64 bg-muted rounded-xl" />
    </div>;
  }

  if (!client) {
    return <div className="p-8">Client not found</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
        <Link href="/clients"><ArrowLeft className="mr-2 h-4 w-4" /> Back to clients</Link>
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
            <p className="text-muted-foreground">Client since {format(parseISO(client.createdAt), 'MMM yyyy')}</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a>
            </div>
            {client.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${client.phone}`} className="hover:underline">{client.phone}</a>
              </div>
            )}
            <div className="pt-4 mt-4 border-t flex justify-between">
              <div className="text-center flex-1 border-r pr-4">
                <p className="text-2xl font-bold">{client.totalAppointments}</p>
                <p className="text-xs text-muted-foreground">Total Visits</p>
              </div>
              <div className="text-center flex-1 pl-4">
                <p className="text-sm font-medium mt-1">{client.lastAppointmentAt ? format(parseISO(client.lastAppointmentAt), 'MMM dd, yyyy') : 'Never'}</p>
                <p className="text-xs text-muted-foreground">Last Visit</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Appointment History</CardTitle>
          </CardHeader>
          <CardContent>
            {client.appointments && client.appointments.length > 0 ? (
              <div className="space-y-4">
                {client.appointments.map(apt => (
                  <Link key={apt.id} href={`/appointments/${apt.id}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-md bg-muted text-foreground font-medium shrink-0">
                          <span className="text-[10px] uppercase text-muted-foreground">{format(parseISO(apt.date), 'MMM')}</span>
                          <span className="text-lg leading-none">{format(parseISO(apt.date), 'dd')}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold">{apt.serviceName}</h4>
                          <div className="flex items-center text-sm text-muted-foreground gap-2 mt-0.5">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {apt.startTime.substring(0, 5)}</span>
                          </div>
                        </div>
                      </div>
                      <Badge className={getStatusColor(apt.status)} variant="outline">{apt.status}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p>No appointment history.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
