import { useGetAppointment, useUpdateAppointment, getGetAppointmentQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Calendar, Clock, Scissors, FileText, CheckCircle2, XCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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

export default function AppointmentDetail() {
  const { id } = useParams<{ id: string }>();
  const appointmentId = Number(id);
  const queryKey = getGetAppointmentQueryKey(appointmentId);
  const { data: apt, isLoading } = useGetAppointment(appointmentId, {
    query: { enabled: !!appointmentId, queryKey },
  });

  const updateMutation = useUpdateAppointment();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (isLoading) return (
    <div className="p-8 animate-pulse space-y-6">
      <div className="h-8 bg-muted w-1/4 rounded" />
      <div className="h-64 bg-muted rounded-xl" />
    </div>
  );

  if (!apt) return (
    <div className="p-8 text-muted-foreground">Turno no encontrado.</div>
  );

  const handleStatusUpdate = (status: "confirmed" | "completed") => {
    const label = status === "confirmed" ? "confirmado" : "completado";
    updateMutation.mutate({ appointmentId, data: { status } }, {
      onSuccess: () => {
        toast({ title: `✅ Turno marcado como ${label}` });
        queryClient.invalidateQueries({ queryKey: getGetAppointmentQueryKey(appointmentId) });
      }
    });
  };

  const handleCancel = () => {
    if (confirm("¿Seguro que querés cancelar este turno?")) {
      updateMutation.mutate({ appointmentId, data: { status: "cancelled" } }, {
        onSuccess: () => {
          toast({ title: "Turno cancelado" });
          queryClient.invalidateQueries({ queryKey: getGetAppointmentQueryKey(appointmentId) });
        }
      });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/appointments"><ArrowLeft className="mr-2 h-4 w-4" /> Volver a turnos</Link>
      </Button>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Detalle del turno</h1>
        <Badge variant="outline" className={`text-sm px-3 py-1 ${STATUS_COLORS[apt.status] ?? ""}`}>
          {STATUS_LABELS[apt.status] ?? apt.status}
        </Badge>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
            {/* Cliente */}
            <div className="p-6 space-y-5">
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Datos del cliente</h3>
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {apt.clientName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{apt.clientName}</p>
                    <p className="text-sm text-muted-foreground">{apt.clientEmail}</p>
                    {apt.clientPhone && <p className="text-sm text-muted-foreground">{apt.clientPhone}</p>}
                  </div>
                </div>
                {apt.clientId && (
                  <Button variant="link" size="sm" className="px-0 mt-2 h-auto text-primary" asChild>
                    <Link href={`/clients/${apt.clientId}`}>Ver perfil del cliente →</Link>
                  </Button>
                )}
              </div>

              {apt.notes && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                    <FileText className="h-3.5 w-3.5" /> Notas
                  </h3>
                  <div className="bg-muted/50 p-3 rounded-xl text-sm italic">
                    {apt.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Turno */}
            <div className="p-6 space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Información del turno</h3>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold capitalize">
                    {format(parseISO(apt.date), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
                  </p>
                  <p className="text-xs text-muted-foreground">Fecha</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">{apt.startTime.substring(0, 5)} – {apt.endTime.substring(0, 5)} hs</p>
                  <p className="text-xs text-muted-foreground">Horario</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Scissors className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">{apt.serviceName}</p>
                  <p className="text-xs text-muted-foreground">Servicio</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>

        {apt.status !== "cancelled" && apt.status !== "completed" && (
          <CardFooter className="border-t p-5 bg-muted/10 flex flex-wrap gap-3">
            {apt.status === "pending" && (
              <Button onClick={() => handleStatusUpdate("confirmed")} disabled={updateMutation.isPending}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar turno
              </Button>
            )}
            {apt.status === "confirmed" && (
              <Button onClick={() => handleStatusUpdate("completed")} disabled={updateMutation.isPending}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Marcar como completado
              </Button>
            )}
            <Button variant="destructive" onClick={handleCancel} disabled={updateMutation.isPending}>
              <XCircle className="mr-2 h-4 w-4" /> Cancelar turno
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
