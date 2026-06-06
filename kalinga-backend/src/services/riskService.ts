export interface VitalsInput {
  systolicBP: number;
  diastolicBP: number;
  heartRate?: number | null;
  gestationalAgeWeeks: number;
  bmi?: number | null;
  proteinUrine: 'negative' | 'trace' | '+1' | '+2' | '+3' | '+4';
  symptoms: string[];
}

export interface PredictionResult {
  normal: number;
  abnormal: number;
  inconclusive: number;
}

export type TriageLevel = 'LOW' | 'MODERATE' | 'HIGH';

export interface RiskAssessment {
  score: number; // 0-100
  level: TriageLevel;
  breakdown: {
    aiComponent: number;
    bpComponent: number;
    proteinuriaComponent: number;
    symptomComponent: number;
    bmiComponent: number;
    gaModifier: number;
  };
}

const PROTEINURIA_MAP: Record<string, number> = {
  negative: 0,
  trace: 0.1,
  '+1': 0.3,
  '+2': 0.6,
  '+3': 0.85,
  '+4': 1.0,
};

const ALL_SYMPTOMS = ['edema', 'headache', 'visual_disturbances', 'epigastric_pain'];

const WEIGHTS = {
  ai: 0.30,
  bp: 0.25,
  proteinuria: 0.15,
  symptoms: 0.15,
  bmi: 0.05,
  ga: 0.10,
};

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function computeRiskScore(
  prediction: PredictionResult,
  vitals: VitalsInput
): RiskAssessment {
  const aiScore = prediction.abnormal;

  const bpScore = sigmoid((vitals.systolicBP - 140) / 10) *
    (vitals.systolicBP >= 120 ? 1 : 0.2);

  const proteinScore = PROTEINURIA_MAP[vitals.proteinUrine] || 0;

  const symptomScore = vitals.symptoms.length / ALL_SYMPTOMS.length;

  let bmiScore = 0;
  if (vitals.bmi) {
    if (vitals.bmi >= 35) bmiScore = 1.0;
    else if (vitals.bmi >= 30) bmiScore = 0.7;
    else if (vitals.bmi >= 25) bmiScore = 0.3;
  }

  const gaModifier = 1.0 + (0.02 * Math.max(0, vitals.gestationalAgeWeeks - 20));

  const rawScore = (
    WEIGHTS.ai * aiScore +
    WEIGHTS.bp * bpScore +
    WEIGHTS.proteinuria * proteinScore +
    WEIGHTS.symptoms * symptomScore +
    WEIGHTS.bmi * bmiScore +
    WEIGHTS.ga * (gaModifier - 1)
  );

  const score = Math.min(100, Math.max(0, Math.round(rawScore * 100)));

  let level: TriageLevel = 'LOW';
  if (score > 60) {
    level = 'HIGH';
  } else if (score > 30) {
    level = 'MODERATE';
  }

  return {
    score,
    level,
    breakdown: {
      aiComponent: Math.round(aiScore * 100),
      bpComponent: Math.round(bpScore * 100),
      proteinuriaComponent: Math.round(proteinScore * 100),
      symptomComponent: Math.round(symptomScore * 100),
      bmiComponent: Math.round(bmiScore * 100),
      gaModifier: Math.round(gaModifier * 100) / 100,
    },
  };
}
