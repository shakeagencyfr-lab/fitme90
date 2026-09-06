import { PRODUCT_NAME } from "@/lib/config";
import type { RpeStep } from "@/lib/fitness";
import type { SensationStep } from "@/lib/circuit";
import type { TourText } from "./tour";
import type { WaiverText } from "./waiver";

// Tout ce qui, en espagnol, ne tient pas dans le dictionnaire à clés.

export const TOUR_ES: TourText[] = [
  { tag: "Bienvenida", title: "Bienvenido a tu espacio 👋", body: "En unos pasos te mostramos dónde está todo. Cada página se abrirá y la pestaña correspondiente quedará destacada. Puedes saltarte esta guía cuando quieras y volver a verla desde tu perfil." },
  { tag: "Programa", title: "1. Tu programa", body: "Tu página de inicio. Arriba del todo, el resumen de tu plan. Justo debajo, tus 3 ciclos para deslizar con el dedo y entender cada fase. Más abajo, puedes cambiar tus días de entrenamiento." },
  { tag: "Agenda", title: "2. Tu agenda", body: "Un calendario real con fechas. Los días de entrenamiento están marcados, hoy está enmarcado, aparece un ✓ en las sesiones validadas. Toca un día para abrir la sesión de ese día." },
  { tag: "Sesión", title: "3. Tu sesión de hoy", body: "Aquí es donde sigues tu entrenamiento, ejercicio a ejercicio. Ahora te muestro, uno a uno, exactamente dónde tocar para rellenar una serie." },
  { tag: "Sesión · 1 de 4", title: "La carga, en kilos", body: "Para cada serie, escribe aquí el peso levantado, en kilos. Por ejemplo 40. Déjalo vacío con el peso corporal (flexiones, plancha)." },
  { tag: "Sesión · 2 de 4", title: "Las repeticiones", body: "Justo al lado, indica el número de repeticiones realmente hechas. Por ejemplo 10. Es esta cifra la que valida la serie." },
  { tag: "Sesión · 3 de 4", title: "El temporizador de descanso", body: "Toca «Descanso» tras tu serie: se lanza un temporizador de recuperación en la parte inferior de la pantalla. Puedes pausarlo, quitarle 15 segundos o detenerlo." },
  { tag: "Sesión · 4 de 4", title: "Validar tu sesión", body: "Cuando tus series estén rellenadas, toca este botón. Rellenar tus cargas cada vez permite al coach ajustarte las cargas correctas después. Puedes repetir o actualizar una sesión cuando quieras." },
  { tag: "Nutrición", title: "4. Tu nutrición", body: "Tus comidas del día, tus macros (día de entrenamiento y día de descanso) y tu lista de la compra, respetando tus alergias y tu dieta. Navega semana a semana y genera recetas." },
  { tag: "Coach IA", title: "5. Tu coach, disponible 24 h", body: "Este botón, abajo a la derecha, está ahí 24 horas al día, 7 días a la semana, durante tu programa. Ábrelo para charlar:", bullets: [
    "Haz tus preguntas, envía una foto de una comida o de una máquina, o dicta por voz.",
    "Puedes crear varias conversaciones (icono ≡ arriba) y recuperarlas cuando quieras.",
    "En tu sesión, el botón «No tengo mi material» le pide una versión adaptada (viaje, hotel).",
  ] },
  { tag: "Regularidad", title: "6. Aguanta en el tiempo", body: "Todo está pensado para ayudarte a llegar al final de tu programa:", bullets: [
    "Tu puntuación de regularidad y tus sesiones validadas se muestran en el inicio.",
    "Una sesión olvidada aparece «por recuperar»: puedes hacerla cuando quieras, tu programa no se desplaza.",
    "En los cardios, se lanza un crono para la duración prevista, con un pitido en los últimos segundos.",
  ] },
  { tag: "Instala la app", title: "7. Instala la app y activa los recordatorios", body: "Para no olvidar nada, instala My Fitness App en tu teléfono y activa las notificaciones. Es lo que marca la diferencia en la regularidad.", bullets: [
    "Android / Chrome: menú ⋮ arriba a la derecha, luego «Instalar aplicación» (o «Añadir a pantalla de inicio»).",
    "iPhone / Safari: botón Compartir (el cuadrado con la flecha), luego «Añadir a pantalla de inicio». Abre después la app desde su icono.",
    "Por último, en Perfil → «Recordatorios de sesión», toca «Activar» y autoriza las notificaciones.",
  ] },
];

