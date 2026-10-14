import {
  useGetMyProfessionalProfile,
  useUpdateMyProfessionalProfile,
  getGetMyProfessionalProfileQueryKey,
  useGetMpConnectStatus,
  useDisconnectMpConnect,
  getMpConnectUrl,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, ExternalLink, Check, CreditCard, Link2Off, Loader2 } from "lucide-react";

export default function Settings() {
  const { data: profile, isLoading } = useGetMyProfessionalProfile();
  const updateMutation = useUpdateMyProfessionalProfile();
  const { data: mpStatus, refetch: refetchMpStatus } = useGetMpConnectStatus();
  const disconnectMpMutation = useDisconnectMpConnect();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    phone: "",
    whatsappNumber: "",
    city: "",
    address: "",
    instagramUrl: "",
    paymentMode: "none",
    depositPercent: 30,
    depositType: "percent",
    depositAmount: 0,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        bio: profile.bio || "",
        phone: profile.phone || "",
        whatsappNumber: profile.whatsappNumber || "",
        city: profile.city || "",
        address: profile.address || "",
        instagramUrl: profile.instagramUrl || "",
        paymentMode: profile.paymentMode || "none",
        depositPercent: profile.depositPercent || 30,
        depositType: profile.depositAmount == null ? "percent" : "fixed",
        depositAmount: profile.depositAmount == null ? 0 : Number(profile.depositAmount),
      });
    }
  }, [profile]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("mp_connected") === "1";
    const error = params.get("mp_error");
    if (!connected && !error) return;

    if (connected) {
      toast({ title: "Cuenta de Mercado Pago conectada", description: "Los pagos de reservas se enviarán a tu cuenta." });
      refetchMpStatus();
    } else {
      toast({ title: "No se pudo conectar Mercado Pago", description: "Revisá la configuración de TurnoHub y volvé a intentar.", variant: "destructive" });
    }

    params.delete("mp_connected");
    params.delete("mp_error");
    const query = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  }, [refetchMpStatus, toast]);

  const bookingUrl = `${window.location.origin}/booking/${profile?.slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "¡Link copiado!", description: "Compartilo con tus clientes." });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { depositType, ...profileData } = formData;
    updateMutation.mutate({
      data: {
        ...profileData,
        depositAmount: formData.paymentMode === "deposit" && depositType === "fixed"
          ? formData.depositAmount
          : null,
      },
    }, {
      onSuccess: () => {
        toast({ title: "✅ Perfil actualizado", description: "Los cambios ya son visibles para tus clientes." });
        queryClient.invalidateQueries({ queryKey: getGetMyProfessionalProfileQueryKey() });
      },
      onError: () => toast({ title: "Error al guardar", variant: "destructive" })
    });
  };

  const handleConnectMp = async () => {
    try {
      const result = await getMpConnectUrl();
      window.location.href = result.authUrl;
    } catch {
      toast({
        title: "Mercado Pago no está disponible",
        description: "La conexión todavía no está configurada por el administrador.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnectMp = () => {
    if (!confirm("¿Querés desconectar tu cuenta de Mercado Pago? Se desactivará el cobro online.")) return;
    disconnectMpMutation.mutate(undefined, {
      onSuccess: () => {
        refetchMpStatus();
        setFormData(current => ({ ...current, paymentMode: "none" }));
        toast({ title: "Cuenta de Mercado Pago desconectada" });
      },
      onError: () => toast({ title: "No se pudo desconectar Mercado Pago", variant: "destructive" }),
    });
  };

  if (isLoading) return (
    <div className="p-8 space-y-4">
      <div className="h-8 bg-muted w-1/3 rounded animate-pulse" />
      <div className="h-48 bg-muted rounded-xl animate-pulse" />
      <div className="h-80 bg-muted rounded-xl animate-pulse" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración del perfil</h1>
        <p className="text-muted-foreground text-sm mt-1">Tu información pública visible en la página de reservas.</p>
      </div>

      {/* Booking link card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">🔗 Tu link de reservas</CardTitle>
          <CardDescription>Compartí este link con tus clientes para que reserven turnos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1 bg-white border rounded-lg px-3 py-2 text-sm font-mono text-muted-foreground truncate">
              {bookingUrl}
            </div>
            <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0 gap-1.5">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
            <Button size="sm" variant="outline" asChild className="shrink-0 gap-1.5">
              <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Ver
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" /> Pagos de reservas
          </CardTitle>
          <CardDescription>
            Conectá tu propia cuenta de Mercado Pago para cobrar directamente a tus clientes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className={`rounded-xl border p-4 flex items-center justify-between gap-3 ${mpStatus?.connected ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <div>
              <p className="font-semibold text-sm">
                {mpStatus?.connected ? "Cuenta de Mercado Pago conectada" : "Cuenta de Mercado Pago no conectada"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {mpStatus?.connected
                  ? `ID de cuenta: ${mpStatus.mpUserId || "conectada"}`
                  : "Necesitás conectarla para habilitar seña o pago completo online."}
              </p>
            </div>
            {mpStatus?.connected ? (
              <Button type="button" size="sm" variant="outline" onClick={handleDisconnectMp} disabled={disconnectMpMutation.isPending} className="gap-1.5 shrink-0">
                {disconnectMpMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2Off className="h-3.5 w-3.5" />}
                Desconectar
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={handleConnectMp} className="gap-1.5 shrink-0">
                <CreditCard className="h-3.5 w-3.5" /> Conectar Mercado Pago
              </Button>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentMode">Cómo cobrar reservas</Label>
              <select
                id="paymentMode"
                value={formData.paymentMode}
                onChange={e => setFormData({ ...formData, paymentMode: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="none">Sin pago online</option>
                <option value="in_person">Pago presencial</option>
                <option value="deposit">Seña online</option>
                <option value="full">Pago completo online</option>
              </select>
              <p className="text-xs text-muted-foreground">
                La seña y el pago completo requieren una cuenta conectada.
              </p>
            </div>
            {formData.paymentMode === "deposit" && (
              <div className="space-y-2">
                <Label htmlFor="depositType">Tipo de seña</Label>
                <select
                  id="depositType"
                  value={formData.depositType}
                  onChange={e => setFormData({ ...formData, depositType: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="percent">Porcentaje</option>
                  <option value="fixed">Monto fijo</option>
                </select>
                {formData.depositType === "percent" ? (
                  <>
                    <Label htmlFor="depositPercent">Porcentaje de seña</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="depositPercent"
                        type="number"
                        min={1}
                        max={100}
                        value={formData.depositPercent}
                        onChange={e => setFormData({ ...formData, depositPercent: Number(e.target.value) })}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Se calcula sobre el precio del servicio.</p>
                  </>
                ) : (
                  <>
                    <Label htmlFor="depositAmount">Monto fijo por reserva</Label>
                    <Input
                      id="depositAmount"
                      type="number"
                      min={1}
                      step="0.01"
                      value={formData.depositAmount}
                      onChange={e => setFormData({ ...formData, depositAmount: Number(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">No puede superar el precio del servicio reservado.</p>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Información pública</CardTitle>
            <CardDescription>Esta información aparece en tu página de reservas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre para mostrar *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Ej: Dra. Ana García"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Descripción / Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={e => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
                placeholder="Contale a tus clientes quién sos y en qué te especializás..."
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+54 11 1234-5678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp <span className="text-xs text-muted-foreground">(para notificaciones)</span></Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsappNumber}
                  onChange={e => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  placeholder="+5491112345678"
                />
                <p className="text-xs text-muted-foreground">Sin espacios ni guiones. Incluí el código de país (ej: +549...).</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Buenos Aires"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Av. Corrientes 1234, CABA"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={formData.instagramUrl}
                  onChange={e => setFormData({ ...formData, instagramUrl: e.target.value })}
                  placeholder="https://instagram.com/tuusuario"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-5 bg-muted/20 flex justify-between">
            <p className="text-sm text-muted-foreground">Los cambios se verán inmediatamente en tu página pública.</p>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
