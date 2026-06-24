import { useGetPlans, useGetMySubscription, useCreateSubscription, useCancelSubscription, getGetMySubscriptionQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Zap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_LABELS: Record<string, string> = {
  trial: "Prueba gratuita",
  active: "Activo",
  cancelled: "Cancelado",
  expired: "Vencido",
};

const PLAN_HIGHLIGHT: Record<string, boolean> = {
  profesional: true,
};

export default function Subscription() {
  const { data: plans, isLoading: loadingPlans } = useGetPlans();
  const { data: sub, isLoading: loadingSub } = useGetMySubscription();
  const createSubMutation = useCreateSubscription();
  const cancelSubMutation = useCancelSubscription();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubscribe = (planSlug: string) => {
    createSubMutation.mutate({ data: { planSlug } }, {
      onSuccess: () => {
        toast({ title: "✅ Plan actualizado correctamente" });
        queryClient.invalidateQueries({ queryKey: getGetMySubscriptionQueryKey() });
      },
      onError: () => toast({ title: "Error al actualizar el plan", variant: "destructive" })
    });
  };

  const handleCancel = () => {
    if (confirm("¿Seguro que querés cancelar tu suscripción? Perderás acceso al finalizar el período de facturación.")) {
      cancelSubMutation.mutate(undefined, {
        onSuccess: () => {
          toast({ title: "Suscripción cancelada" });
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

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Suscripción</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestioná tu plan y facturación.</p>
      </div>

      {sub && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Plan actual</CardTitle>
              <Badge variant={sub.status === "active" || sub.status === "trial" ? "default" : "secondary"}>
                {STATUS_LABELS[sub.status] ?? sub.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-2xl font-bold capitalize">{sub.planSlug}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Período actual hasta el {format(parseISO(sub.currentPeriodEnd), "d 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
                {sub.cancelAtPeriodEnd && (
                  <div className="flex items-center gap-2 text-amber-600 mt-2 text-sm bg-amber-50 p-2 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    Se cancela al finalizar el período
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
        <h2 className="text-xl font-bold tracking-tight mb-4">Planes disponibles</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {plans?.map((plan) => {
            const isCurrent = sub?.planSlug === plan.slug;
            const isHighlight = PLAN_HIGHLIGHT[plan.slug];
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
                    disabled={isCurrent || createSubMutation.isPending}
                    onClick={() => handleSubscribe(plan.slug)}
                  >
                    {isCurrent ? "Plan actual" : "Elegir este plan"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