export const TOUR_UI_ES = { skip: "Saltar", next: "Siguiente", start: "Vamos" };

export const WAIVER_ES: WaiverText = {
  title: "Exención de responsabilidad y consentimiento informado",
  intro: `${PRODUCT_NAME} ofrece un acompañamiento deportivo y nutricional orientado a la forma física y el bienestar. Según tus respuestas, algunos aspectos de salud merecen una atención especial. No bloqueamos tu acceso, pero te pedimos que leas y aceptes la exención siguiente.`,
  clauses: [
    { title: "Naturaleza del servicio", body: `${PRODUCT_NAME} es un acompañamiento deportivo y nutricional de forma física. No constituye una opinión, un diagnóstico ni un tratamiento médico y no sustituye una consulta con un profesional sanitario.` },
    { title: "Recomendación médica", body: "Teniendo en cuenta los aspectos de salud que he declarado (tratamiento, patología, embarazo u otro), reconozco haber sido informado/a de que se me recomienda recabar la opinión de mi médico antes de empezar o continuar el programa." },
    { title: "Aptitud y responsabilidad", body: "Practico bajo mi propia responsabilidad. Declaro estar en condiciones de practicar actividad física, o me comprometo a obtener una opinión médica favorable. En caso de duda, consulto antes de empezar." },
    { title: "Vigilancia durante la práctica", body: "Me comprometo a adaptar la intensidad a mis sensaciones, a detener inmediatamente cualquier ejercicio en caso de dolor, molestia, falta de aire anormal o malestar, y a consultar a un profesional sanitario si estos síntomas persisten." },
    { title: "Veracidad de la información", body: "Declaro haber informado con sinceridad y exactitud sobre mi situación de salud. Avisaré al coach de cualquier cambio que pueda influir en mi práctica." },
    { title: "Limitación de responsabilidad", body: `Reconozco que ${PRODUCT_NAME} y su coach no podrán ser considerados responsables de las consecuencias de una práctica no conforme a las indicaciones, de información de salud inexacta o incompleta por mi parte, o de una contraindicación no declarada, dentro de los límites permitidos por la ley.` },
    { title: "Datos de salud", body: "La información de salud que comunico se trata de forma confidencial, con mi consentimiento, con el único fin de adaptar mi acompañamiento (conforme al RGPD)." },
  ],
  consent: "He leído y comprendido esta exención. La acepto libremente y con conocimiento de causa.",
  lastStep: "Un último paso",
  consider: "A tener en cuenta:",
  signature: "Firma (nombre y apellidos)",
  signaturePlaceholder: "Tu nombre y apellidos",
  dated: (date) => `Firmado el ${date}. Tu firma electrónica queda fechada y conservada.`,
};

export const RPE_ES: RpeStep[] = [
  { id: "6", label: "Fácil", body: "Podrías hacer 4 repeticiones más" },
  { id: "7", label: "Moderado", body: "3 repeticiones en reserva, la respiración sube" },
  { id: "8", label: "Difícil", body: "2 repeticiones en reserva, la técnica aún aguanta" },
  { id: "9", label: "Muy difícil", body: "1 repetición en reserva, última rep lenta" },
  { id: "10", label: "Máximo", body: "Ninguna repetición en reserva, a evitar en el ciclo 1" },
];

