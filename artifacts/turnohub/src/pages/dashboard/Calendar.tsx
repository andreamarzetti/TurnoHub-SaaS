import { useState } from "react";
import { useGetMyAppointments } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addWeeks, subWeeks, startOfMonth, endOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Weekly view for simplicity in this demo
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  
  const { data: appointments, isLoading } = useGetMyAppointments({
    query: { startDate: format(weekStart, 'yyyy-MM-dd'), endDate: format(weekEnd, 'yyyy-MM-dd') }
  });

  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hours = Array.from({ length: 13 }).map((_, i) => i + 8); // 8 AM to 8 PM

  const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const today = () => setCurrentDate(new Date());

  const getAppointmentsForSlot = (date: Date, hour: number) => {
    if (!appointments) return [];
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter(a => {
      const aptHour = parseInt(a.startTime.split(':')[0]);
      return a.date === dateStr && aptHour === hour;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500 text-white';
      case 'pending': return 'bg-yellow-500 text-white';
      case 'cancelled': return 'bg-red-500 text-white';
      case 'completed': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">{format(weekStart, 'MMMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={today}>Today</Button>
          <div className="flex items-center">
            <Button variant="outline" size="icon" className="rounded-r-none" onClick={prevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="rounded-l-none border-l-0" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <div className="grid grid-cols-8 border-b shrink-0 bg-muted/30">
          <div className="p-3 text-center border-r font-medium text-sm text-muted-foreground">GMT-3</div>
          {days.map((day, i) => (
            <div key={i} className={`p-3 text-center border-r last:border-r-0 ${isSameDay(day, new Date()) ? 'bg-primary/5' : ''}`}>
              <div className="text-xs uppercase text-muted-foreground font-medium">{format(day, 'EEE')}</div>
              <div className={`text-xl mt-1 ${isSameDay(day, new Date()) ? 'text-primary font-bold' : ''}`}>{format(day, 'd')}</div>
            </div>
          ))}
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">Loading calendar...</div>
          ) : (
            <div className="relative min-w-[800px]">
              {hours.map(hour => (
                <div key={hour} className="grid grid-cols-8 border-b last:border-b-0 min-h-[80px]">
                  <div className="p-2 border-r text-xs text-muted-foreground font-medium text-right shrink-0">
                    {hour}:00
                  </div>
                  {days.map((day, i) => {
                    const slotApts = getAppointmentsForSlot(day, hour);
                    return (
                      <div key={i} className="border-r last:border-r-0 relative group hover:bg-muted/10 transition-colors p-1">
                        {slotApts.map(apt => (
                          <Link key={apt.id} href={`/appointments/${apt.id}`}>
                            <div className={`mb-1 p-1.5 rounded text-xs truncate cursor-pointer shadow-sm border border-black/10 ${getStatusColor(apt.status)}`}>
                              <span className="font-semibold block">{apt.startTime.substring(0,5)}</span>
                              {apt.clientName}
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
    </div>
  );
}
