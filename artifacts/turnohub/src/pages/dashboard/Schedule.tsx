import { useGetMyAvailability, useCreateAvailabilitySlot, useDeleteAvailabilitySlot, getGetMyAvailabilityQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash, Plus } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const DAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

// Generate hours from 00:00 to 23:30
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
        toast({ title: "Slot added" });
        queryClient.invalidateQueries({ queryKey: getGetMyAvailabilityQueryKey() });
      },
      onError: () => toast({ title: "Failed to add slot", variant: "destructive" })
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
        <p className="text-muted-foreground">Set your regular working hours.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Availability Slot</CardTitle>
          <CardDescription>Select a day and time range when you are available for bookings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 w-full sm:w-auto flex-1">
              <label className="text-sm font-medium">Day</label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((day, i) => <SelectItem key={i} value={i.toString()}>{day}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-full sm:w-auto flex-1">
              <label className="text-sm font-medium">Start Time</label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOURS.map(h => <SelectItem key={h} value={h}>{h.substring(0, 5)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-full sm:w-auto flex-1">
              <label className="text-sm font-medium">End Time</label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOURS.map(h => <SelectItem key={h} value={h}>{h.substring(0, 5)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} disabled={createMutation.isPending} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 mt-8">
        {DAYS.map((day, dayIndex) => {
          const slots = availability?.filter(a => a.dayOfWeek === dayIndex) || [];
          if (!isLoading && slots.length === 0) return null;
          
          return (
            <Card key={dayIndex}>
              <CardHeader className="py-4 bg-muted/30 border-b">
                <CardTitle className="text-lg">{day}</CardTitle>
              </CardHeader>
              <CardContent className="py-4">
                {isLoading ? (
                  <div className="h-8 animate-pulse bg-muted rounded" />
                ) : (
                  <div className="space-y-3">
                    {slots.map(slot => (
                      <SlotRow key={slot.id} slot={slot} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {!isLoading && availability?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
            You haven't set any availability yet. Add slots above.
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
        toast({ title: "Slot removed" });
        queryClient.invalidateQueries({ queryKey: getGetMyAvailabilityQueryKey() });
      }
    });
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-md border bg-card">
      <div className="font-medium text-lg tracking-tight">
        {slot.startTime.substring(0, 5)} - {slot.endTime.substring(0, 5)}
      </div>
      <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive hover:text-destructive hover:bg-destructive/10">
        <Trash className="h-4 w-4" />
      </Button>
    </div>
  );
}
