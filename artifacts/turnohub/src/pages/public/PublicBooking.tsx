import { useState } from "react";
import { useParams } from "wouter";
import { useGetPublicProfile, useGetAvailableSlots, useCreateBooking } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, Clock, CheckCircle2, ChevronLeft, ChevronRight, Instagram, Globe, MessageCircle, Calendar } from "lucide-react";
import { format, addDays, startOfToday, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

type Step = "service" | "datetime" | "form" | "success";

export default function PublicBooking() {
  const { slug } = useParams<{ slug: string }>();
  const { data: profile, isLoading } = useGetPublicProfile(slug as string, { query: { enabled: !!slug } });

  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [calendarOffset, setCalendarOffset] = useState(0);
  const [waUrl, setWaUrl] = useState<string | null>(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: slots, isLoading: loadingSlots } = useGetAvailableSlots(
    slug as string,
    { date: dateStr, serviceId: selectedService || 0 },
    { query: { enabled: !!slug && !!selectedService && step === "datetime" } }
  );

  const createBooking = useCreateBooking();
  const { toast } = useToast();

  const [formData, setFormData] = useState({ name: "", email: "", phone: "", notes: "" });

  const availableDates = Array.from({ length: 28 }).map((_, i) => addDays(startOfToday(), i));
  const visibleDates = availableDates.slice(calendarOffset, calendarOffset + 7);
  const selectedServiceData = profile?.services.find(s => s.id === selectedService);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">Página no encontrada</h2>
          <p className="text-muted-foreground">Este profesional no existe o el link es incorrecto.</p>
        </div>
      </div>
    );
  }

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedTime || !slug) return;
    createBooking.mutate({ slug, data: {
      serviceId: selectedService,
      date: dateStr,
      startTime: selectedTime,
      clientName: formData.name,
      clientEmail: formData.email,
      clientPhone: formData.phone,
      notes: formData.notes,
    }}, {
      onSuccess: (data) => {
        const d = data as unknown as { waUrl?: string };
        if (d?.waUrl) setWaUrl(d.waUrl);
        setStep("success");
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        toast({ title: "Error al reservar", description: msg || "Ese horario ya no está disponible. Elegí otro.", variant: "destructive" });
      },
    });
  };

  const STEPS = [
    { key: "service", label: "Servicio" },
    { key: "datetime", label: "Fecha y hora" },
    { key: "form", label: "Tus datos" },
  ] as const;
  const stepIndex = STEPS.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header TurnoHub */}
      <div className="border-b bg-white px-4 py-3 flex items-center gap-2">
        <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
          <span className="text-white font-bold text-[10px]">T</span>
        </div>
        <span className="text-sm font-semibold text-foreground">Turno<span className="text-primary">Hub</span></span>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {step === "success" ? (
          <div className="max-w-md mx-auto text-center bg-white rounded-3xl shadow-sm border p-8 md:p-10">
            <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">¡Turno confirmado!</h2>
            <p className="text-muted-foreground mb-5">
              Te esperamos, <strong>{formData.name}</strong>. Revisá tu email para ver los detalles.
            </p>

            {selectedServiceData && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm mb-5 text-left space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <p className="font-bold text-foreground">{selectedServiceData.name}</p>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>{format(selectedDate, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>{selectedTime?.substring(0, 5)} hs · {selectedServiceData.duration} min</span>
                </div>
                <div className="flex items-center gap-2 font-bold text-foreground pt-1 border-t border-slate-100">
                  <span>Total:</span>
                  <span className="text-primary">${Number(selectedServiceData.price).toLocaleString("es-AR")} ARS</span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {waUrl && (
                <a href={waUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#22c55e] text-white font-semibold py-2.5 px-4 rounded-xl transition-colors text-sm">
                  <MessageCircle className="h-4 w-4" />
                  Confirmar por WhatsApp con {profile.name}
                </a>
              )}
              <Button variant="outline" className="w-full rounded-xl" onClick={() => {
                setStep("service");
                setSelectedService(null);
                setSelectedTime(null);
                setWaUrl(null);
                setFormData({ name: "", email: "", phone: "", notes: "" });
              }}>
                Reservar otro turno
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: Professional Profile */}
            <div className="lg:w-72 shrink-0">
              <div className="bg-white rounded-3xl shadow-sm border p-6 lg:sticky lg:top-8">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                  <h1 className="text-xl font-bold">{profile.name}</h1>
                  <p className="text-primary font-medium text-sm mt-1">{profile.profession}</p>
                  {profile.bio && (
                    <p className="text-muted-foreground text-sm mt-3 leading-relaxed">{profile.bio}</p>
                  )}
                </div>

                <div className="space-y-2 border-t pt-4">
                  {profile.city && (
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span>{profile.city}</span>
                    </div>
                  )}
                  {profile.phone && (
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>{profile.phone}</span>
                    </div>
                  )}
                  {profile.instagramUrl && (
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Instagram className="h-4 w-4 shrink-0" />
                      <a href={profile.instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                        {profile.instagramUrl.replace(/https?:\/\/(www\.)?instagram\.com\//, "@")}
                      </a>
                    </div>
                  )}
                  {profile.whatsappNumber && (
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <MessageCircle className="h-4 w-4 shrink-0" />
                      <a href={`https://wa.me/${profile.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                        WhatsApp
                      </a>
                    </div>
                  )}
                  {profile.websiteUrl && (
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Globe className="h-4 w-4 shrink-0" />
                      <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors truncate">
                        {profile.websiteUrl.replace(/https?:\/\//, "")}
                      </a>
                    </div>
                  )}
                </div>

                {/* Mini summary */}
                {(selectedServiceData || selectedTime) && (
                  <div className="mt-4 pt-4 border-t space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resumen</p>
                    {selectedServiceData && (
                      <div className="bg-primary/5 rounded-xl p-3 text-sm space-y-1">
                        <p className="font-semibold">{selectedServiceData.name}</p>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {selectedServiceData.duration} min</span>
                          <span className="font-bold text-foreground">${Number(selectedServiceData.price).toLocaleString("es-AR")}</span>
                        </div>
                      </div>
                    )}
                    {selectedTime && (
                      <p className="text-sm text-muted-foreground">
                        📅 {format(selectedDate, "d 'de' MMMM", { locale: es })} · {selectedTime.substring(0, 5)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Booking flow */}
            <div className="flex-1 bg-white rounded-3xl shadow-sm border overflow-hidden">
              {/* Step indicator */}
              <div className="flex border-b">
                {STEPS.map((s, i) => (
                  <button
                    key={s.key}
                    disabled={i > stepIndex}
                    onClick={() => i < stepIndex && setStep(s.key)}
                    className={`flex-1 py-4 text-sm font-medium transition-colors relative ${
                      step === s.key
                        ? "text-primary bg-primary/5"
                        : i < stepIndex
                        ? "text-muted-foreground hover:bg-muted/30 cursor-pointer"
                        : "text-muted-foreground/50 cursor-not-allowed"
                    }`}
                  >
                    <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[11px] mr-2 font-bold ${
                      step === s.key ? "bg-primary text-white" :
                      i < stepIndex ? "bg-emerald-500 text-white" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {i < stepIndex ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
                    </span>
                    {s.label}
                    {step === s.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* STEP 1: Select service */}
                {step === "service" && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-bold mb-2">¿Qué servicio necesitás?</h2>
                    {profile.services.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p>Este profesional aún no configuró sus servicios.</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          {profile.services.map(service => (
                            <div
                              key={service.id}
                              onClick={() => setSelectedService(service.id)}
                              className={`border-2 rounded-2xl p-4 cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5 ${
                                selectedService === service.id
                                  ? "border-primary bg-primary/5 shadow-sm"
                                  : "border-border"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: service.color || "#14B8A6" }} />
                                    <h3 className="font-bold">{service.name}</h3>
                                  </div>
                                  {service.description && (
                                    <p className="text-sm text-muted-foreground mt-1 ml-4">{service.description}</p>
                                  )}
                                  <div className="flex items-center gap-3 mt-2 ml-4 text-sm">
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                      <Clock className="h-3.5 w-3.5" /> {service.duration} min
                                    </span>
                                    <span className="font-bold text-foreground">
                                      ${Number(service.price).toLocaleString("es-AR")} {service.currency}
                                    </span>
                                  </div>
                                </div>
                                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                  selectedService === service.id ? "bg-primary border-primary" : "border-muted-foreground/30"
                                }`}>
                                  {selectedService === service.id && <CheckCircle2 className="h-3 w-3 text-white" />}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end pt-2">
                          <Button
                            disabled={!selectedService}
                            onClick={() => setStep("datetime")}
                            className="rounded-xl px-8"
                          >
                            Continuar
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* STEP 2: Date & Time */}
                {step === "datetime" && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-bold">¿Cuándo querés el turno?</h2>

                    {/* Date picker */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Elegí un día</p>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setCalendarOffset(Math.max(0, calendarOffset - 7))}
                            disabled={calendarOffset === 0}
                            className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setCalendarOffset(Math.min(21, calendarOffset + 7))}
                            disabled={calendarOffset >= 21}
                            className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-1.5">
                        {visibleDates.map((date, i) => {
                          const isSelected = isSameDay(date, selectedDate);
                          const isToday = isSameDay(date, startOfToday());
                          return (
                            <button
                              key={i}
                              onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                              className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all text-sm ${
                                isSelected
                                  ? "bg-primary text-white shadow-md shadow-primary/25"
                                  : "hover:bg-muted"
                              }`}
                            >
                              <span className={`text-[10px] uppercase font-medium mb-1 ${isSelected ? "text-white/80" : "text-muted-foreground"}`}>
                                {format(date, "EEE", { locale: es })}
                              </span>
                              <span className={`font-bold ${isToday && !isSelected ? "text-primary" : ""}`}>
                                {format(date, "d")}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Time slots */}
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Horarios disponibles · {format(selectedDate, "d 'de' MMMM", { locale: es })}
                      </p>
                      {loadingSlots ? (
                        <div className="grid grid-cols-4 gap-2">
                          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="h-10 animate-pulse bg-muted rounded-xl" />)}
                        </div>
                      ) : slots && slots.length > 0 ? (
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                          {slots.map((slot, i) => (
                            <button
                              key={i}
                              disabled={!slot.available}
                              onClick={() => setSelectedTime(slot.startTime)}
                              className={`py-2.5 rounded-xl text-sm font-medium transition-all border ${
                                selectedTime === slot.startTime
                                  ? "bg-primary text-white border-primary shadow-md"
                                  : slot.available
                                  ? "border-border hover:border-primary/50 hover:bg-primary/5"
                                  : "opacity-30 line-through cursor-not-allowed bg-muted border-transparent"
                              }`}
                            >
                              {slot.startTime.substring(0, 5)}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center border-2 border-dashed rounded-2xl text-muted-foreground text-sm">
                          No hay horarios disponibles en esta fecha.<br />
                          <span className="text-xs">Probá con otro día.</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between pt-2">
                      <Button variant="outline" className="rounded-xl" onClick={() => setStep("service")}>Atrás</Button>
                      <Button disabled={!selectedTime} onClick={() => setStep("form")} className="rounded-xl px-8">
                        Continuar
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Client form */}
                {step === "form" && (
                  <div className="space-y-5">
                    <h2 className="text-lg font-bold">Tus datos de contacto</h2>
                    <form onSubmit={handleBook} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Nombre completo *</Label>
                        <Input
                          id="name"
                          required
                          className="mt-1.5 rounded-xl"
                          placeholder="Ana García"
                          value={formData.name}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          className="mt-1.5 rounded-xl"
                          placeholder="ana@email.com"
                          value={formData.email}
                          onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Teléfono (opcional)</Label>
                        <Input
                          id="phone"
                          type="tel"
                          className="mt-1.5 rounded-xl"
                          placeholder="+54 11 1234-5678"
                          value={formData.phone}
                          onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="notes">Nota para el profesional (opcional)</Label>
                        <Textarea
                          id="notes"
                          className="mt-1.5 rounded-xl"
                          placeholder="¿Hay algo que el profesional deba saber?"
                          rows={3}
                          value={formData.notes}
                          onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        />
                      </div>

                      {/* Final summary */}
                      {selectedServiceData && selectedTime && (
                        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-sm">
                          <p className="font-semibold mb-2 text-foreground">Confirmás este turno:</p>
                          <p><span className="text-muted-foreground">Servicio:</span> <strong>{selectedServiceData.name}</strong></p>
                          <p><span className="text-muted-foreground">Fecha:</span> <strong>{format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}</strong></p>
                          <p><span className="text-muted-foreground">Hora:</span> <strong>{selectedTime.substring(0, 5)}</strong></p>
                          <p><span className="text-muted-foreground">Precio:</span> <strong>${Number(selectedServiceData.price).toLocaleString("es-AR")} {selectedServiceData.currency}</strong></p>
                        </div>
                      )}

                      <div className="flex justify-between pt-2">
                        <Button type="button" variant="outline" className="rounded-xl" onClick={() => setStep("datetime")}>Atrás</Button>
                        <Button type="submit" disabled={createBooking.isPending} className="rounded-xl px-8">
                          {createBooking.isPending ? "Confirmando..." : "Confirmar turno"}
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
