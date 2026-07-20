import { useState } from "react";
import { useGetMyAppointments, getGetMyAppointmentsQueryKey } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-emerald-500",
  pending: "bg-amber-500",
  cancelled: "bg-red-400",
  completed: "bg-blue-500",
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmado",
  pending: "Pendiente",
  cancelled: "Cancelado",
  completed: "Completado",
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const params = { startDate: format(weekStart, "yyyy-MM-dd"), endDate: format(weekEnd, "yyyy-MM-dd") };
  const { data: appointments, isLoading } = useGetMyAppointments(params, {
    query: { queryKey: getGetMyAppointmentsQueryKey(params) },
  });

  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hours = Array.from({ length: 13 }).map((_, i) => i + 8);

  const today = new Date();

  const getAppointmentsForSlot = (date: Date, hour: number) => {
    if (!appointments) return [];
    const dateStr = format(date, "yyyy-MM-dd");
    return appointments.filter(a => {
      const aptHour = parseInt(a.startTime.split(":")[0]);
      return a.date === dateStr && aptHour === hour;
    });
  };

  const monthLabel = format(currentDate, "MMMM yyyy", { locale: es });
  const monthCapitalized = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendario</h1>
          <p className="text-muted-foreground text-sm">{monthCapitalized}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setCurrentDate(new Date())}>
            Hoy
          </Button>
          <div className="flex rounded-lg border overflow-hidden">
            <Button variant="ghost" size="icon" className="rounded-none h-8 w-8 border-r" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-none h-8 w-8" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[key]}`} />
            {label}
          </span>
        ))}
      </div>

      {/* Calendar grid */}
      <Card className="flex-1 overflow-hidden flex flex-col border-0 shadow-sm">
        {/* Day headers */}
        <div className="grid border-b shrink-0 bg-muted/30" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
          <div className="p-3 text-center border-r">
            <span className="text-xs text-muted-foreground">GMT-3</span>
          </div>
          {days.map((day, i) => {
            const isToday = isSameDay(day, today);
            return (
              <div key={i} className={`p-3 text-center border-r last:border-r-0 ${isToday ? "bg-primary/5" : ""}`}>
                <div className="text-xs uppercase text-muted-foreground font-medium">
                  {format(day, "EEE", { locale: es })}
                </div>
                <div className={`text-xl mt-0.5 font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                  {format(day, "d")}
                </div>
                {isToday && <div className="h-1 w-1 rounded-full bg-primary mx-auto mt-1" />}
              </div>
            );
          })}
        </div>

        {/* Time slots */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm">Cargando turnos...</span>
            </div>
          ) : (
            <div style={{ minWidth: "640px" }}>
              {hours.map(hour => (
                <div key={hour} className="border-b last:border-b-0 min-h-[72px]" style={{ display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)" }}>
                  <div className="p-2 border-r text-xs text-muted-foreground font-medium text-right pt-2 shrink-0 select-none">
                    {hour}:00
                  </div>
                  {days.map((day, i) => {
                    const slotApts = getAppointmentsForSlot(day, hour);
                    const isToday = isSameDay(day, today);
                    return (
                      <div key={i} className={`border-r last:border-r-0 p-1 hover:bg-muted/20 transition-colors ${isToday ? "bg-primary/[0.02]" : ""}`}>
                        {slotApts.map(apt => (
                          <Link key={apt.id} href={`/appointments/${apt.id}`}>
                            <div className={`mb-1 px-2 py-1 rounded-lg text-[11px] text-white cursor-pointer shadow-sm hover:brightness-110 transition-all ${STATUS_COLORS[apt.status] ?? "bg-gray-500"}`}>
                              <span className="font-bold block">{apt.startTime.substring(0, 5)}</span>
                              <span className="truncate block opacity-90">{apt.clientName}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {!isLoading && (!appointments || appointments.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No hay turnos esta semana</p>
          </div>
        </div>
      )}
    </div>
  );
}
