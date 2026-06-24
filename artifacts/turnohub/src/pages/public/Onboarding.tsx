import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth, type SessionUser } from "@/hooks/use-auth";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Calendar, Share2, Zap } from "lucide-react";
import { useEffect } from "react";

export default function Onboarding() {
  const { user, isLoading, setUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) setLocation("/login");
    if (!isLoading && user && user.role !== "professional") {
      setLocation(user.role === "super_admin" ? "/admin" : "/");
    }
    if (!isLoading && user?.professional?.onboardingCompleted) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      if (phone || city) {
        await customFetch("/api/professionals/me", {
          method: "PATCH",
          body: JSON.stringify({ ...(phone && { phone }), ...(city && { city }) }),
          headers: { "Content-Type": "application/json" },
        });
      }

      await customFetch("/api/auth/complete-onboarding", { method: "POST" });

      setUser({
        ...user,
        professional: user.professional
          ? { ...user.professional, onboardingCompleted: true }
          : null,
      });

      toast({ title: "¡Todo listo! Bienvenido a TurnoHub" });
      setLocation("/dashboard");
    } catch {
      toast({ title: "Error al completar la configuración", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-primary mx-auto flex items-center justify-center mb-4">
            <span className="text-white font-bold text-2xl">T</span>
          </div>
          <h1 className="text-2xl font-bold mb-1">¡Bienvenido a TurnoHub!</h1>
          <p className="text-muted-foreground">En 2 minutos vas a tener tu agenda online lista</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step > s ? "bg-primary text-white" :
                step === s ? "bg-primary text-white" :
                "bg-muted text-muted-foreground"
              }`}>
                {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              {s < 3 && <div className={`h-0.5 w-8 transition-colors ${step > s ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-card rounded-2xl border shadow-sm p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold mb-1">Paso 1: Tu perfil</h2>
                  <p className="text-muted-foreground text-sm">Agregá tu teléfono y ciudad para que tus clientes puedan encontrarte.</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone">Teléfono de contacto (opcional)</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+54 11 1234-5678"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="city">Ciudad (opcional)</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Buenos Aires"
                    className="mt-1.5"
                  />
                </div>
              </div>
              <Button className="w-full h-12 rounded-xl" onClick={() => setStep(2)}>
                Continuar
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold mb-1">Paso 2: Tu agenda</h2>
                  <p className="text-muted-foreground text-sm">Desde el panel podrás configurar tus servicios, horarios y recibir reservas.</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { icon: "📋", text: "Agregá tus servicios con precio y duración" },
                  { icon: "🗓️", text: "Configurá tus horarios disponibles" },
                  { icon: "🔗", text: "Compartí tu link personal con tus clientes" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-sm">{item.text}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setStep(1)}>
                  Atrás
                </Button>
                <Button className="flex-1 h-12 rounded-xl" onClick={() => setStep(3)}>
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Share2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold mb-1">¡Ya casi estás!</h2>
                  <p className="text-muted-foreground text-sm">Tu página de reservas va a estar en:</p>
                  <div className="bg-muted rounded-lg px-4 py-2 mt-3 font-mono text-sm text-primary font-semibold">
                    turnohub.com/{user.professional?.slug ?? "tu-nombre"}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setStep(2)}>
                  Atrás
                </Button>
                <Button className="flex-1 h-12 rounded-xl" onClick={handleComplete} disabled={submitting}>
                  {submitting ? "Configurando..." : "Ir al panel"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
