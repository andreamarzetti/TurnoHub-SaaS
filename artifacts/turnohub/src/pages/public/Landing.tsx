import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Calendar,
  Users,
  Clock,
  CreditCard,
  ChevronRight,
  CheckCircle2,
  MessageCircle,
  BarChart3,
  Star,
  X,
  Check,
  Smartphone,
  Zap,
  Shield,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

function CalendarMockup() {
  const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const appointments = [
    { day: 0, start: 1, len: 1, name: "Ana García", color: "bg-primary/20 border-primary/40 text-primary" },
    { day: 1, start: 0, len: 2, name: "Carlos López", color: "bg-emerald-100 border-emerald-300 text-emerald-700" },
    { day: 2, start: 2, len: 1, name: "María Paz", color: "bg-teal-100 border-teal-300 text-teal-700" },
    { day: 3, start: 1, len: 1, name: "Juan Torres", color: "bg-cyan-100 border-cyan-300 text-cyan-700" },
    { day: 4, start: 0, len: 1, name: "Sofía Ruiz", color: "bg-primary/20 border-primary/40 text-primary" },
    { day: 5, start: 1, len: 2, name: "Pedro Díaz", color: "bg-emerald-100 border-emerald-300 text-emerald-700" },
  ];
  const slots = ["9:00", "10:00", "11:00"];

  return (
    <div className="bg-white rounded-2xl border shadow-2xl overflow-hidden w-full max-w-lg mx-auto">
      <div className="bg-primary px-4 py-3 flex items-center justify-between">
        <span className="text-white font-semibold text-sm">Junio 2026</span>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-white/50" />
          <div className="h-2 w-2 rounded-full bg-white/50" />
          <div className="h-2 w-2 rounded-full bg-white" />
        </div>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-7 gap-1 mb-2">
          <div className="text-xs text-muted-foreground font-medium py-1" />
          {days.map((d) => (
            <div key={d} className="text-xs font-semibold text-center text-foreground/70 py-1">{d}</div>
          ))}
        </div>
        {slots.map((slot, row) => (
          <div key={slot} className="grid grid-cols-7 gap-1 mb-1">
            <div className="text-xs text-muted-foreground pt-1">{slot}</div>
            {days.map((_, col) => {
              const appt = appointments.find((a) => a.day === col && a.start === row);
              if (appt) {
                return (
                  <div
                    key={col}
                    className={`rounded-md border px-1 py-1 text-xs font-medium truncate ${appt.color}`}
                    style={{ gridRow: `span ${appt.len}` }}
                  >
                    {appt.name.split(" ")[0]}
                  </div>
                );
              }
              const blocked = appointments.find((a) => a.day === col && a.start < row && a.start + a.len > row);
              if (blocked) return null;
              return <div key={col} className="h-8 rounded-md bg-muted/30 border border-dashed border-muted" />;
            })}
          </div>
        ))}
      </div>
      <div className="border-t px-4 py-3 bg-muted/20 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">6 turnos esta semana</span>
        <span className="text-xs font-semibold text-primary">Ver todos</span>
      </div>
    </div>
  );
}

const PROFESSIONS = [
  { emoji: "🎾", name: "Profe de tenis" },
  { emoji: "🥗", name: "Nutricionista" },
  { emoji: "🧠", name: "Psicólogo/a" },
  { emoji: "✂️", name: "Barbero/Peluquero" },
  { emoji: "💪", name: "Personal trainer" },
  { emoji: "📚", name: "Tutor/Profesor" },
  { emoji: "💆", name: "Masajista" },
  { emoji: "🦷", name: "Odontólogo/a" },
];

const TESTIMONIALS = [
  {
    name: "Andrea Marzetti",
    role: "Profesora de tenis",
    text: "Antes perdía una hora por día coordinando turnos por WhatsApp. Ahora mis alumnos reservan solos y yo solo confirmo. Un cambio total.",
    stars: 5,
  },
  {
    name: "Gastón Pereyra",
    role: "Nutricionista clínico",
    text: "Mis pacientes reciben el recordatorio automático y casi no tengo ausencias. El dashboard de estadísticas me ayuda a ver qué servicios funcionan mejor.",
    stars: 5,
  },
  {
    name: "Romina Castillo",
    role: "Barbería Estudio RC",
    text: "Tengo 3 barberos y con el plan Premium cada uno maneja su agenda. Mis clientes dicen que les encanta poder reservar a cualquier hora.",
    stars: 5,
  },
];

