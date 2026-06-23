import { useGetPlans, useGetMySubscription, useCreateSubscription, useCancelSubscription, getGetMySubscriptionQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

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
        toast({ title: "Subscription updated successfully" });
        queryClient.invalidateQueries({ queryKey: getGetMySubscriptionQueryKey() });
      },
      onError: () => toast({ title: "Failed to update subscription", variant: "destructive" })
    });
  };

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing cycle.")) {
      cancelSubMutation.mutate(undefined, {
        onSuccess: () => {
          toast({ title: "Subscription cancelled" });
          queryClient.invalidateQueries({ queryKey: getGetMySubscriptionQueryKey() });
        }
      });
    }
  };

  if (loadingPlans || loadingSub) return <div className="p-8 animate-pulse space-y-6"><div className="h-8 bg-muted w-1/4 rounded"></div><div className="h-64 bg-muted rounded-xl"></div></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscription</h1>
        <p className="text-muted-foreground">Manage your billing and plan.</p>
      </div>

      {sub && (
        <Card className="border-primary/50 shadow-md">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Current Plan</CardTitle>
              <Badge variant={sub.status === 'active' || sub.status === 'trial' ? 'default' : 'secondary'} className="uppercase">
                {sub.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-2xl font-bold capitalize">{sub.planSlug}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Current period ends {format(parseISO(sub.currentPeriodEnd), 'MMM dd, yyyy')}
                </p>
                {sub.cancelAtPeriodEnd && (
                  <div className="flex items-center gap-2 text-amber-600 mt-2 text-sm bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                    <AlertCircle className="h-4 w-4" />
                    Cancels at the end of billing period
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {sub.status === 'active' && !sub.cancelAtPeriodEnd && (
                  <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleCancel} disabled={cancelSubMutation.isPending}>
                    Cancel Subscription
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Available Plans</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {plans?.map((plan) => {
            const isCurrent = sub?.planSlug === plan.slug;
            return (
              <Card key={plan.id} className={`flex flex-col relative ${isCurrent ? 'border-primary ring-1 ring-primary' : ''}`}>
                {isCurrent && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                    CURRENT
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl font-bold">$</span>
                    <span className="text-4xl font-extrabold tracking-tight">{plan.priceMonthly}</span>
                    <span className="text-muted-foreground ml-1">/mo</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  {plan.features.map((feature, j) => (
                    <div key={j} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </CardContent>
                <CardFooter className="pt-4 border-t">
                  <Button 
                    className="w-full" 
                    variant={isCurrent ? "outline" : "default"} 
                    disabled={isCurrent || createSubMutation.isPending}
                    onClick={() => handleSubscribe(plan.slug)}
                  >
                    {isCurrent ? "Current Plan" : "Upgrade"}
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
