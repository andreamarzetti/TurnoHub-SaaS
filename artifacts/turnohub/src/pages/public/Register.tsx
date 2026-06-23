import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { customFetch } from "@workspace/api-client-react/src/custom-fetch";
import { useAuth, type SessionUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Link } from "wouter";
import { useState } from "react";

const registerSchema = z.object({
  name: z.string().min(2, { message: "Mínimo 2 caracteres" }),
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "Mínimo 6 caracteres" }),
  profession: z.string().min(1, { message: "Seleccioná tu profesión" }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const PROFESSIONS = [
  "Profesor de tenis",
  "Nutricionista",
  "Psicólogo/a",
  "Peluquería / Barbería",
  "Entrenador Personal",
  "Academia",
  "Profesor Particular",
  "Masajista",
  "Odontólogo/a",
  "Otro",
];

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", profession: "" },
  });

  async function onSubmit(data: RegisterFormValues) {
    setIsLoading(true);
    try {
      const res = await customFetch<{ user: SessionUser }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      setUser(res.user);
      toast({ title: "¡Cuenta creada! Bienvenido a TurnoHub" });
      setLocation("/onboarding");
    } catch (err: any) {
      const message = err?.data?.error ?? "Error al crear la cuenta. Intentá de nuevo.";
      toast({ title: "Error al registrarse", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-muted/30 p-4 py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="flex justify-center mb-2">
            <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-xl">T</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Crear cuenta gratis</CardTitle>
          <CardDescription className="text-base">
            14 días gratis · Sin tarjeta de crédito
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ana García" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="nombre@ejemplo.com" type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input placeholder="••••••••" type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="profession"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>¿A qué te dedicás?</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccioná tu profesión" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROFESSIONS.map((prof) => (
                          <SelectItem key={prof} value={prof}>{prof}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-12 text-base rounded-xl mt-2" disabled={isLoading}>
                {isLoading ? "Creando cuenta..." : "Crear cuenta gratis"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center border-t p-6">
          <p className="text-sm text-muted-foreground">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Ingresar
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
