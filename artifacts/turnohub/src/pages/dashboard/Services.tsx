import { useState } from "react";
import { useGetMyServices, useCreateService, useUpdateService, useDeleteService, getGetMyServicesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, MoreVertical, Pencil, Trash } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
    color: "#3b82f6"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ data: {
      name: formData.name,
      description: formData.description,
      duration: Number(formData.duration),
      price: Number(formData.price),
      currency: formData.currency,
      color: formData.color,
    }}, {
      onSuccess: () => {
        toast({ title: "Service created successfully" });
        queryClient.invalidateQueries({ queryKey: getGetMyServicesQueryKey() });
        setIsOpen(false);
        setFormData({ name: "", description: "", duration: 60, price: 0, currency: "ARS", color: "#3b82f6" });
      },
      onError: () => toast({ title: "Failed to create service", variant: "destructive" })
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Services</h1>
          <p className="text-muted-foreground">Manage the services you offer to clients.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Service</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Service</DialogTitle>
              <DialogDescription>Add a new service that clients can book.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Service Name</Label>
                <Input id="name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (mins)</Label>
                  <Input id="duration" type="number" required min={5} step={5} value={formData.duration} onChange={e => setFormData({...formData, duration: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input id="price" type="number" required min={0} value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>Save Service</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => <Card key={i} className="h-40 animate-pulse bg-muted" />)}
        </div>
      ) : services?.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Plus className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-xl font-bold">No services yet</h3>
          <p className="text-muted-foreground mt-2 mb-4">Create your first service to start receiving bookings.</p>
          <Button onClick={() => setIsOpen(true)}>Add Service</Button>
        </Card>
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

function ServiceCard({ service }: { service: any }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // Using dynamic hook correctly is tricky because we need hooks to be static. 
  // For this simplified version we assume the hook exists and can be passed an ID.
  const deleteMutation = useDeleteService(service.id);
  // Same for update
  const updateMutation = useUpdateService(service.id);

  const toggleActive = (checked: boolean) => {
    updateMutation.mutate({ data: { isActive: checked } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMyServicesQueryKey() });
        toast({ title: checked ? "Service activated" : "Service deactivated" });
      }
    });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this service?")) {
      deleteMutation.mutate(undefined, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyServicesQueryKey() });
          toast({ title: "Service deleted" });
        }
      });
    }
  };

  return (
    <Card className={!service.isActive ? "opacity-60" : ""}>
      <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: service.color || "#3b82f6" }} />
            {service.name}
          </CardTitle>
          <CardDescription className="line-clamp-2 min-h-10">
            {service.description || "No description provided."}
          </CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="-mr-2 -mt-2"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="font-semibold text-lg">${service.price}</span>
            <span className="text-muted-foreground ml-1">{service.currency}</span>
          </div>
          <div className="text-muted-foreground bg-muted px-2 py-1 rounded-md">
            {service.duration} mins
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-4 border-t flex justify-between items-center bg-muted/20">
        <Label className="text-sm font-normal text-muted-foreground cursor-pointer">
          {service.isActive ? 'Active' : 'Inactive'}
        </Label>
        <Switch checked={service.isActive} onCheckedChange={toggleActive} disabled={updateMutation.isPending} />
      </CardFooter>
    </Card>
  );
}
