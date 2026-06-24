import { useGetMyAppointments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock, Scissors } from "lucide-react";
import { Link } from "wouter";

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

export default function Appointments() {
  const { data: appointments, isLoading } = useGetMyAppointments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Turnos</h1>
        <p className="text-muted-foreground text-sm mt-1">Visualizá y gestioná todos tus turnos agendados.</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b bg-muted/20 rounded-t-xl">
          <CardTitle className="text-base font-semibold">Todos los turnos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-1 p-4">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 animate-pulse bg-muted rounded-xl" />)}
            </div>
          ) : appointments && appointments.length > 0 ? (
            <div className="divide-y">
              {appointments.map(apt => (
                <Link key={apt.id} href={`/appointments/${apt.id}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-4 hover:bg-muted/40 transition-colors cursor-pointer gap-3">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-primary/10 text-primary font-semibold shrink-0">
                        <span className="text-[10px] uppercase">{format(parseISO(apt.date), "MMM", { locale: es })}</span>
                        <span className="text-xl leading-tight">{format(parseISO(apt.date), "dd")}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold">{apt.clientName}</h4>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {apt.startTime.substring(0, 5)} – {apt.endTime.substring(0, 5)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Scissors className="h-3 w-3" /> {apt.serviceName}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={`self-start sm:self-auto text-xs ${STATUS_COLORS[apt.status] ?? ""}`}>
                      {STATUS_LABELS[apt.status] ?? apt.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                <CalendarIcon className="h-7 w-7 opacity-40" />
              </div>
              <div>
                <p className="font-medium">No hay turnos registrados</p>
                <p className="text-sm mt-1">Los turnos aparecerán aquí cuando los clientes reserven.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
