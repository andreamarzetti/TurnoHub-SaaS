import { useState } from "react";
import { useGetMyServices, useCreateService, useUpdateService, useDeleteService, getGetMyServicesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Trash, Clock, DollarSign, Scissors, Dumbbell, BookOpen, Heart, Smile, Leaf, Star } from "lucide-react";
import type { Service } from "@workspace/api-client-react";

const SERVICE_COLORS = [
  "#14B8A6", "#6366F1", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#10B981", "#3B82F6",
];

function getIconForService(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("corte") || lower.includes("pelo") || lower.includes("cabello")) return Scissors;
  if (lower.includes("gym") || lower.includes("entrena") || lower.includes("fitness")) return Dumbbell;
  if (lower.includes("clase") || lower.includes("curso") || lower.includes("tenis")) return BookOpen;
  if (lower.includes("masa") || lower.includes("terapia") || lower.includes("reiki")) return Heart;
  if (lower.includes("dent") || lower.includes("odont")) return Smile;
  if (lower.includes("nutri") || lower.includes("diet")) return Leaf;
  return Star;
}

export default function Services() {
  const { data: services, isLoading } = useGetMyServices();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createMutation = useCreateService();

  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration: 60,
    price: 0,
    currency: "ARS",
    color: "#14B8A6",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      data: {
        name: formData.name,
        description: formData.description,
        duration: Number(formData.duration),
        price: Number(formData.price),
        currency: formData.currency,
        color: formData.color,
      },
    }, {
      onSuccess: () => {
        toast({ title: "Servicio creado" });
        queryClient.invalidateQueries({ queryKey: getGetMyServicesQueryKey() });
        setIsOpen(false);
        setFormData({ name: "", description: "", duration: 60, price: 0, currency: "ARS", color: "#14B8A6" });
      },
      onError: () => toast({ title: "Error al crear el servicio", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Servicios</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestioná los servicios que ofrecés a tus clientes.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl gap-2">
              <Plus className="h-4 w-4" /> Nuevo servicio
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Crear nuevo servicio</DialogTitle>
              <DialogDescription>Agregá un servicio que tus clientes podrán reservar.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Nombre del servicio</Label>
                <Input required placeholder="Ej: Corte de cabello" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Descripción (opcional)</Label>
                <Textarea placeholder="Describí brevemente el servicio..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Duración (minutos)</Label>
                  <Input type="number" required min={5} step={5} value={formData.duration} onChange={e => setFormData({ ...formData, duration: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Precio (ARS)</Label>
                  <Input type="number" required min={0} value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {SERVICE_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${formData.color === color ? "ring-2 ring-offset-2 ring-foreground scale-110" : ""}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>
              <DialogFooter className="mt-2">
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Guardando..." : "Guardar servicio"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <div key={i} className="h-44 animate-pulse bg-muted rounded-2xl" />)}
        </div>
      ) : services?.length === 0 ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl p-16 text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Scissors className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-2">Sin servicios aún</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">Creá tu primer servicio para que los clientes puedan empezar a reservar.</p>
          <Button onClick={() => setIsOpen(true)} className="rounded-xl gap-2">
            <Plus className="h-4 w-4" /> Crear primer servicio
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services?.map(service => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceCard({ service }: { service: Service }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteMutation = useDeleteService();
  const updateMutation = useUpdateService();
  const Icon = getIconForService(service.name);

  const toggleActive = (checked: boolean) => {
    updateMutation.mutate({ serviceId: service.id, data: { isActive: checked } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMyServicesQueryKey() });
        toast({ title: checked ? "Servicio activado" : "Servicio desactivado" });
      },
    });
  };

  const handleDelete = () => {
    if (confirm("¿Eliminás este servicio? Los turnos existentes no se verán afectados.")) {
      deleteMutation.mutate({ serviceId: service.id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyServicesQueryKey() });
          toast({ title: "Servicio eliminado" });
        },
      });
    }
  };

  return (
    <Card className={`border-0 shadow-sm hover:shadow-md transition-shadow overflow-hidden ${!service.isActive ? "opacity-60 grayscale" : ""}`}>
      <div className="h-1.5 w-full" style={{ backgroundColor: service.color || "#14B8A6" }} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${service.color || "#14B8A6"}20` }}>
              <Icon className="h-5 w-5" style={{ color: service.color || "#14B8A6" }} />
            </div>
            <div>
              <h3 className="font-bold">{service.name}</h3>
              {service.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{service.description}</p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-1">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash className="mr-2 h-4 w-4" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-muted/60 px-3 py-1.5 rounded-lg">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-bold text-sm">${Number(service.price).toLocaleString("es-AR")}</span>
            <span className="text-xs text-muted-foreground">{service.currency}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-muted/60 px-3 py-1.5 rounded-lg">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">{service.duration} min</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="px-5 py-3 border-t bg-muted/20 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{service.isActive ? "Activo" : "Inactivo"}</span>
        <Switch
          checked={service.isActive}
          onCheckedChange={toggleActive}
          disabled={updateMutation.isPending}
        />
      </CardFooter>
    </Card>
  );
}