export const RPE_INTRO_ES =
  "No se impone ninguna carga: aún no conoces tus máximos. Elige un peso según sensaciones para alcanzar el RPE objetivo, anota lo que has hecho, y el coach te propondrá las cargas para la siguiente sesión a partir de esos datos.";

export const SENSATIONS_ES: SensationStep[] = [
  { id: 1, label: "Fácil", body: "Podrías aguantar el doble sin forzar, hablas sin quedarte sin aire." },
  { id: 2, label: "Trabaja", body: "La respiración sube, los músculos se calientan, aún puedes hablar con frases cortas." },
  { id: 3, label: "Duro", body: "Cuentas los segundos, solo unas pocas palabras, la técnica aguanta." },
  { id: 4, label: "A tope", body: "Todo lo que tienes hasta la señal, imposible hablar. Reservado a los finishers." },
];

export const SENSATION_INTRO_ES =
  "Nada de carga que anotar aquí: lo que cuenta es lo que sientes durante el esfuerzo. Ajusta tu ritmo (amplitud, velocidad, variante más fácil o más dura) para alcanzar la sensación objetivo, y anótala al final de cada bloque.";

export const RESCUE_WARMUP_ES: { name: string; detail: string }[] = [
  { name: "Subir la temperatura", detail: "3 min de marcha en el sitio, rodillas arriba y luego talones al glúteo, cada vez más rápido." },
  { name: "Movilidad", detail: "Círculos de brazos 10 por sentido, rotaciones de cadera 8 por sentido, sentadillas sin peso 10, zancadas atrás 6 por pierna." },
  { name: "Activación", detail: "1 vuelta del primer bloque a media velocidad, para asentar los apoyos y la respiración." },
];

export const WARMUP_RULES_ES: string[] = [
  "Puente de glúteo 2 x 15, abducciones de pie o con goma 2 x 15 por lado: contrae voluntariamente el glúteo arriba en cada repetición.",
  "1 a 2 series muy ligeras del primer ejercicio de la sesión (alrededor de la mitad de la carga de trabajo), tempo lento, para ajustar la técnica antes de cargar.",
  "Círculos de cadera 8 por sentido, zancadas dinámicas 8 por pierna, balanceos de pierna adelante-atrás 10 por pierna, luego círculos de tobillo 10 por sentido y elevaciones de talones 15.",
  "Círculos de cadera 8 por sentido, balanceos de pierna adelante-atrás y luego laterales 10 por pierna, sentadillas sin peso 10, zancadas dinámicas 8 por pierna.",
  "Círculos de brazos 10 por sentido, rotaciones externas con goma o sin peso 15, elevaciones en Y y en T 10 cada una, flexiones escapulares 10.",
  "Gato-vaca 10, rotaciones torácicas a cuatro patas 8 por lado, aperturas de pecho contra una pared 8 por lado, buenos días con peso corporal 10.",
  "Círculos de tobillo 10 por sentido, rodilla hacia la pared 10 por pierna, elevaciones de talones lentas 15.",
  "Círculos de muñeca 10 por sentido, flexiones y extensiones de muñeca 15, apoyos progresivos sobre las manos en el suelo.",
  "Sentadillas sin peso lentas 10, zancadas cortas 8 por pierna, rodillas arriba en el sitio 20.",
  "Caderas, hombros, tobillos y columna: 6 a 8 movimientos lentos y amplios, sin forzar, 8 a 10 repeticiones cada uno.",
];

export const CARDIO_HOW_ES = "Ritmo fácil, puedes hablar sin quedarte sin aire; sube un poco el ritmo en el último minuto.";

export const ZONE_DEFS_ES: [string, string, string][] = [
  ["Z1", "Recuperación", "Calentamiento, vuelta a la calma, caminar"],
  ["Z2", "Resistencia", "Base cardio, un ritmo al que puedes hablar"],
  ["Z3", "Tempo", "Ritmo sostenido, frases cortas"],
  ["Z4", "Umbral", "Intervalos largos, respiración fuerte"],
  ["Z5", "VO2 máx.", "Sprints cortos, esfuerzo máximo"],
];

