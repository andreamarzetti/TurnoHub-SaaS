import { useGetMyAppointments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { Calendar as CalendarIcon, Clock, User } from "lucide-react";
import { Link } from "wouter";

export default function Appointments() {
  const { data: appointments, isLoading } = useGetMyAppointments();

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
        <p className="text-muted-foreground">View and manage all your appointments.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-16 animate-pulse bg-muted rounded-md" />)}
            </div>
          ) : appointments && appointments.length > 0 ? (
            <div className="space-y-4">
              {appointments.map(apt => (
                <Link key={apt.id} href={`/appointments/${apt.id}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center justify-center w-14 h-14 rounded-md bg-primary/10 text-primary font-medium shrink-0">
                        <span className="text-xs uppercase">{format(parseISO(apt.date), 'MMM')}</span>
                        <span className="text-xl leading-none">{format(parseISO(apt.date), 'dd')}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg">{apt.clientName}</h4>
                        <div className="flex items-center text-sm text-muted-foreground gap-3 mt-1">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {apt.startTime.substring(0, 5)} - {apt.endTime.substring(0, 5)}</span>
                          <span className="flex items-center gap-1"><User className="h-3 w-3" /> {apt.serviceName}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Badge className={getStatusColor(apt.status)} variant="outline">{apt.status}</Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
              <CalendarIcon className="h-12 w-12 mb-4 text-muted" />
              <p>No appointments found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
