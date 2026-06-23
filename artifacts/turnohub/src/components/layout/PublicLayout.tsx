import { ReactNode } from "react";
import { Link } from "wouter";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">
              Turno<span className="text-primary">Hub</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-6">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              Ingresar
            </Link>
            <Link href="/register" className="text-sm font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
              Probar gratis
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <footer className="border-t py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-xs">T</span>
              </div>
              <span className="font-semibold text-foreground">TurnoHub</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Gestión de turnos para profesionales en Latinoamérica.
            </p>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} TurnoHub
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
