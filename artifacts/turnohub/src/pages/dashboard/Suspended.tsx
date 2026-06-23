import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { AlertTriangle, CreditCard, LogOut } from "lucide-react";
import { useEffect } from "react";

export default function Suspended() {
  const { user, isLoading, logout } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) setLocation("/login");
  }, [user, isLoading, setLocation]);

  if (isLoading || !user) return null;

  const isSuspended = user.professional?.status === "suspended";
  const isTrialExpired = user.professional?.status === "trial" && user.professional?.trialEndsAt
    ? new Date(user.professional.trialEndsAt) < new Date()
    : false;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>

        <h1 className="text-2xl font-bold mb-2">
          {isSuspended ? "Cuenta suspendida" : "Período de prueba vencido"}
        </h1>
        <p className="text-muted-foreground mb-8">
          {isSuspended
            ? "Tu cuenta fue suspendida. Para reactivarla, elegí un plan y regularizá tu suscripción."
            : "Tu período de prueba de 14 días terminó. Elegí un plan para seguir usando TurnoHub."}
        </p>

        <div className="bg-card rounded-2xl border p-6 mb-6 text-left">
          <h2 className="font-semibold mb-4">Planes disponibles</h2>
          {[
            { name: "Básico", price: "9.900", desc: "Para empezar" },
            { name: "Profesional", price: "14.900", desc: "El más elegido", popular: true },
            { name: "Premium", price: "19.900", desc: "Sin límites" },
          ].map((plan) => (
            <div key={plan.name} className={`flex items-center justify-between p-3 rounded-xl mb-2 last:mb-0 ${
              plan.popular ? "bg-primary/10 border border-primary/30" : "bg-muted/50"
            }`}>
              <div>
                <span className="font-semibold text-sm">{plan.name}</span>
                {plan.popular && <span className="ml-2 text-xs bg-primary text-white px-2 py-0.5 rounded-full">Popular</span>}
                <p className="text-xs text-muted-foreground">{plan.desc}</p>
              </div>
              <span className="font-bold text-sm">${plan.price}/mes</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <Button className="w-full h-12 rounded-xl" asChild>
            <Link href="/suscripcion">
              <CreditCard className="h-4 w-4 mr-2" />
              Elegir plan y reactivar
            </Link>
          </Button>
          <Button variant="ghost" className="w-full" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  );
}
