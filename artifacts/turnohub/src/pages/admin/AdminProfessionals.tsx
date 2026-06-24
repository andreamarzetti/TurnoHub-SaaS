import { useGetAdminProfessionals } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_LABELS: Record<string, string> = {
  trial: "Prueba",
  active: "Activo",
  suspended: "Suspendido",
  cancelled: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  trial: "bg-amber-100 text-amber-700 border-amber-200",
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  suspended: "bg-red-100 text-red-700 border-red-200",
  cancelled: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function AdminProfessionals() {
  const { data: professionals, isLoading } = useGetAdminProfessionals();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Directorio de profesionales</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestioná todos los profesionales de la plataforma.</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b bg-muted/20 rounded-t-xl pb-3">
          <CardTitle className="text-base font-semibold">Todos los profesionales</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-16 animate-pulse bg-muted rounded-xl" />)}
            </div>
          ) : professionals && professionals.length > 0 ? (
            <div className="divide-y">
              {professionals.map(prof => (
                <div key={prof.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {prof.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{prof.name}</h4>
                        <Badge variant="outline" className={STATUS_COLORS[prof.status] ?? ""}>
                          {STATUS_LABELS[prof.status] ?? prof.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{prof.profession} · {prof.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm text-right shrink-0">
                    <div>
                      <p className="text-xs text-muted-foreground">Plan</p>
                      <p className="font-medium uppercase text-xs mt-0.5">{prof.currentPlan || "Trial"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Clientes</p>
                      <p className="font-medium">{prof.totalClients}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Turnos</p>
                      <p className="font-medium">{prof.totalAppointments}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Alta</p>
                      <p className="font-medium">{format(parseISO(prof.createdAt), "d MMM yy", { locale: es })}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <p>No hay profesionales registrados todavía.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
