import { useGetMyAvailability, useCreateAvailabilitySlot, useDeleteAvailabilitySlot, getGetMyAvailabilityQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash, Plus } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const DAYS = [
  "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"
];

const HOURS = Array.from({ length: 48 }).map((_, i) => {
  const hour = Math.floor(i / 2).toString().padStart(2, "0");
  const min = (i % 2 === 0) ? "00" : "30";
  return `${hour}:${min}:00`;
});

export default function Schedule() {
  const { data: availability, isLoading } = useGetMyAvailability();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createMutation = useCreateAvailabilitySlot();

  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [startTime, setStartTime] = useState("09:00:00");
  const [endTime, setEndTime] = useState("17:00:00");

  const handleAdd = () => {
    createMutation.mutate({ data: {
      dayOfWeek: Number(dayOfWeek),
      startTime,
      endTime
    }}, {
      onSuccess: () => {
        toast({ title: "✅ Horario agregado" });
        queryClient.invalidateQueries({ queryKey: getGetMyAvailabilityQueryKey() });
      },
      onError: () => toast({ title: "Error al agregar horario", variant: "destructive" })
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Horarios de atención</h1>
        <p className="text-muted-foreground text-sm mt-1">Configurá los días y horarios en que aceptás turnos.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agregar horario</CardTitle>
          <CardDescription>Seleccioná el día y el rango horario en que estás disponible.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 w-full sm:w-auto flex-1">
              <label className="text-sm font-medium">Día</label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((day, i) => <SelectItem key={i} value={i.toString()}>{day}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-full sm:w-auto flex-1">
              <label className="text-sm font-medium">Hora de inicio</label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOURS.map(h => <SelectItem key={h} value={h}>{h.substring(0, 5)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-full sm:w-auto flex-1">
              <label className="text-sm font-medium">Hora de fin</label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOURS.map(h => <SelectItem key={h} value={h}>{h.substring(0, 5)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} disabled={createMutation.isPending} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" /> Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {DAYS.map((day, dayIndex) => {
          const slots = availability?.filter(a => a.dayOfWeek === dayIndex) || [];
          if (!isLoading && slots.length === 0) return null;

          return (
            <Card key={dayIndex} className="border-0 shadow-sm">
              <CardHeader className="py-3 px-5 bg-muted/30 border-b rounded-t-xl">
                <CardTitle className="text-base font-semibold">{day}</CardTitle>
              </CardHeader>
              <CardContent className="py-4 px-5">
                {isLoading ? (
                  <div className="h-8 animate-pulse bg-muted rounded" />
                ) : (
                  <div className="space-y-2">
                    {slots.map(slot => (
                      <SlotRow key={slot.id} slot={slot} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {!isLoading && (!availability || availability.length === 0) && (
          <div className="text-center py-12 text-muted-foreground border-2 rounded-2xl border-dashed flex flex-col items-center gap-2">
            <p className="font-medium">Todavía no configuraste horarios</p>
            <p className="text-sm">Agregá tu primer horario de atención arriba.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SlotRow({ slot }: { slot: any }) {
  const deleteMutation = useDeleteAvailabilitySlot(slot.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = () => {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Horario eliminado" });
        queryClient.invalidateQueries({ queryKey: getGetMyAvailabilityQueryKey() });
      }
    });
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-xl border bg-card">
      <div className="font-semibold text-base tracking-tight">
        {slot.startTime.substring(0, 5)} – {slot.endTime.substring(0, 5)} hs
      </div>
      <Button variant="ghost" size="icon" onClick={handleDelete} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
        <Trash className="h-4 w-4" />
      </Button>
    </div>
  );
}
