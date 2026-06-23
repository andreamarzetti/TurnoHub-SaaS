import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Calendar, Users, Clock, CreditCard, ChevronRight, CheckCircle2 } from "lucide-react";

export default function Landing() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex-1 bg-background">
      {/* Hero Section */}
      <section className="py-20 md:py-32 px-4 container mx-auto text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-4xl mx-auto space-y-8"
        >
          <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-bold tracking-tight text-foreground">
            Agenda más, <span className="text-primary">gestiona menos.</span>
          </motion.h1>
          <motion.p variants={itemVariants} className="text-xl text-muted-foreground max-w-2xl mx-auto">
            La plataforma de reservas online diseñada para profesionales en Latinoamérica. Ahorra tiempo, reduce inasistencias y proyecta una imagen profesional.
          </motion.p>
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8" asChild>
              <Link href="/register">Comenzar gratis</Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-14 px-8" asChild>
              <Link href="/login">Ingresar</Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Todo lo que necesitas para tu negocio</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Herramientas poderosas pero simples de usar, diseñadas para que te enfoques en tus clientes, no en la administración.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              { icon: Calendar, title: "Agenda Inteligente", desc: "Sincroniza tu disponibilidad automáticamente y evita reservas superpuestas." },
              { icon: Clock, title: "Recordatorios", desc: "Reduce inasistencias con notificaciones automáticas para tus clientes." },
              { icon: Users, title: "Base de Clientes", desc: "Mantén un historial detallado de cada cliente y sus preferencias." },
              { icon: CreditCard, title: "Pagos Integrados", desc: "Cobra por tus servicios por adelantado o acepta señas fácilmente." },
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-xl mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Planes simples y transparentes</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Elige el plan que mejor se adapte al tamaño de tu negocio.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { name: "Básico", price: "9.900", desc: "Para profesionales independientes que recién comienzan.", features: ["Hasta 50 turnos/mes", "Página de reservas pública", "Recordatorios básicos", "Soporte por email"] },
              { name: "Profesional", price: "14.900", desc: "Ideal para profesionales con una clientela establecida.", features: ["Turnos ilimitados", "Recordatorios por WhatsApp", "Gestión de clientes", "Integración de pagos", "Soporte prioritario"], popular: true },
              { name: "Premium", price: "19.900", desc: "Para clínicas, academias o equipos pequeños.", features: ["Múltiples profesionales", "Reportes avanzados", "Personalización de marca", "API de integración", "Account manager dedicado"] },
            ].map((plan, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className={`bg-card rounded-2xl border p-8 flex flex-col relative ${plan.popular ? 'border-primary shadow-lg ring-1 ring-primary/20' : 'shadow-sm'}`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    MÁS ELEGIDO
                  </span>
                )}
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-bold">$</span>
                    <span className="text-5xl font-extrabold tracking-tight">{plan.price}</span>
                    <span className="text-muted-foreground ml-1">/mes</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.desc}</p>
                </div>
                <div className="flex-1 space-y-4 mb-8">
                  {plan.features.map((feature, j) => (
                    <div key={j} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                <Button className="w-full" variant={plan.popular ? "default" : "outline"} asChild>
                  <Link href="/register">Probar 14 días gratis</Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">¿Listo para transformar tu forma de trabajar?</h2>
          <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">Únete a miles de profesionales que ya confían en TurnoHub para gestionar sus agendas y hacer crecer sus negocios.</p>
          <Button size="lg" variant="secondary" className="text-lg h-14 px-8" asChild>
            <Link href="/register">Crear cuenta gratis <ChevronRight className="ml-2 h-5 w-5" /></Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
