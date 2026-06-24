import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { customFetch } from "@workspace/api-client-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Link } from "wouter";
import { useState } from "react";

const loginSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "Mínimo 6 caracteres" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function getRedirectPath(user: SessionUser): string {
  if (user.role === "super_admin") return "/admin";
  if (user.role === "professional") {
    if (!user.professional) return "/dashboard";
    if (user.professional.status === "suspended") return "/suscripcion";
    if (!user.professional.onboardingCompleted) return "/onboarding";
    return "/dashboard";
  }
  return "/";
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    try {
      const res = await customFetch<{ user: SessionUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      setUser(res.user);
      toast({ title: "¡Bienvenido de nuevo!" });
      setLocation(getRedirectPath(res.user));
    } catch (err: any) {
      const message = err?.data?.error ?? "Email o contraseña incorrectos";
      toast({ title: "Error al ingresar", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center pb-8">
          <div className="flex justify-center mb-2">
            <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-xl">T</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Ingresar a TurnoHub</CardTitle>
          <CardDescription className="text-base">
            Ingresá tu email y contraseña para acceder a tu panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                      <Input placeholder="••••••••" type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-12 text-base rounded-xl" disabled={isLoading}>
                {isLoading ? "Ingresando..." : "Ingresar"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-2 border-t p-6">
          <p className="text-sm text-muted-foreground">
            ¿No tenés cuenta?{" "}
            <Link href="/register" className="text-primary font-semibold hover:underline">
              Registrate gratis
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
