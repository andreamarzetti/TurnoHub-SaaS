import { useGetAppointment, useUpdateAppointment, useCancelAppointment, getGetAppointmentQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Calendar, Clock, User, FileText, CheckCircle2, XCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function AppointmentDetail() {
  const { id } = useParams<{ id: string }>();
  const appointmentId = Number(id);
  const { data: apt, isLoading } = useGetAppointment(appointmentId, { query: { enabled: !!appointmentId } });
  
  const updateMutation = useUpdateAppointment(appointmentId);
  const cancelMutation = useCancelAppointment(appointmentId);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (isLoading) return <div className="p-8 animate-pulse space-y-6"><div className="h-8 bg-muted w-1/4 rounded"></div><div className="h-64 bg-muted rounded-xl"></div></div>;
  if (!apt) return <div className="p-8">Appointment not found</div>;

  const handleStatusUpdate = (status: "confirmed" | "completed") => {
    updateMutation.mutate({ data: { status } }, {
      onSuccess: () => {
        toast({ title: `Appointment marked as ${status}` });
        queryClient.invalidateQueries({ queryKey: getGetAppointmentQueryKey(appointmentId) });
      }
    });
  };

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel this appointment?")) {
      cancelMutation.mutate(undefined, {
        onSuccess: () => {
          toast({ title: "Appointment cancelled" });
          queryClient.invalidateQueries({ queryKey: getGetAppointmentQueryKey(appointmentId) });
        }
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
        <Link href="/appointments"><ArrowLeft className="mr-2 h-4 w-4" /> Back to appointments</Link>
      </Button>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Appointment Details</h1>
        <Badge className={getStatusColor(apt.status)} variant="outline" size="lg">{apt.status.toUpperCase()}</Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Client Info</h3>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {apt.clientName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{apt.clientName}</p>
                    <p className="text-sm text-muted-foreground">{apt.clientEmail}</p>
                    {apt.clientPhone && <p className="text-sm text-muted-foreground">{apt.clientPhone}</p>}
                  </div>
                </div>
                {apt.clientId && (
                  <Button variant="link" size="sm" className="px-0 mt-2 h-auto" asChild>
                    <Link href={`/clients/${apt.clientId}`}>View client profile</Link>
                  </Button>
                )}
              </div>
              
              {apt.notes && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2 uppercase tracking-wider">
                    <FileText className="h-4 w-4" /> Notes
                  </h3>
                  <div className="bg-muted/50 p-3 rounded-md text-sm">
                    {apt.notes}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Appointment Info</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">{format(parseISO(apt.date), 'EEEE, MMMM dd, yyyy')}</p>
                      <p className="text-sm text-muted-foreground">Date</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">{apt.startTime.substring(0, 5)} - {apt.endTime.substring(0, 5)}</p>
                      <p className="text-sm text-muted-foreground">Time</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">{apt.serviceName}</p>
                      <p className="text-sm text-muted-foreground">Service</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        {apt.status !== 'cancelled' && apt.status !== 'completed' && (
          <CardFooter className="border-t p-6 bg-muted/10 flex flex-wrap gap-3">
            {apt.status === 'pending' && (
              <Button onClick={() => handleStatusUpdate('confirmed')} disabled={updateMutation.isPending}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Confirm
              </Button>
            )}
            {apt.status === 'confirmed' && (
              <Button onClick={() => handleStatusUpdate('completed')} disabled={updateMutation.isPending}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Completed
              </Button>
            )}
            <Button variant="destructive" onClick={handleCancel} disabled={cancelMutation.isPending}>
              <XCircle className="mr-2 h-4 w-4" /> Cancel Appointment
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
