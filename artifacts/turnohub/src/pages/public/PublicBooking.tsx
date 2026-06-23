import { useState } from "react";
import { useParams } from "wouter";
import { useGetPublicProfile, useGetAvailableSlots, useCreateBooking } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Instagram, Phone, Calendar as CalendarIcon, Clock, CheckCircle2 } from "lucide-react";
import { format, addDays, startOfToday } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function PublicBooking() {
  const { slug } = useParams<{ slug: string }>();
  const { data: profile, isLoading: loadingProfile } = useGetPublicProfile(slug as string, { query: { enabled: !!slug } });
  
  const [step, setStep] = useState<"service" | "datetime" | "form" | "success">("service");
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  // Date formatting for API
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  
  const { data: slots, isLoading: loadingSlots } = useGetAvailableSlots(
    slug as string, 
    { date: dateStr, serviceId: selectedService || 0 },
    { query: { enabled: !!slug && !!selectedService && step === "datetime" } }
  );

  const createBooking = useCreateBooking(slug as string);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: ""
  });

  if (loadingProfile) return <PublicLayout><div className="flex-1 flex items-center justify-center p-8 animate-pulse text-muted-foreground">Loading profile...</div></PublicLayout>;
  if (!profile) return <PublicLayout><div className="flex-1 flex items-center justify-center p-8">Professional not found</div></PublicLayout>;

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedTime) return;

    createBooking.mutate({ data: {
      serviceId: selectedService,
      date: dateStr,
      startTime: selectedTime,
      clientName: formData.name,
      clientEmail: formData.email,
      clientPhone: formData.phone,
      notes: formData.notes
    }}, {
      onSuccess: () => {
        setStep("success");
      },
      onError: () => {
        toast({ title: "Booking failed", description: "Please try again.", variant: "destructive" });
      }
    });
  };

  // Generate next 14 days for selection
  const availableDates = Array.from({ length: 14 }).map((_, i) => addDays(startOfToday(), i));

  return (
    <PublicLayout>
      <div className="bg-primary pt-16 pb-32 px-4 relative overflow-hidden">
        {/* Abstract background shape */}
        <div className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 w-[800px] h-[800px] rounded-full bg-white/5 opacity-50 blur-3xl pointer-events-none" />
        
        <div className="container mx-auto max-w-4xl relative z-10">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-primary-foreground">
            <div className="h-24 w-24 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center text-3xl font-bold shadow-lg">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-4xl font-bold tracking-tight mb-2">{profile.name}</h1>
              <p className="text-primary-foreground/80 text-xl">{profile.profession}</p>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4 text-sm text-primary-foreground/90">
                {profile.city && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {profile.city}</span>}
                {profile.instagramUrl && <span className="flex items-center gap-1.5"><Instagram className="h-4 w-4" /> {profile.instagramUrl.replace('https://instagram.com/', '@')}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 -mt-20 relative z-20 pb-20">
        {step === "success" ? (
          <Card className="shadow-xl border-0 overflow-hidden text-center py-16">
            <CardContent className="flex flex-col items-center">
              <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-2">Booking Confirmed!</h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-8">
                Your appointment with {profile.name} has been successfully scheduled. We've sent a confirmation email with details.
              </p>
              <Button onClick={() => setStep("service")}>Book Another Appointment</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <Card className="shadow-xl border-0 overflow-hidden">
                <div className="flex border-b bg-muted/30">
                  <div className={`flex-1 p-4 text-center text-sm font-medium ${step === "service" ? "text-primary border-b-2 border-primary bg-background" : "text-muted-foreground"}`}>
                    1. Service
                  </div>
                  <div className={`flex-1 p-4 text-center text-sm font-medium ${step === "datetime" ? "text-primary border-b-2 border-primary bg-background" : "text-muted-foreground"}`}>
                    2. Date & Time
                  </div>
                  <div className={`flex-1 p-4 text-center text-sm font-medium ${step === "form" ? "text-primary border-b-2 border-primary bg-background" : "text-muted-foreground"}`}>
                    3. Details
                  </div>
                </div>

                <CardContent className="p-6">
                  {step === "service" && (
                    <div className="space-y-4 animate-in fade-in">
                      <h3 className="text-lg font-semibold mb-4">Select a service</h3>
                      {profile.services.length === 0 ? (
                        <p className="text-muted-foreground">No services available.</p>
                      ) : (
                        <div className="space-y-3">
                          {profile.services.map(service => (
                            <div 
                              key={service.id} 
                              className={`border rounded-lg p-4 cursor-pointer transition-all hover:border-primary/50 flex justify-between items-center ${selectedService === service.id ? 'border-primary ring-1 ring-primary bg-primary/5' : ''}`}
                              onClick={() => setSelectedService(service.id)}
                            >
                              <div>
                                <h4 className="font-semibold">{service.name}</h4>
                                <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                                <div className="flex items-center gap-3 mt-2 text-sm font-medium">
                                  <span className="text-primary">${service.price}</span>
                                  <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {service.duration} min</span>
                                </div>
                              </div>
                              <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${selectedService === service.id ? 'bg-primary border-primary text-primary-foreground' : ''}`}>
                                {selectedService === service.id && <CheckCircle2 className="h-3 w-3" />}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-6 flex justify-end">
                        <Button disabled={!selectedService} onClick={() => setStep("datetime")}>Continue</Button>
                      </div>
                    </div>
                  )}

                  {step === "datetime" && (
                    <div className="space-y-6 animate-in fade-in">
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><CalendarIcon className="h-5 w-5 text-primary" /> Select a date</h3>
                        <div className="flex overflow-x-auto pb-4 gap-2 snap-x hide-scrollbar">
                          {availableDates.map((date, i) => (
                            <div 
                              key={i} 
                              className={`snap-start shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-xl border cursor-pointer transition-colors ${format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd') ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'hover:bg-muted'}`}
                              onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                            >
                              <span className="text-xs uppercase font-medium opacity-80">{format(date, 'EEE')}</span>
                              <span className="text-xl font-bold mt-1">{format(date, 'd')}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Select a time</h3>
                        {loadingSlots ? (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 animate-pulse">
                            {[1,2,3,4,5,6].map(i => <div key={i} className="h-10 bg-muted rounded-md" />)}
                          </div>
                        ) : slots && slots.length > 0 ? (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                            {slots.map((slot, i) => (
                              <Button
                                key={i}
                                variant={selectedTime === slot.startTime ? "default" : "outline"}
                                disabled={!slot.available}
                                onClick={() => setSelectedTime(slot.startTime)}
                                className={!slot.available ? 'opacity-50 line-through' : ''}
                              >
                                {slot.startTime.substring(0, 5)}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 text-center bg-muted/30 rounded-lg border border-dashed text-muted-foreground">
                            No slots available on this date.
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-6 flex justify-between">
                        <Button variant="outline" onClick={() => setStep("service")}>Back</Button>
                        <Button disabled={!selectedTime} onClick={() => setStep("form")}>Continue</Button>
                      </div>
                    </div>
                  )}

                  {step === "form" && (
                    <div className="animate-in fade-in">
                      <h3 className="text-lg font-semibold mb-4">Your details</h3>
                      <form onSubmit={handleBook} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input id="name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="John Doe" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input id="email" type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="john@example.com" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number (Optional)</Label>
                          <Input id="phone" type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+1 234 567 8900" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="notes">Notes (Optional)</Label>
                          <Textarea id="notes" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Anything the professional should know before the appointment?" />
                        </div>
                        
                        <div className="pt-6 flex justify-between border-t mt-6">
                          <Button type="button" variant="outline" onClick={() => setStep("datetime")}>Back</Button>
                          <Button type="submit" disabled={createBooking.isPending}>
                            {createBooking.isPending ? "Confirming..." : "Confirm Booking"}
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-1">
              <Card className="shadow-lg border-0 sticky top-24">
                <CardHeader className="bg-muted/30 pb-4 border-b">
                  <CardTitle className="text-lg">Booking Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {selectedService ? (() => {
                      const s = profile.services.find(s => s.id === selectedService);
                      return s && (
                        <div className="p-4 space-y-1">
                          <p className="text-sm text-muted-foreground">Service</p>
                          <p className="font-semibold">{s.name}</p>
                          <div className="flex justify-between text-sm pt-2">
                            <span>{s.duration} mins</span>
                            <span className="font-bold text-primary">${s.price} {s.currency}</span>
                          </div>
                        </div>
                      );
                    })() : (
                      <div className="p-4 text-sm text-muted-foreground italic">Select a service</div>
                    )}
                    
                    {(step === "datetime" || step === "form") && selectedDate ? (
                      <div className="p-4 space-y-1">
                        <p className="text-sm text-muted-foreground">Date & Time</p>
                        <p className="font-medium flex items-center gap-2"><CalendarIcon className="h-4 w-4" /> {format(selectedDate, 'EEEE, MMMM dd')}</p>
                        {selectedTime && <p className="font-medium flex items-center gap-2"><Clock className="h-4 w-4" /> {selectedTime.substring(0, 5)}</p>}
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
      
      <style dangerouslySetContent={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </PublicLayout>
  );
}
