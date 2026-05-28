import type { AllocationBands } from '@/db/schema';

export type RiskProfileLabel = 'conservador' | 'moderado' | 'arriesgado';

export interface RiskProfile {
  label:      RiskProfileLabel;
  horizon:    string;   // Q1 answer id
  reaction:   string;   // Q2 answer id
  goal:       string;   // Q3 answer id
  experience: string;   // Q4 answer id (stored, not scored)
  emotion:    string;   // Q5 answer id (stored, not scored)
  answeredAt: string;   // ISO datetime
}

export interface QuestionOption {
  id:     string;
  label:  string;
  points: number;
}

export interface RiskQuestion {
  id:       string;
  question: string;
  options:  QuestionOption[];
}

export const RISK_QUESTIONS: RiskQuestion[] = [
  {
    id: 'q1',
    question: '¿En cuánto tiempo planeas usar este dinero?',
    options: [
      { id: 'q1_a', label: '< 2 años',  points: 1 },
      { id: 'q1_b', label: '2–5 años',  points: 2 },
      { id: 'q1_c', label: '+5 años',   points: 3 },
    ],
  },
  {
    id: 'q2',
    question: 'Si tu portafolio cae 20%, ¿qué harías?',
    options: [
      { id: 'q2_a', label: 'Retiro todo',  points: 1 },
      { id: 'q2_b', label: 'Mantengo',     points: 2 },
      { id: 'q2_c', label: 'Invierto más', points: 3 },
    ],
  },
  {
    id: 'q3',
    question: '¿Cuál es tu objetivo principal?',
    options: [
      { id: 'q3_a', label: 'Proteger mi capital',                 points: 1 },
      { id: 'q3_b', label: 'Crecimiento moderado',                points: 2 },
      { id: 'q3_c', label: 'Maximizar crecimiento a largo plazo', points: 3 },
    ],
  },
  {
    id: 'q4',
    question: '¿Tienes experiencia previa con inversiones?',
    options: [
      { id: 'q4_a', label: 'No tengo ninguna experiencia', points: 0 },
      { id: 'q4_b', label: 'He usado CDTs o fondos',       points: 0 },
      { id: 'q4_c', label: 'He invertido en ETFs u otros', points: 0 },
    ],
  },
  {
    id: 'q5',
    question: 'Tus inversiones caen 30% en 6 meses. ¿Cómo te sentirías?',
    options: [
      { id: 'q5_a', label: 'Muy angustiado',                  points: 0 },
      { id: 'q5_b', label: 'Preocupado pero mantendría',      points: 0 },
      { id: 'q5_c', label: 'Tranquilo, es parte del proceso', points: 0 },
    ],
  },
];

// Q1 + Q2 + Q3 points. Range 3–9.
// ≤4 → conservador, ≤7 → moderado, ≥8 → arriesgado
export function scoreProfile(
  horizonId:  string,
  reactionId: string,
  goalId:     string,
): RiskProfileLabel {
  const q1 = RISK_QUESTIONS[0].options.find((o) => o.id === horizonId)?.points  ?? 0;
  const q2 = RISK_QUESTIONS[1].options.find((o) => o.id === reactionId)?.points ?? 0;
  const q3 = RISK_QUESTIONS[2].options.find((o) => o.id === goalId)?.points     ?? 0;
  const total = q1 + q2 + q3;
  if (total <= 4) return 'conservador';
  if (total <= 7) return 'moderado';
  return 'arriesgado';
}

export const PROFILE_BANDS: Record<RiskProfileLabel, AllocationBands> = {
  conservador: { cdt_min: 0.65, cdt_max: 0.80, etf_min: 0.20, etf_max: 0.35 },
  moderado:    { cdt_min: 0.50, cdt_max: 0.65, etf_min: 0.35, etf_max: 0.50 },
  arriesgado:  { cdt_min: 0.30, cdt_max: 0.50, etf_min: 0.50, etf_max: 0.70 },
};

export const PROFILE_CONFIG: Record<
  RiskProfileLabel,
  { title: string; description: string; color: string }
> = {
  conservador: {
    title: 'Conservador',
    description:
      'Priorizas la estabilidad del capital. Tu portafolio se inclina hacia renta fija (CDTs) con menor exposición al mercado de renta variable.',
    color: '#5B8E8E',
  },
  moderado: {
    title: 'Moderado',
    description:
      'Buscas equilibrio entre crecimiento y estabilidad. Tu distribución divide el portafolio de forma balanceada entre CDTs y ETFs.',
    color: '#C08552',
  },
  arriesgado: {
    title: 'Arriesgado',
    description:
      'Tu horizonte largo y tolerancia a la volatilidad te permiten mayor exposición a renta variable. Los ETFs son el motor principal de tu portafolio.',
    color: '#6B4E71',
  },
};
