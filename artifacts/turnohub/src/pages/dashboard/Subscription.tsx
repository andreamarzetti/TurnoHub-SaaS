import { useGetPlans, useGetMySubscription, useCancelSubscription, useCreateMpCheckout, getGetMySubscriptionQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Zap, CreditCard, Loader2, Clock, ShieldCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { useSearch } from "wouter";

const STATUS_LABELS: Record<string, string> = {
  trial: "Período de prueba",
  active: "Activo",
  past_due: "Pago pendiente",
  cancelled: "Cancelado",
  suspended: "Suspendido",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  trial: "secondary",
  active: "default",
  past_due: "destructive",
  cancelled: "destructive",
  suspended: "destructive",
};

const PLAN_HIGHLIGHT: Record<string, boolean> = {
  profesional: true,
};

export default function Subscription() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const justPaid = params.get("success") === "1";

  const { data: plans, isLoading: loadingPlans } = useGetPlans();
  const { data: sub, isLoading: loadingSub } = useGetMySubscription();
  const cancelSubMutation = useCancelSubscription();
  const checkoutMutation = useCreateMpCheckout();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubscribe = (planSlug: string) => {
    checkoutMutation.mutate({ data: { planSlug } }, {
      onSuccess: (data) => {
        // Redirect to Mercado Pago checkout
        const url = data.checkoutUrl;
        if (url) {
          window.location.href = url;
        } else {
          toast({ title: "Error al iniciar el pago", variant: "destructive" });
        }
      },
      onError: (err: Error) => {
        const msg = (err as { message?: string })?.message || "Error al iniciar el pago";
        toast({ title: msg, variant: "destructive" });
      }
    });
  };

  const handleCancel = () => {
    if (confirm("¿Seguro que querés cancelar tu suscripción? Perderás acceso al finalizar el período de facturación.")) {
      cancelSubMutation.mutate(undefined, {
        onSuccess: () => {
          toast({ title: "Suscripción cancelada. Tu acceso continúa hasta fin del período." });
          queryClient.invalidateQueries({ queryKey: getGetMySubscriptionQueryKey() });
        }
      });
    }
  };

  if (loadingPlans || loadingSub) return (
    <div className="p-8 animate-pulse space-y-6">
      <div className="h-8 bg-muted w-1/4 rounded" />
      <div className="h-40 bg-muted rounded-xl" />
      <div className="grid grid-cols-3 gap-4"><div className="h-64 bg-muted rounded-xl" /><div className="h-64 bg-muted rounded-xl" /><div className="h-64 bg-muted rounded-xl" /></div>
    </div>
  );

  const trialDaysLeft = sub?.status === "trial" && sub.currentPeriodEnd
    ? Math.max(0, differenceInDays(parseISO(sub.currentPeriodEnd), new Date()))
    : null;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Suscripción</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestioná tu plan y facturación.</p>
      </div>

      {/* Success banner */}
      {justPaid && sub?.status === "active" && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 rounded-xl p-4">
          <ShieldCheck className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="font-semibold text-sm">¡Suscripción activa!</p>
            <p className="text-xs mt-0.5">Mercado Pago confirmó el pago y el plan ya está habilitado.</p>
          </div>
        </div>
      )}

      {justPaid && sub?.status !== "active" && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4">
          <Clock className="h-5 w-5 text-amber-700 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Pago en verificación</p>
            <p className="text-xs mt-0.5">El plan se activará cuando Mercado Pago confirme el pago; todavía no lo marcamos como activo.</p>
          </div>
        </div>
      )}

      {sub && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Plan actual</CardTitle>
              <Badge variant={STATUS_VARIANT[sub.status] ?? "secondary"}>
                {STATUS_LABELS[sub.status] ?? sub.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-2xl font-bold capitalize">
                  {sub.planSlug === "trial" ? "Prueba gratuita" : sub.planSlug}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {sub.status === "trial"
                    ? `Tu período de prueba vence el ${format(parseISO(sub.currentPeriodEnd), "d 'de' MMMM 'de' yyyy", { locale: es })}`
                    : `Próxima renovación: ${format(parseISO(sub.currentPeriodEnd), "d 'de' MMMM 'de' yyyy", { locale: es })}`
                  }
                </p>
                {trialDaysLeft !== null && (
                  <div className={`flex items-center gap-2 mt-2 text-sm px-3 py-2 rounded-lg ${trialDaysLeft <= 3 ? "bg-destructive/10 text-destructive" : "bg-amber-50 text-amber-700"}`}>
                    <Clock className="h-4 w-4 shrink-0" />
                    {trialDaysLeft === 0
                      ? "Tu prueba vence hoy — elegí un plan para no perder el acceso"
                      : `Te quedan ${trialDaysLeft} día${trialDaysLeft !== 1 ? "s" : ""} de prueba gratuita`
                    }
                  </div>
                )}
                {sub.cancelAtPeriodEnd && (
                  <div className="flex items-center gap-2 text-amber-600 mt-2 text-sm bg-amber-50 p-2 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    Se cancela al finalizar el período
                  </div>
                )}
                {(sub.status === "past_due" || sub.status === "suspended") && (
                  <div className="flex items-center gap-2 text-destructive mt-2 text-sm bg-destructive/10 p-3 rounded-lg">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Tu suscripción está vencida. Elegí un plan para reactivar tu cuenta.
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {sub.status === "active" && !sub.cancelAtPeriodEnd && (
                  <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleCancel} disabled={cancelSubMutation.isPending}>
                    Cancelar suscripción
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-xl font-bold tracking-tight mb-1">Elegí tu plan</h2>
        <p className="text-sm text-muted-foreground mb-5">El pago se procesa de forma segura a través de Mercado Pago. Podés cancelar cuando quieras.</p>
        <div className="grid md:grid-cols-3 gap-5">
          {plans?.map((plan) => {
            const isCurrent = sub?.status === "active" && sub?.planSlug === plan.slug;
            const isHighlight = PLAN_HIGHLIGHT[plan.slug];
            const isLoading = checkoutMutation.isPending && checkoutMutation.variables?.data?.planSlug === plan.slug;
            return (
              <Card key={plan.id} className={`flex flex-col relative ${isCurrent ? "border-primary ring-1 ring-primary" : ""} ${isHighlight ? "shadow-lg" : ""}`}>
                {isHighlight && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Zap className="h-3 w-3" /> Más popular
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl">
                    ACTUAL
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {plan.slug === "basico" ? "Para empezar" : plan.slug === "profesional" ? "El más elegido" : "Sin límites"}
                  </CardDescription>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-lg font-bold">$</span>
                    <span className="text-4xl font-extrabold tracking-tight">{Number(plan.priceMonthly).toLocaleString("es-AR")}</span>
                    <span className="text-muted-foreground text-sm ml-1">/mes</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  {plan.features.map((feature, j) => (
                    <div key={j} className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </CardContent>
                <CardFooter className="pt-4 border-t">
                  <Button
                    className="w-full"
                    variant={isCurrent ? "outline" : isHighlight ? "default" : "outline"}
                    disabled={isCurrent || checkoutMutation.isPending}
                    onClick={() => handleSubscribe(plan.slug)}
                  >
                    {isLoading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Redirigiendo...</>
                    ) : isCurrent ? (
                      "Plan actual"
                    ) : (
                      <><CreditCard className="h-4 w-4 mr-2" />Suscribirme con MP</>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          🔒 Pago 100% seguro procesado por Mercado Pago. TurnoHub nunca almacena datos de tarjetas.
        </p>
      </div>
    </div>
  );
}
