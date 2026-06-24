import { useGetMyProfessionalProfile, useUpdateMyProfessionalProfile, getGetMyProfessionalProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, ExternalLink, Check } from "lucide-react";

export default function Settings() {
  const { data: profile, isLoading } = useGetMyProfessionalProfile();
  const updateMutation = useUpdateMyProfessionalProfile();
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
      });
    }
  }, [profile]);

  const bookingUrl = `${window.location.origin}/booking/${profile?.slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "¡Link copiado!", description: "Compartilo con tus clientes." });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ data: formData }, {
      onSuccess: () => {
        toast({ title: "✅ Perfil actualizado", description: "Los cambios ya son visibles para tus clientes." });
        queryClient.invalidateQueries({ queryKey: getGetMyProfessionalProfileQueryKey() });
      },
      onError: () => toast({ title: "Error al guardar", variant: "destructive" })
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
