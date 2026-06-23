import { useGetMyClients } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
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
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">Manage your client database.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search clients..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-12 animate-pulse bg-muted rounded-md" />)}
            </div>
          ) : clients && clients.length > 0 ? (
            <div className="divide-y">
              {clients.map(client => (
                <div key={client.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-sm text-muted-foreground">{client.email} {client.phone && `• ${client.phone}`}</p>
                    </div>
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-medium">{client.totalAppointments} appointments</p>
                    <p className="text-xs text-muted-foreground">
                      Last visit: {client.lastAppointmentAt ? format(parseISO(client.lastAppointmentAt), 'MMM dd, yyyy') : 'Never'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
              <Users className="h-12 w-12 mb-4 text-muted" />
              <p>No clients found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
