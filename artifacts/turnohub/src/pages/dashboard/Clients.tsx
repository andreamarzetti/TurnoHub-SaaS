import { useGetMyClients } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { useState } from "react";

export default function Clients() {
  const [search, setSearch] = useState("");
  const { data: clients, isLoading } = useGetMyClients({ query: { search: search || undefined } });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground text-sm mt-1">Tu base de clientes registrados.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-14 animate-pulse bg-muted rounded-xl" />)}
            </div>
          ) : clients && clients.length > 0 ? (
            <div className="divide-y">
              {clients.map(client => (
                <Link key={client.id} href={`/clients/${client.id}`}>
                  <div className="flex items-center justify-between px-4 py-4 hover:bg-muted/40 transition-colors cursor-pointer gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-muted-foreground">{client.email}{client.phone && ` · ${client.phone}`}</p>
                      </div>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-sm font-medium">{client.totalAppointments} {client.totalAppointments === 1 ? "turno" : "turnos"}</p>
                      <p className="text-xs text-muted-foreground">
                        {client.lastAppointmentAt
                          ? `Última visita: ${format(parseISO(client.lastAppointmentAt), "d MMM yyyy", { locale: es })}`
                          : "Sin visitas aún"}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                <Users className="h-7 w-7 opacity-40" />
              </div>
              <div>
                <p className="font-medium">No hay clientes todavía</p>
                <p className="text-sm mt-1">Los clientes aparecerán aquí cuando reserven un turno.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
