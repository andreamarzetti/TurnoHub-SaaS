import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, LayoutDashboard } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { SESSION_QUERY_KEY } from "@/hooks/use-auth";
import { getGetMySubscriptionQueryKey, useGetMySubscription } from "@workspace/api-client-react";

export default function PaymentSuccess() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: subscription, isError, refetch } = useGetMySubscription({
    query: {
      queryKey: getGetMySubscriptionQueryKey(),
      refetchInterval: query => query.state.data?.status === "active" ? false : 2500,
    },
  });
  const activated = subscription?.status === "active";

  useEffect(() => {
    if (!activated) return;
    queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    const t = setTimeout(() => {
      setLocation("/suscripcion?success=1");
    }, 3000);
    return () => clearTimeout(t);
  }, [activated, queryClient, setLocation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className={`h-20 w-20 rounded-full ${activated ? "bg-green-100" : "bg-amber-100"} flex items-center justify-center mx-auto mb-6`}>
          {activated
            ? <CheckCircle2 className="h-10 w-10 text-green-600" />
            : <Clock className="h-10 w-10 text-amber-600" />}
        </div>
        <h1 className="text-2xl font-bold mb-2">{activated ? "¡Suscripción activa!" : "Verificando tu suscripción"}</h1>
        <p className="text-muted-foreground mb-8">
          {activated
            ? "Mercado Pago confirmó el pago y tu cuenta ya está activa."
            : isError
            ? "Todavía no pudimos confirmar el estado. Podés volver a consultar; no mostraremos la suscripción como activa hasta recibir confirmación de Mercado Pago."
            : "Esperamos la confirmación de Mercado Pago. La página se actualiza automáticamente cada pocos segundos."}
        </p>
        <div className="flex flex-col gap-3">
          {!activated && (
            <Button className="w-full h-12" variant="outline" onClick={() => refetch()}>
              Consultar nuevamente
            </Button>
          )}
          {activated && (
            <Button className="w-full h-12" asChild>
              <Link href="/dashboard">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Ir al inicio
              </Link>
            </Button>
          )}
          <Button variant="ghost" asChild>
            <Link href="/suscripcion">Ver mi suscripción</Link>
          </Button>
        </div>
        {activated && <p className="text-xs text-muted-foreground mt-6">Redirigiendo automáticamente en 3 segundos...</p>}
      </div>
    </div>
  );
}
