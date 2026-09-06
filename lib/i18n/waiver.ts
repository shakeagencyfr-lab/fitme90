import { PRODUCT_NAME } from "@/lib/config";
import { MEDICAL_WAIVER_TITLE, MEDICAL_WAIVER_INTRO, MEDICAL_WAIVER_CLAUSES, MEDICAL_WAIVER_CONSENT } from "@/lib/legal";
import { pick, type Locale, type LocalText } from "./index";
import { WAIVER_DE } from "./pack-de";
import { WAIVER_ES } from "./pack-es";

// Décharge médicale dans la langue du client (la source française vit dans lib/legal).
export interface WaiverText {
  title: string;
  intro: string;
  clauses: { title: string; body: string }[];
  consent: string;
  lastStep: string;
  consider: string;
  signature: string;
  signaturePlaceholder: string;
  dated: (date: string) => string;
}

const EN: WaiverText = {
  title: "Liability waiver and informed consent",
  intro: `${PRODUCT_NAME} offers sports and nutrition coaching for fitness and wellbeing. Based on your answers, some health elements deserve particular care. We do not block your access, but we ask you to read and accept the waiver below.`,
  clauses: [
    { title: "Nature of the service", body: `${PRODUCT_NAME} is fitness-oriented sports and nutrition coaching. It is not medical advice, diagnosis or treatment and does not replace a consultation with a healthcare professional.` },
    { title: "Medical recommendation", body: "Given the health elements I declared (treatment, condition, pregnancy or other), I acknowledge having been informed that it is recommended to seek my doctor's advice before starting or continuing the program." },
    { title: "Fitness and responsibility", body: "I train under my own responsibility. I declare being able to practise physical activity, or I commit to obtaining a favourable medical opinion. If in doubt, I consult before starting." },
    { title: "Care during practice", body: "I commit to adapting intensity to how I feel, to stopping any exercise immediately in case of pain, discomfort, abnormal breathlessness or faintness, and to consulting a healthcare professional if these symptoms persist." },
    { title: "Accuracy of information", body: "I declare having reported my health situation truthfully and accurately. I will inform the coach of any change likely to affect my practice." },
    { title: "Limitation of liability", body: `I acknowledge that ${PRODUCT_NAME} and its coach cannot be held responsible for the consequences of practice not following the instructions, of inaccurate or incomplete health information on my part, or of an undisclosed contraindication, within the limits allowed by law.` },
    { title: "Health data", body: "The health information I provide is processed confidentially, with my consent, for the sole purpose of adapting my coaching (in accordance with the GDPR)." },
  ],
  consent: "I have read and understood this waiver. I accept it freely and knowingly.",
  lastStep: "One last step",
  consider: "To take into account:",
  signature: "Signature (full name)",
  signaturePlaceholder: "Your full name",
  dated: (date) => `Signed on ${date}. Your electronic signature is time-stamped and stored.`,
};

const FR: WaiverText = {
  title: MEDICAL_WAIVER_TITLE,
  intro: MEDICAL_WAIVER_INTRO,
  clauses: MEDICAL_WAIVER_CLAUSES,
  consent: MEDICAL_WAIVER_CONSENT,
  lastStep: "Une dernière étape",
  consider: "À prendre en compte :",
  signature: "Signature (nom et prénom)",
  signaturePlaceholder: "Ton nom et prénom",
  dated: (date) => `Fait le ${date}. Ta signature électronique est horodatée et conservée.`,
};

const TEXTS: LocalText<WaiverText> = { fr: FR, en: EN, de: WAIVER_DE, es: WAIVER_ES };

export function waiverText(locale: Locale): WaiverText {
  return pick(TEXTS, locale);
}
