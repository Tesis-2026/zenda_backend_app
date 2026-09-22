export const FINANCIAL_LITERACY_QUESTIONNAIRE_VERSION = 'FINLIT_PRE_V1';
export const FINANCIAL_LITERACY_CONSENT_VERSION = 'FINLIT_CONSENT_V1';
export const FINANCIAL_LITERACY_TOTAL_QUESTIONS = 12;

export const FINANCIAL_LITERACY_CONSENT_TEXT =
  'El presente cuestionario forma parte de una investigación académica sobre educación financiera y toma de decisiones económicas.\n\n' +
  'Tus respuestas serán tratadas de manera estrictamente confidencial y se utilizarán únicamente con fines científicos y de mejora de la aplicación.\n\n' +
  'La información se procesa de forma seudónima, sin asociar directamente tu identidad personal a los resultados obtenidos.\n\n' +
  'Completar la evaluación inicial es indispensable para el desarrollo del estudio. Te pedimos responder con sinceridad.';

export interface QuestionOption {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface FinancialLiteracyQuestionDefinition {
  questionId: string;
  order: number;
  domain:
    | 'PLANIFICACION'
    | 'AHORRO'
    | 'CONOCIMIENTO_FINANCIERO'
    | 'INFLACION'
    | 'RIESGO'
    | 'CREDITO'
    | 'SEGURIDAD_FINANCIERA';
  questionText: string;
  options: QuestionOption[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  scoreValue: number;
}

export interface PublicFinancialLiteracyQuestion {
  questionId: string;
  order: number;
  domain: string;
  questionText: string;
  options: QuestionOption[];
}

export interface ScoredQuestionResult {
  questionId: string;
  domain: string;
  selectedOption: string;
  isCorrect: boolean;
  score: number;
}

export interface AssessmentScoringResult {
  totalScore: number;
  maxScore: number;
  scoredAnswers: ScoredQuestionResult[];
}

export const FINANCIAL_LITERACY_QUESTIONS: FinancialLiteracyQuestionDefinition[] = [
  {
    questionId: 'Q1',
    order: 1,
    domain: 'PLANIFICACION',
    questionText: '¿Cuál es la principal finalidad de elaborar un presupuesto personal?',
    options: [
      { id: 'A', text: 'Registrar únicamente las deudas.' },
      { id: 'B', text: 'Planificar y controlar ingresos y gastos.' },
      { id: 'C', text: 'Aumentar automáticamente los ingresos.' },
      { id: 'D', text: 'Evitar utilizar productos financieros.' },
    ],
    correctAnswer: 'B',
    scoreValue: 1,
  },
  {
    questionId: 'Q2',
    order: 2,
    domain: 'AHORRO',
    questionText: '¿Cuál es el principal objetivo de contar con un fondo de emergencia?',
    options: [
      { id: 'A', text: 'Financiar compras impulsivas.' },
      { id: 'B', text: 'Tener dinero disponible para gastos imprevistos.' },
      { id: 'C', text: 'Obtener mayores líneas de crédito.' },
      { id: 'D', text: 'Reemplazar todos los seguros.' },
    ],
    correctAnswer: 'B',
    scoreValue: 1,
  },
  {
    questionId: 'Q3',
    order: 3,
    domain: 'PLANIFICACION',
    questionText: 'Si una persona tiene recursos limitados, ¿qué debería priorizar primero?',
    options: [
      { id: 'A', text: 'Gastos esenciales como alimentación, vivienda y transporte.' },
      { id: 'B', text: 'Entretenimiento.' },
      { id: 'C', text: 'Compras por promociones.' },
      { id: 'D', text: 'Productos que desea aunque no necesite.' },
    ],
    correctAnswer: 'A',
    scoreValue: 1,
  },
  {
    questionId: 'Q4',
    order: 4,
    domain: 'PLANIFICACION',
    questionText: '¿Cuál de los siguientes es normalmente un gasto variable?',
    options: [
      { id: 'A', text: 'Una cuota mensual fija de alquiler.' },
      { id: 'B', text: 'Una pensión mensual con monto fijo.' },
      { id: 'C', text: 'El gasto mensual en entretenimiento.' },
      { id: 'D', text: 'Una cuota fija de un préstamo.' },
    ],
    correctAnswer: 'C',
    scoreValue: 1,
  },
  {
    questionId: 'Q5',
    order: 5,
    domain: 'CONOCIMIENTO_FINANCIERO',
    questionText:
      'Si depositas S/ 100 en una cuenta que paga 10 % de interés anual y no retiras dinero, ¿cuánto tendrás aproximadamente después de un año?',
    options: [
      { id: 'A', text: 'S/ 100' },
      { id: 'B', text: 'S/ 105' },
      { id: 'C', text: 'S/ 110' },
      { id: 'D', text: 'S/ 120' },
    ],
    correctAnswer: 'C',
    scoreValue: 1,
  },
  {
    questionId: 'Q6',
    order: 6,
    domain: 'INFLACION',
    questionText:
      'Si tus ingresos se mantienen iguales pero los precios aumentan debido a la inflación, ¿qué ocurre con tu poder adquisitivo?',
    options: [
      { id: 'A', text: 'Aumenta.' },
      { id: 'B', text: 'Disminuye.' },
      { id: 'C', text: 'Permanece necesariamente igual.' },
      { id: 'D', text: 'Se duplica.' },
    ],
    correctAnswer: 'B',
    scoreValue: 1,
  },
  {
    questionId: 'Q7',
    order: 7,
    domain: 'RIESGO',
    questionText: '¿Qué estrategia generalmente ayuda a reducir el riesgo al invertir?',
    options: [
      { id: 'A', text: 'Colocar todo el dinero en una sola inversión.' },
      { id: 'B', text: 'Pedir dinero prestado para invertir más.' },
      { id: 'C', text: 'Distribuir el dinero entre diferentes alternativas de inversión.' },
      { id: 'D', text: 'Elegir únicamente la inversión que tuvo mayor rentabilidad el mes anterior.' },
    ],
    correctAnswer: 'C',
    scoreValue: 1,
  },
  {
    questionId: 'Q8',
    order: 8,
    domain: 'CREDITO',
    questionText:
      'Si deseas comparar dos préstamos similares, ¿qué indicador permite conocer mejor el costo total del crédito en Perú?',
    options: [
      { id: 'A', text: 'El monto de la primera cuota.' },
      { id: 'B', text: 'La TCEA.' },
      { id: 'C', text: 'El número de publicidad del banco.' },
      { id: 'D', text: 'El límite disponible de la tarjeta.' },
    ],
    correctAnswer: 'B',
    scoreValue: 1,
  },
  {
    questionId: 'Q9',
    order: 9,
    domain: 'CREDITO',
    questionText:
      '¿Qué puede ocurrir si una persona paga repetidamente sus créditos después de la fecha de vencimiento?',
    options: [
      { id: 'A', text: 'La deuda desaparece progresivamente.' },
      { id: 'B', text: 'Puede generar intereses, penalidades y afectar su historial crediticio.' },
      { id: 'C', text: 'El banco aumenta automáticamente sus ahorros.' },
      { id: 'D', text: 'No ocurre nada mientras pague algún monto.' },
    ],
    correctAnswer: 'B',
    scoreValue: 1,
  },
  {
    questionId: 'Q10',
    order: 10,
    domain: 'CREDITO',
    questionText: 'Antes de solicitar un préstamo, ¿qué debería evaluar principalmente una persona?',
    options: [
      { id: 'A', text: 'Solamente cuánto dinero le ofrecen.' },
      { id: 'B', text: 'Sus ingresos, gastos, deudas existentes y capacidad para pagar las cuotas.' },
      { id: 'C', text: 'Únicamente el número de cuotas.' },
      { id: 'D', text: 'Si otras personas también solicitaron el mismo préstamo.' },
    ],
    correctAnswer: 'B',
    scoreValue: 1,
  },
  {
    questionId: 'Q11',
    order: 11,
    domain: 'SEGURIDAD_FINANCIERA',
    questionText:
      'Si recibes un mensaje que aparenta ser de una entidad financiera solicitando tu clave, CVV o código de verificación, ¿qué deberías hacer?',
    options: [
      { id: 'A', text: 'Compartir los datos si el mensaje parece urgente.' },
      { id: 'B', text: 'Compartir únicamente el código de verificación.' },
      { id: 'C', text: 'No compartirlos y verificar la comunicación mediante los canales oficiales.' },
      { id: 'D', text: 'Responder solicitando más información personal del remitente.' },
    ],
    correctAnswer: 'C',
    scoreValue: 1,
  },
  {
    questionId: 'Q12',
    order: 12,
    domain: 'AHORRO',
    questionText: '¿Cuál de las siguientes prácticas favorece mejor el cumplimiento de una meta de ahorro?',
    options: [
      { id: 'A', text: 'Ahorrar únicamente cuando sobra dinero de manera ocasional.' },
      { id: 'B', text: 'Definir una meta, un monto y un plazo, y separar dinero periódicamente.' },
      { id: 'C', text: 'Utilizar crédito cada vez que no alcance el dinero.' },
      { id: 'D', text: 'Posponer indefinidamente el ahorro hasta tener mayores ingresos.' },
    ],
    correctAnswer: 'B',
    scoreValue: 1,
  },
];

const questionMap = new Map<string, FinancialLiteracyQuestionDefinition>(
  FINANCIAL_LITERACY_QUESTIONS.map((q) => [q.questionId, q]),
);

/**
 * Returns questions for client consumption.
 * STRICTLY OMITS correctAnswer and scoreValue to avoid exposing key.
 */
export function getPublicFinancialLiteracyQuestions(): PublicFinancialLiteracyQuestion[] {
  return FINANCIAL_LITERACY_QUESTIONS.map((q) => ({
    questionId: q.questionId,
    order: q.order,
    domain: q.domain,
    questionText: q.questionText,
    options: q.options.map((opt) => ({ id: opt.id, text: opt.text })),
  }));
}

export function getQuestionById(questionId: string): FinancialLiteracyQuestionDefinition | undefined {
  return questionMap.get(questionId);
}

export function isValidQuestionId(questionId: string): boolean {
  return questionMap.has(questionId);
}

export function isValidOptionForQuestion(questionId: string, optionId: string): boolean {
  const q = questionMap.get(questionId);
  if (!q) return false;
  return q.options.some((opt) => opt.id === optionId);
}

/**
 * Validates and scores answers server-side.
 */
export function scoreFinancialLiteracyAnswers(
  answers: Record<string, string>,
): AssessmentScoringResult {
  const scoredAnswers: ScoredQuestionResult[] = [];
  let totalScore = 0;

  for (const q of FINANCIAL_LITERACY_QUESTIONS) {
    const selected = answers[q.questionId];
    if (!selected) {
      throw new Error(`Falta responder la pregunta ${q.questionId}`);
    }

    const validOption = q.options.some((opt) => opt.id === selected);
    if (!validOption) {
      throw new Error(`Opción inválida '${selected}' para la pregunta ${q.questionId}`);
    }

    const isCorrect = selected === q.correctAnswer;
    const score = isCorrect ? q.scoreValue : 0;
    totalScore += score;

    scoredAnswers.push({
      questionId: q.questionId,
      domain: q.domain,
      selectedOption: selected,
      isCorrect,
      score,
    });
  }

  return {
    totalScore,
    maxScore: FINANCIAL_LITERACY_TOTAL_QUESTIONS,
    scoredAnswers,
  };
}