const FAQ = [
  {
    q: "¿Necesito saber de tecnología para usarlo?",
    a: "No. TurnoHub está diseñado para ser tan simple como enviar un mensaje de WhatsApp. En menos de 10 minutos tenés tu agenda online funcionando.",
  },
  {
    q: "¿Cómo llegan los turnos al cliente?",
    a: "El cliente entra a tu link personal (turnohub.com/tu-nombre), elige el servicio, el día y el horario. Recibe confirmación automática por email y recordatorio 24hs antes.",
  },
  {
    q: "¿Puedo probar antes de pagar?",
    a: "Sí, tenés 14 días gratis sin necesidad de tarjeta de crédito. Al finalizar el período de prueba, elegís el plan que mejor te quede.",
  },
  {
    q: "¿Funciona en el celular?",
    a: "Sí, tanto el panel del profesional como la página pública de reservas están optimizados para móvil.",
  },
  {
    q: "¿Puedo cancelar cuando quiero?",
    a: "Sí. No hay permanencia. Podés cancelar en cualquier momento desde tu panel de configuración.",
  },
];

export default function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="flex-1 bg-background overflow-x-hidden">

      {/* HERO */}
      <section className="relative py-16 md:py-28 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
              className="space-y-6"
            >
              <motion.div variants={fadeUp} custom={0}>
                <span className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-3 py-1.5 rounded-full">
                  <Zap className="h-3.5 w-3.5" /> 14 días gratis · Sin tarjeta
                </span>
              </motion.div>
              <motion.h1 variants={fadeUp} custom={1} className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
                Gestioná tus turnos en <span className="text-primary">minutos.</span>
              </motion.h1>
              <motion.p variants={fadeUp} custom={2} className="text-lg text-muted-foreground max-w-lg">
                Menos mensajes de WhatsApp. Más clientes. Más tiempo para vos. La plataforma de reservas online para profesionales en Latinoamérica.
              </motion.p>
              <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button size="lg" className="text-base h-12 px-8 rounded-xl shadow-md shadow-primary/25" asChild>
                  <Link href="/register">
                    Probar gratis 14 días <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="text-base h-12 px-8 rounded-xl" asChild>
                  <Link href="/login">Ya tengo cuenta</Link>
                </Button>
              </motion.div>
              <motion.div variants={fadeUp} custom={4} className="flex items-center gap-4 pt-2">
                <div className="flex -space-x-2">
                  {["A","G","R","M"].map((l, i) => (
                    <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">{l}</div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">+500 profesionales</span> ya usan TurnoHub
                </p>
              </motion.div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl blur-2xl" />
              <CalendarMockup />
              <div className="absolute -bottom-4 -right-4 bg-white rounded-xl border shadow-lg px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nuevo turno</p>
                  <p className="text-sm font-semibold">Ana García — 10:00 hs</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight mb-3">Empezá en 3 pasos</h2>
            <p className="text-muted-foreground text-lg">Sin complicaciones. Sin necesidad de saber de tecnología.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />
            {[
              { step: "1", icon: Smartphone, title: "Registrate gratis", desc: "Creá tu cuenta en menos de 2 minutos. Sin tarjeta de crédito." },
              { step: "2", icon: Calendar, title: "Configurá tus servicios", desc: "Agregá tus servicios, precios y horarios disponibles fácilmente." },
              { step: "3", icon: Users, title: "Compartí tu link", desc: "Enviá tu link personal y tus clientes reservan solos, 24/7." },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="flex flex-col items-center text-center relative"
              >
                <div className="h-20 w-20 rounded-2xl bg-primary shadow-lg shadow-primary/30 flex items-center justify-center mb-4 relative z-10">
                  <s.icon className="h-9 w-9 text-white" />
                </div>
                <span className="text-xs font-bold text-primary mb-1">PASO {s.step}</span>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight mb-3">Todo lo que necesitás para tu negocio</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Herramientas poderosas pero simples, diseñadas para que te enfoques en tus clientes.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Calendar, title: "Calendario visual", desc: "Vista de día, semana y mes con colores. Ves tus turnos de un vistazo." },
              { icon: MessageCircle, title: "WhatsApp automático", desc: "Confirmación, cancelación y recordatorio 24hs antes. Sin hacer nada." },
              { icon: Users, title: "Base de clientes", desc: "Historial completo de cada cliente, sus preferencias y asistencias." },
              { icon: CreditCard, title: "Cobros integrados", desc: "Aceptá pago completo, seña o presencial. Con Mercado Pago." },
              { icon: BarChart3, title: "Estadísticas", desc: "Ingresos del mes, clientes nuevos, servicios más pedidos, inasistencias." },
              { icon: Shield, title: "14 días gratis", desc: "Probá sin compromiso. Sin tarjeta. Cancelás cuando querés." },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group bg-card rounded-xl border p-6 hover:border-primary/50 hover:shadow-md transition-all"
              >
                <div className="h-11 w-11 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center mb-4 transition-colors">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PROFESIONES */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-3">Para tu profesión</h2>
          <p className="text-muted-foreground text-lg mb-10">TurnoHub se adapta a cualquier profesional que trabaje con turnos.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {PROFESSIONS.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-xl border p-4 hover:border-primary/50 hover:shadow-sm transition-all"
              >
                <div className="text-3xl mb-2">{p.emoji}</div>
                <p className="text-sm font-medium">{p.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* VS AGENDA MANUAL */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-3">TurnoHub vs. Agenda manual</h2>
            <p className="text-muted-foreground text-lg">Deja de perder tiempo coordinando por WhatsApp.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border bg-red-50/50 p-6">
              <h3 className="font-bold text-lg mb-4 text-red-600 flex items-center gap-2">
                <X className="h-5 w-5" /> Agenda manual
              </h3>
              <ul className="space-y-3">
                {[
                  "Horas perdidas coordinando por WhatsApp",
                  "Turnos dobles por errores humanos",
                  "Clientes que olvidan y no avisan",
                  "No sabés cuánto ganaste en el mes",
                  "Difícil de reprogramar y cancelar",
                  "Tu agenda no está disponible 24/7",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                    <X className="h-4 w-4 mt-0.5 shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
              <h3 className="font-bold text-lg mb-4 text-primary flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" /> Con TurnoHub
              </h3>
              <ul className="space-y-3">
                {[
                  "Clientes reservan solos desde tu link",
                  "Imposible tener turnos superpuestos",
                  "Recordatorios automáticos por WhatsApp",
                  "Dashboard con ingresos en tiempo real",
                  "Reprogramar con un clic",
                  "Tu agenda disponible las 24 horas",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-primary/80">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-3">Lo que dicen nuestros profesionales</h2>
            <p className="text-muted-foreground text-lg">Miles de profesionales ya confían en TurnoHub.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-2xl border p-6 shadow-sm"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-foreground/80 mb-5 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight mb-3">Planes simples y transparentes</h2>
            <p className="text-muted-foreground text-lg">14 días gratis en todos los planes. Sin tarjeta de crédito.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Básico",
                price: "9.900",
                desc: "Para profesionales independientes que recién comienzan.",
                features: ["Hasta 3 servicios", "Hasta 50 turnos/mes", "Página de reserva pública", "Confirmación por email", "Historial de clientes"],
              },
              {
                name: "Profesional",
                price: "14.900",
                desc: "Ideal para profesionales con clientela establecida.",
                features: ["Hasta 10 servicios", "Hasta 200 turnos/mes", "Recordatorios por WhatsApp", "Reprogramar y cancelar", "Historial completo", "Redes sociales"],
                popular: true,
              },
              {
                name: "Premium",
                price: "19.900",
                desc: "Para clínicas, academias o equipos pequeños.",
                features: ["Servicios ilimitados", "Turnos ilimitados", "Todo lo del plan Profesional", "Múltiples profesionales", "Mercado Pago integrado", "Soporte prioritario"],
              },
            ].map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`bg-card rounded-2xl border p-7 flex flex-col relative ${
                  plan.popular ? "border-primary shadow-xl shadow-primary/10 ring-2 ring-primary/20" : "shadow-sm"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-md">
                    Más elegido
                  </span>
                )}
                <div className="mb-7">
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-2xl font-bold text-muted-foreground">$</span>
                    <span className="text-5xl font-extrabold tracking-tight">{plan.price}</span>
                    <span className="text-muted-foreground text-sm ml-1">/mes</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.desc}</p>
                </div>
                <div className="flex-1 space-y-3 mb-7">
                  {plan.features.map((feature, j) => (
                    <div key={j} className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full rounded-xl"
                  variant={plan.popular ? "default" : "outline"}
                  asChild
                >
                  <Link href="/register">Probar 14 días gratis</Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight mb-3">Preguntas frecuentes</h2>
          </div>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <div
                key={i}
                className="bg-card rounded-xl border overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-sm hover:text-primary transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span>{item.q}</span>
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${openFaq === i ? "rotate-90" : ""}`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <Clock className="h-12 w-12 mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Empezá hoy. Es gratis por 14 días.
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
            Sin tarjeta de crédito. Sin permanencia. En minutos tenés tu agenda online lista para recibir reservas.
          </p>
          <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-bold text-base h-13 px-10 rounded-xl shadow-lg" asChild>
            <Link href="/register">
              Crear mi cuenta gratis <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* FLOATING CTA - mobile */}
      <div className="fixed bottom-4 left-4 right-4 z-50 md:hidden">
        <Button className="w-full rounded-xl h-13 text-base shadow-xl shadow-primary/40" asChild>
          <Link href="/register">
            Probar gratis 14 días <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
