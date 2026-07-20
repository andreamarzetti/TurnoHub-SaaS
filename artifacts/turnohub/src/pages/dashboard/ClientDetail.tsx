import { useGetClient, getGetClientQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Phone, Mail, Calendar, Clock, User } from "lucide-react";

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
  const qk = getGetClientQueryKey(clientId);
  const { data: client, isLoading } = useGetClient(clientId, {
    query: { enabled: !!clientId, queryKey: qk },
  });

  if (isLoading) return (
    <div className="p-8 animate-pulse space-y-6">
      <div className="h-8 bg-muted w-1/4 rounded" />
      <div className="h-40 bg-muted rounded-xl" />
      <div className="h-64 bg-muted rounded-xl" />
    </div>
  );

  if (!client) return <div className="p-8 text-muted-foreground">Cliente no encontrado.</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/clients"><ArrowLeft className="mr-2 h-4 w-4" /> Volver a clientes</Link>
      </Button>

      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
          {client.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
          <p className="text-sm text-muted-foreground">
            {client.totalAppointments} {client.totalAppointments === 1 ? "turno" : "turnos"} en total
          </p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Datos de contacto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium">{client.name}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <a href={`mailto:${client.email}`} className="text-primary hover:underline">{client.email}</a>
          </div>
          {client.phone && (
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={`tel:${client.phone}`} className="hover:text-primary transition-colors">{client.phone}</a>
            </div>
          )}
          {client.lastAppointmentAt && (
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">
                Última visita: <span className="font-medium text-foreground">
                  {format(parseISO(client.lastAppointmentAt), "d 'de' MMMM 'de' yyyy", { locale: es })}
                </span>
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">
              Cliente desde: <span className="font-medium text-foreground">
                {format(parseISO(client.createdAt), "d 'de' MMMM 'de' yyyy", { locale: es })}
              </span>
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Historial de turnos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {client.appointments && client.appointments.length > 0 ? (
            <div className="divide-y">
              {client.appointments.map(apt => (
                <Link key={apt.id} href={`/appointments/${apt.id}`}>
                  <div className="flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary font-semibold shrink-0 text-sm">
                        <span className="text-[9px] uppercase">{format(parseISO(apt.date), "MMM", { locale: es })}</span>
                        <span className="text-sm leading-tight">{format(parseISO(apt.date), "d")}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{apt.serviceName}</p>
                        <p className="text-xs text-muted-foreground">{apt.startTime.substring(0, 5)} hs</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[apt.status] ?? ""}`}>
                      {STATUS_LABELS[apt.status] ?? apt.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <p>Sin historial de turnos.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
