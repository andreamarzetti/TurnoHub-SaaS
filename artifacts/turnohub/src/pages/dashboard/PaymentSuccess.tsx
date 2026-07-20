import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle2, LayoutDashboard } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { SESSION_QUERY_KEY } from "@/hooks/use-auth";
import { getGetMySubscriptionQueryKey } from "@workspace/api-client-react";

export default function PaymentSuccess() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Refresh session and subscription after returning from MP
    queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: getGetMySubscriptionQueryKey() });

    // Redirect to subscription page with success flag after a moment
    const t = setTimeout(() => {
      setLocation("/suscripcion?success=1");
    }, 3000);
    return () => clearTimeout(t);
  }, [queryClient, setLocation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold mb-2">¡Pago recibido!</h1>
        <p className="text-muted-foreground mb-8">
          Tu pago fue procesado correctamente. Tu cuenta quedará activa en unos instantes.
        </p>
        <div className="flex flex-col gap-3">
          <Button className="w-full h-12" asChild>
            <Link href="/dashboard">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Ir al inicio
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/suscripcion?success=1">Ver mi suscripción</Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-6">Redirigiendo automáticamente en 3 segundos...</p>
      </div>
    </div>
  );
}