interface Expl { why: string; aims: string[]; how: string[] }

export const CYCLE_EXPL_ES: Expl[] = [
  {
    why: "Ponemos los cimientos. Objetivo n.º 1: una técnica limpia y el hábito de venir. (Re)aprendemos los movimientos con cargas controladas e instalamos la regularidad.",
    aims: ["Técnica y amplitud", "Regularidad", "Base cardio"],
    how: ["RPE 6 a 7", "Tempo controlado", "Volumen razonable"],
  },
  {
    why: "Subimos un escalón. El cuerpo aguanta más: aumentamos el volumen y las cargas. Aquí es donde los cambios empiezan a verse de verdad.",
    aims: ["Más volumen", "Mayor densidad", "Progreso visible"],
    how: ["RPE 7 a 8", "Series de más", "Sobrecarga progresiva"],
  },
  {
    why: "El pico. Concentramos el esfuerzo en tu objetivo para ir a por el resultado. La última semana se aligera para recuperar y dejar aparecer el progreso.",
    aims: ["Pico de forma", "Ir al resultado", "Recuperar al final"],
    how: ["RPE 8 a 9 controlado", "Foco en puntos débiles", "Semana de descarga"],
  },
];

export const CYCLE_SINGLE_ES: Expl = {
  why: "Un bloque completo de 4 semanas: instalamos la técnica y la regularidad, subimos progresivamente la intensidad, y la última semana se aligera para recuperar y ver el progreso.",
  aims: ["Técnica y regularidad", "Progreso visible", "Recuperar al final"],
  how: ["RPE 6 a 8", "Sobrecarga progresiva", "Semana 4 aligerada"],
};

export const GEN_PHRASES_ES: string[] = [
  "La sesión que no te saltas es la que cuenta.",
  "Construimos un plan que puedas mantener, no un plan que impresione.",
  "La regularidad vence a la intensidad, todos los meses del año.",
  "Tres meses es poco en una vida. Es mucho en un cuerpo.",
  "El primer objetivo: volver la semana que viene.",
  "Una carga controlada vale más que dos cargas levantadas de cualquier manera.",
  "Tu mejor ejercicio es el que haces correctamente.",
  "El descanso forma parte del programa. No es una pausa en el programa.",
  "No entrenas para estar cansado, entrenas para progresar.",
  "Lo que comes después de la sesión trabaja mientras duermes.",
  "Nadie se hace fuerte en un lunes. Todo el mundo lo consigue en tres meses.",
  "Prepara tu bolsa esta noche. La mitad del trabajo ya está hecho.",
];

export const FORMULAS_ES = {
  mini: {
    name: "Mini",
    tagline: "El programa, y nada más",
    body: "El cliente recibe su programa completo, su nutrición día a día, sus sesiones, su exportación PDF, las recetas, las alternativas de ejercicio y la sesión de emergencia. NO tiene el Coach IA: ni preguntas a cualquier hora, ni foto de alimentos analizada, ni adaptación sobre la marcha.",
    cost: "Este plan solo te cuesta la generación del programa, una vez. Nada después, haga lo que haga el cliente.",
    fit: "Ideal para un precio de entrada, un primer programa, un gran volumen de clientes.",
  },
  max: {
    name: "Max",
    tagline: "El programa y el Coach IA durante toda la duración",
    body: "Todo lo que incluye Mini, más el Coach IA: el cliente hace sus preguntas a cualquier hora, adapta sus sesiones (lesión, material que falta, horario), fotografía sus alimentos para una receta, y recibe propuestas de cargas a partir de lo que realmente ha levantado.",
    cost: "Cada intercambio con el Coach IA se te cobra. Ajustas abajo cuántos incluyes al día y por cliente: ese ajuste es el que acota tu gasto.",
    fit: "Ideal para un programa vendido más caro y un seguimiento VIP.",
  },
};
