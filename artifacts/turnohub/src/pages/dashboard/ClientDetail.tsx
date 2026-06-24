import { useGetClient } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Phone, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const clientId = Number(id);
  const { data: client, isLoading } = useGetClient(clientId, { query: { enabled: !!clientId } });

  if (isLoading) return (
    <div className="p-8 animate-pulse space-y-6">
      <div className="h-8 bg-muted w-1/4 rounded" />
      <div className="h-40 bg-muted rounded-xl" />
      <div className="h-64 bg-muted rounded-xl" />
    </div>
  );

  if (!client) return (
    <div className="p-8 text-muted-foreground">Cliente no encontrado.</div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/clients"><ArrowLeft className="mr-2 h-4 w-4" /> Volver a clientes</Link>
      </Button>

      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
          {client.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
          <p className="text-muted-foreground text-sm">
            Cliente desde {format(parseISO(client.createdAt), "MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        <Card className="col-span-1 border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Información de contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${client.email}`} className="hover:underline text-primary">{client.email}</a>
            </div>
            {client.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${client.phone}`} className="hover:underline">{client.phone}</a>
              </div>
            )}
            <div className="pt-4 mt-2 border-t flex justify-between text-center">
              <div className="flex-1 border-r pr-4">
                <p className="text-2xl font-bold">{client.totalAppointments}</p>
                <p className="text-xs text-muted-foreground">Visitas totales</p>
              </div>
              <div className="flex-1 pl-4">
                <p className="text-sm font-medium mt-1">
                  {client.lastAppointmentAt
                    ? format(parseISO(client.lastAppointmentAt), "d MMM yyyy", { locale: es })
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Última visita</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Historial de turnos</CardTitle>
          </CardHeader>
          <CardContent>
            {client.appointments && client.appointments.length > 0 ? (
              <div className="space-y-3">
                {client.appointments.map(apt => (
                  <Link key={apt.id} href={`/appointments/${apt.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/40 transition-colors cursor-pointer gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary font-semibold shrink-0">
                          <span className="text-[10px] uppercase">{format(parseISO(apt.date), "MMM", { locale: es })}</span>
                          <span className="text-base leading-none">{format(parseISO(apt.date), "d")}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">{apt.serviceName}</h4>
                          <div className="flex items-center text-xs text-muted-foreground gap-1 mt-0.5">
                            <Clock className="h-3 w-3" /> {apt.startTime.substring(0, 5)} hs
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-xs ${STATUS_COLORS[apt.status] ?? ""}`}>
                        {STATUS_LABELS[apt.status] ?? apt.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-muted-foreground">
                <p className="text-sm">Este cliente aún no tiene turnos.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
