import { SurveyType } from '@prisma/client';
import { SurveyQuestionJson } from './survey-question.types';

const financialLiteracyQuestions: Array<
  Omit<SurveyQuestionJson, 'id'> & { order: number }
> = [
  {
    order: 1,
    text: '¿Qué significa la regla de presupuesto 50/30/20?',
    options: [
      '50% necesidades, 30% deseos, 20% ahorro',
      '50% ahorro, 30% necesidades, 20% deseos',
      '50% deseos, 30% ahorro, 20% necesidades',
      'Se refiere a impuestos en Perú',
    ],
    correctAnswer: '50% necesidades, 30% deseos, 20% ahorro',
  },
  {
    order: 2,
    text: '¿Qué es la TEA (Tasa Efectiva Anual)?',
    options: [
      'La tasa nominal anual sin capitalización',
      'La tasa anual efectiva que considera capitalización',
      'Un impuesto del gobierno a las cuentas bancarias',
      'Un indicador de inflación en Perú',
    ],
    correctAnswer: 'La tasa anual efectiva que considera capitalización',
  },
  {
    order: 3,
    text: '¿Cuál de estos gastos es una necesidad según la regla 50/30/20?',
    options: [
      'Suscripción de streaming',
      'Alquiler o vivienda',
      'Salida con amigos',
      'Zapatillas nuevas por gusto',
    ],
    correctAnswer: 'Alquiler o vivienda',
  },
  {
    order: 4,
    text: '¿Qué significa pagarte primero?',
    options: [
      'Gastar en gustos antes de pagar cuentas',
      'Separar ahorro apenas recibes ingresos',
      'Pagar deudas antes de registrar gastos',
      'Darte una propina semanal',
    ],
    correctAnswer: 'Separar ahorro apenas recibes ingresos',
  },
  {
    order: 5,
    text: 'Si ahorras S/10 por semana, ¿cuánto tendrías aproximadamente después de un año?',
    options: ['S/240', 'S/520', 'S/1,200', 'S/50'],
    correctAnswer: 'S/520',
  },
  {
    order: 6,
    text: '¿Para qué se usa la regla del 72?',
    options: [
      'Calcular cuotas mensuales de un préstamo',
      'Estimar en cuántos años se duplica una inversión',
      'Determinar el límite ideal de una tarjeta',
      'Calcular ahorro ajustado por inflación',
    ],
    correctAnswer: 'Estimar en cuántos años se duplica una inversión',
  },
  {
    order: 7,
    text: '¿Qué billetera digital está asociada al Banco de Crédito del Perú (BCP)?',
    options: ['Plin', 'Yape', 'Tunki', 'Lukita'],
    correctAnswer: 'Yape',
  },
  {
    order: 8,
    text: '¿Qué es la inflación?',
    options: [
      'Una disminución del poder de compra del dinero con el tiempo',
      'Un aumento en la tasa de ahorro personal',
      'La tasa de interés de bonos del gobierno',
      'Un impuesto a productos importados',
    ],
    correctAnswer:
      'Una disminución del poder de compra del dinero con el tiempo',
  },
  {
    order: 9,
    text: '¿Cuántos meses de gastos debería cubrir idealmente un fondo de emergencia?',
    options: ['1 mes', '2 meses', '3 a 6 meses', '12 meses'],
    correctAnswer: '3 a 6 meses',
  },
  {
    order: 10,
    text: 'Si no pagas el total de tu tarjeta de crédito, los intereses se aplican sobre:',
    options: [
      'Solo las compras nuevas del mes',
      'El saldo pendiente, acumulándose cada ciclo',
      'Solo el monto del pago mínimo',
      'Nada; basta con pagar el mínimo',
    ],
    correctAnswer: 'El saldo pendiente, acumulándose cada ciclo',
  },
];

const toSurveyQuestions = (prefix: 'pre' | 'post'): SurveyQuestionJson[] =>
  financialLiteracyQuestions.map((question) => ({
    id: `${prefix}-finlit-${String(question.order).padStart(3, '0')}`,
    ...question,
  }));

const preQuestions = toSurveyQuestions('pre');
const postQuestions = toSurveyQuestions('post');

const susQuestions: SurveyQuestionJson[] = [
  ['sus-001', 1, 'Creo que me gustaría usar esta aplicación con frecuencia.'],
  ['sus-002', 2, 'Encontré la aplicación innecesariamente compleja.'],
  ['sus-003', 3, 'Pensé que la aplicación era fácil de usar.'],
  [
    'sus-004',
    4,
    'Creo que necesitaría apoyo técnico para poder usar esta aplicación.',
  ],
  [
    'sus-005',
    5,
    'Encontré que las funciones de la aplicación estaban bien integradas.',
  ],
  [
    'sus-006',
    6,
    'Pensé que había demasiada inconsistencia en esta aplicación.',
  ],
  [
    'sus-007',
    7,
    'Imagino que la mayoría de personas aprendería a usar esta aplicación rápidamente.',
  ],
  ['sus-008', 8, 'Encontré la aplicación muy difícil de usar.'],
  ['sus-009', 9, 'Me sentí seguro usando la aplicación.'],
  [
    'sus-010',
    10,
    'Necesité aprender muchas cosas antes de comenzar a usar esta aplicación.',
  ],
].map(([id, order, text]) => ({
  id: id as string,
  order: order as number,
  text: text as string,
  options: ['1', '2', '3', '4', '5'],
  correctAnswer: null,
}));

const satisfactionQuestions: SurveyQuestionJson[] = [
  [
    'satisfaction-001',
    1,
    'La app me ayudó a entender mejor mis gastos.',
    ['1', '2', '3', '4', '5'],
  ],
  [
    'satisfaction-002',
    2,
    'La app me ayudó a controlar mejor mi presupuesto.',
    ['1', '2', '3', '4', '5'],
  ],
  [
    'satisfaction-003',
    3,
    'Las recomendaciones fueron útiles.',
    ['1', '2', '3', '4', '5'],
  ],
  [
    'satisfaction-004',
    4,
    'El asistente IA fue claro.',
    ['1', '2', '3', '4', '5'],
  ],
  [
    'satisfaction-005',
    5,
    'El asistente IA fue personalizado.',
    ['1', '2', '3', '4', '5'],
  ],
  [
    'satisfaction-006',
    6,
    'Me gustaría seguir usando la app.',
    ['1', '2', '3', '4', '5'],
  ],
  [
    'satisfaction-007',
    7,
    'Recomendaría esta app a otros estudiantes.',
    ['1', '2', '3', '4', '5'],
  ],
  ['satisfaction-008', 8, '¿Qué funcionalidad te ayudó más?', []],
  ['satisfaction-009', 9, '¿Qué mejorarías?', []],
  [
    'satisfaction-010',
    10,
    '¿Qué recomendación del asistente te pareció más útil?',
    [],
  ],
  ['satisfaction-011', 11, '¿Qué parte fue confusa?', []],
].map(([id, order, text, options]) => ({
  id: id as string,
  order: order as number,
  text: text as string,
  options: options as string[],
  correctAnswer: null,
}));

export function defaultQuestionsForSurveyType(
  type: SurveyType,
): SurveyQuestionJson[] {
  const definitions: Partial<Record<SurveyType, SurveyQuestionJson[]>> = {
    [SurveyType.PRE]: preQuestions,
    [SurveyType.POST]: postQuestions,
    [SurveyType.SUS]: susQuestions,
    [SurveyType.SATISFACTION]: satisfactionQuestions,
  };

  return definitions[type] ?? [];
}
