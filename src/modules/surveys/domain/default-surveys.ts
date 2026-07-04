import { SurveyType } from '@prisma/client';
import { SurveyQuestionJson } from './survey-question.types';

const financialLiteracyQuestions: Array<
  Omit<SurveyQuestionJson, 'id'> & { order: number }
> = [
  {
    order: 1,
    text: 'Que significa la regla de presupuesto 50/30/20?',
    options: [
      '50% necesidades, 30% deseos, 20% ahorro',
      '50% ahorro, 30% necesidades, 20% deseos',
      '50% deseos, 30% ahorro, 20% necesidades',
      'Se refiere a impuestos en Peru',
    ],
    correctAnswer: '50% necesidades, 30% deseos, 20% ahorro',
  },
  {
    order: 2,
    text: 'Que es la TEA (Tasa Efectiva Anual)?',
    options: [
      'La tasa nominal anual sin capitalizacion',
      'La tasa anual efectiva que considera capitalizacion',
      'Un impuesto del gobierno a las cuentas bancarias',
      'Un indicador de inflacion en Peru',
    ],
    correctAnswer: 'La tasa anual efectiva que considera capitalizacion',
  },
  {
    order: 3,
    text: 'Cual de estos gastos es una necesidad segun la regla 50/30/20?',
    options: [
      'Suscripcion de streaming',
      'Alquiler o vivienda',
      'Salida con amigos',
      'Zapatillas nuevas por gusto',
    ],
    correctAnswer: 'Alquiler o vivienda',
  },
  {
    order: 4,
    text: 'Que significa pagarte primero?',
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
    text: 'Si ahorras S/10 por semana, cuanto tendrias aproximadamente despues de un ano?',
    options: ['S/240', 'S/520', 'S/1,200', 'S/50'],
    correctAnswer: 'S/520',
  },
  {
    order: 6,
    text: 'Para que se usa la regla del 72?',
    options: [
      'Calcular cuotas mensuales de un prestamo',
      'Estimar en cuantos anos se duplica una inversion',
      'Determinar el limite ideal de una tarjeta',
      'Calcular ahorro ajustado por inflacion',
    ],
    correctAnswer: 'Estimar en cuantos anos se duplica una inversion',
  },
  {
    order: 7,
    text: 'Que billetera digital esta asociada al Banco de Credito del Peru (BCP)?',
    options: ['Plin', 'Yape', 'Tunki', 'Lukita'],
    correctAnswer: 'Yape',
  },
  {
    order: 8,
    text: 'Que es la inflacion?',
    options: [
      'Una disminucion del poder de compra del dinero con el tiempo',
      'Un aumento en la tasa de ahorro personal',
      'La tasa de interes de bonos del gobierno',
      'Un impuesto a productos importados',
    ],
    correctAnswer:
      'Una disminucion del poder de compra del dinero con el tiempo',
  },
  {
    order: 9,
    text: 'Cuantos meses de gastos deberia cubrir idealmente un fondo de emergencia?',
    options: ['1 mes', '2 meses', '3 a 6 meses', '12 meses'],
    correctAnswer: '3 a 6 meses',
  },
  {
    order: 10,
    text: 'Si no pagas el total de tu tarjeta de credito, los intereses se aplican sobre:',
    options: [
      'Solo las compras nuevas del mes',
      'El saldo pendiente, acumulandose cada ciclo',
      'Solo el monto del pago minimo',
      'Nada; basta con pagar el minimo',
    ],
    correctAnswer: 'El saldo pendiente, acumulandose cada ciclo',
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
  ['sus-001', 1, 'Creo que me gustaria usar esta aplicacion con frecuencia.'],
  ['sus-002', 2, 'Encontre la aplicacion innecesariamente compleja.'],
  ['sus-003', 3, 'Pense que la aplicacion era facil de usar.'],
  [
    'sus-004',
    4,
    'Creo que necesitaria apoyo tecnico para poder usar esta aplicacion.',
  ],
  [
    'sus-005',
    5,
    'Encontre que las funciones de la aplicacion estaban bien integradas.',
  ],
  [
    'sus-006',
    6,
    'Pense que habia demasiada inconsistencia en esta aplicacion.',
  ],
  [
    'sus-007',
    7,
    'Imagino que la mayoria de personas aprenderia a usar esta aplicacion rapidamente.',
  ],
  ['sus-008', 8, 'Encontre la aplicacion muy dificil de usar.'],
  ['sus-009', 9, 'Me senti seguro usando la aplicacion.'],
  [
    'sus-010',
    10,
    'Necesite aprender muchas cosas antes de comenzar a usar esta aplicacion.',
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
    'La app me ayudo a entender mejor mis gastos.',
    ['1', '2', '3', '4', '5'],
  ],
  [
    'satisfaction-002',
    2,
    'La app me ayudo a controlar mejor mi presupuesto.',
    ['1', '2', '3', '4', '5'],
  ],
  [
    'satisfaction-003',
    3,
    'Las recomendaciones fueron utiles.',
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
    'Me gustaria seguir usando la app.',
    ['1', '2', '3', '4', '5'],
  ],
  [
    'satisfaction-007',
    7,
    'Recomendaria esta app a otros estudiantes.',
    ['1', '2', '3', '4', '5'],
  ],
  ['satisfaction-008', 8, 'Que funcionalidad te ayudo mas?', []],
  ['satisfaction-009', 9, 'Que mejorarias?', []],
  [
    'satisfaction-010',
    10,
    'Que recomendacion del asistente te parecio mas util?',
    [],
  ],
  ['satisfaction-011', 11, 'Que parte fue confusa?', []],
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
