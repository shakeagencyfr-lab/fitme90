import type { Audience } from "@/components/landing-templates/coach-copy";
import type { SiteCopy } from "./site-copy";

// Textes du mini-site de présentation, en espagnol.
export const ES = (audience: Audience): SiteCopy => ({
  navAbout: "El lugar",
  navServices: "Servicios",
  navPractical: "Info práctica",
  navReviews: "Reseñas",
  navPrograms: "Programas en línea",
  defaultIntro: (name) =>
    audience === "gym"
      ? `${name} recibe a sus socios toda la semana: material completo, equipo presente en la sala, y un seguimiento que continúa fuera del gimnasio.`
      : `${name} acompaña a sus clientes en sesión y en el día a día: un plan que tiene en cuenta tu nivel, tu material y tu horario.`,
  aboutChip: audience === "gym" ? "El gimnasio" : "El coach",
  aboutTitle: audience === "gym" ? "Lo que encuentras aquí" : "Quién te acompaña",
  servicesChip: "Servicios",
  servicesTitle: "Lo que se ofrece",
  defaultServices:
    audience === "gym"
      ? [
          { title: "Acceso libre", body: "La sala, las máquinas y los espacios libres en horario de apertura." },
          { title: "Clases colectivas", body: "Sesiones dirigidas en grupo reducido, del fortalecimiento al cardio." },
          { title: "Seguimiento personalizado", body: "Un programa construido para ti, ajustado semana a semana." },
        ]
      : [
          { title: "Sesión individual", body: "Una cita cara a cara, técnica y progresión corregidas en directo." },
          { title: "Seguimiento a distancia", body: "Un programa construido para ti, revisado regularmente según tus resultados." },
          { title: "Valoración y objetivos", body: "Un punto de partida medido, un rumbo claro, etapas alcanzables." },
        ],
  galleryChip: "En imágenes",
  galleryTitle: "El lugar en fotos",
  practicalChip: "Info práctica",
  practicalTitle: "Dónde y cuándo",
  addressLabel: "Dirección",
  hoursLabel: "Horarios",
  phoneLabel: "Teléfono",
  websiteLabel: "Web",
  itinerary: "Cómo llegar",
  call: "Llamar",
  reviewsChip: "Reseñas",
  reviewsTitle: "Lo que dicen los clientes",
  reviewsOn: (n) => `${n} reseñas`,
  programsChip: "En línea",
  defaultProgramsTitle: "El seguimiento continúa en tu casa",
  defaultProgramsText: (name) =>
    `Entre dos sesiones, ${name} te sigue en una aplicación: tu programa día a día, tus comidas, tus cargas, y un coach disponible cuando lo necesitas.`,
  programsBullets: [
    "Un programa construido sobre tu objetivo, tu nivel y tu material",
    "La nutrición que lo acompaña, recalculada según tus resultados",
    "Tus sesiones registradas, tus cargas seguidas, tu progreso visible",
  ],
  seePrograms: "Ver los programas",
  freeProgram: "Prueba gratis",
  freeProgramBody: "Responde a unas preguntas y recibe un mini-programa personalizado, sin compromiso.",
  login: "Iniciar sesión",
  closed: "Cerrado",
  legal: "Aviso legal",
});
