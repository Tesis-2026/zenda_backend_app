import { SurveyType } from '@prisma/client';
import { SurveyQuestionJson } from './survey-question.types';

const preQuestions: SurveyQuestionJson[] = [
  {
    id: 'pre-finlit-001',
    order: 1,
    text: 'What does the 50/30/20 budget rule mean?',
    options: [
      '50% needs, 30% wants, 20% savings',
      '50% savings, 30% needs, 20% wants',
      '50% wants, 30% savings, 20% needs',
      'It refers to tax brackets in Peru',
    ],
    correctAnswer: '50% needs, 30% wants, 20% savings',
  },
  {
    id: 'pre-finlit-002',
    order: 2,
    text: 'What is TEA (Tasa Efectiva Anual)?',
    options: [
      'The nominal annual interest rate without compounding',
      'The effective annual rate that accounts for compounding',
      'A government tax on bank accounts',
      'A metric for inflation in Peru',
    ],
    correctAnswer: 'The effective annual rate that accounts for compounding',
  },
  {
    id: 'pre-finlit-003',
    order: 3,
    text: 'Which of the following is considered a need in the 50/30/20 rule?',
    options: [
      'Netflix subscription',
      'Rent or housing payment',
      'Dining out with friends',
      'New sneakers',
    ],
    correctAnswer: 'Rent or housing payment',
  },
  {
    id: 'pre-finlit-004',
    order: 4,
    text: 'What does pay yourself first mean?',
    options: [
      'Spend on luxuries before paying bills',
      'Save a portion of your income before spending on anything else',
      'Pay your debts before saving',
      'Give yourself a weekly allowance',
    ],
    correctAnswer:
      'Save a portion of your income before spending on anything else',
  },
  {
    id: 'pre-finlit-005',
    order: 5,
    text: 'If you save S/10 per week, approximately how much will you have saved after one year?',
    options: ['S/240', 'S/520', 'S/1,200', 'S/50'],
    correctAnswer: 'S/520',
  },
  {
    id: 'pre-finlit-006',
    order: 6,
    text: 'What is the Rule of 72 used for?',
    options: [
      'Calculating monthly loan payments',
      'Estimating how many years it takes to double an investment',
      'Determining the optimal credit card limit',
      'Computing inflation-adjusted savings',
    ],
    correctAnswer: 'Estimating how many years it takes to double an investment',
  },
  {
    id: 'pre-finlit-007',
    order: 7,
    text: 'Which digital wallet is associated with Banco de Credito del Peru (BCP)?',
    options: ['Plin', 'Yape', 'Tunki', 'Lukita'],
    correctAnswer: 'Yape',
  },
  {
    id: 'pre-finlit-008',
    order: 8,
    text: 'What is inflation?',
    options: [
      'A decrease in the purchasing power of money over time',
      'An increase in personal savings rates',
      'The interest rate on government bonds',
      'A tax on imported goods',
    ],
    correctAnswer: 'A decrease in the purchasing power of money over time',
  },
  {
    id: 'pre-finlit-009',
    order: 9,
    text: 'How many months of expenses should an emergency fund ideally cover?',
    options: ['1 month', '2 months', '3 to 6 months', '12 months'],
    correctAnswer: '3 to 6 months',
  },
  {
    id: 'pre-finlit-010',
    order: 10,
    text: 'If you do not pay your full credit card balance, interest is charged on:',
    options: [
      'Only the new purchases made that month',
      'The unpaid balance, compounding each billing cycle',
      'Only the minimum payment amount',
      'Nothing; credit cards are interest-free if you pay the minimum',
    ],
    correctAnswer: 'The unpaid balance, compounding each billing cycle',
  },
];

const postQuestions: SurveyQuestionJson[] = [
  {
    id: 'post-finlit-001',
    order: 1,
    text: 'What does the 50/30/20 budget rule mean?',
    options: [
      '50% needs, 30% wants, 20% savings',
      '50% savings, 30% needs, 20% wants',
      '50% wants, 30% savings, 20% needs',
      'It refers to tax brackets in Peru',
    ],
    correctAnswer: '50% needs, 30% wants, 20% savings',
  },
  {
    id: 'post-finlit-002',
    order: 2,
    text: 'What is TEA (Tasa Efectiva Anual)?',
    options: [
      'The nominal annual interest rate without compounding',
      'The effective annual rate that accounts for compounding',
      'A government tax on bank accounts',
      'A metric for inflation in Peru',
    ],
    correctAnswer: 'The effective annual rate that accounts for compounding',
  },
  {
    id: 'post-finlit-003',
    order: 3,
    text: 'Which of the following is considered a need in the 50/30/20 rule?',
    options: [
      'Netflix subscription',
      'Rent or housing payment',
      'Dining out with friends',
      'New sneakers',
    ],
    correctAnswer: 'Rent or housing payment',
  },
  {
    id: 'post-finlit-004',
    order: 4,
    text: 'What does pay yourself first mean?',
    options: [
      'Spend on luxuries before paying bills',
      'Save a portion of your income before spending on anything else',
      'Pay your debts before saving',
      'Give yourself a weekly allowance',
    ],
    correctAnswer:
      'Save a portion of your income before spending on anything else',
  },
  {
    id: 'post-finlit-005',
    order: 5,
    text: 'If you save S/10 per week, approximately how much will you have saved after one year?',
    options: ['S/240', 'S/520', 'S/1,200', 'S/50'],
    correctAnswer: 'S/520',
  },
  {
    id: 'post-finlit-006',
    order: 6,
    text: 'What is the Rule of 72 used for?',
    options: [
      'Calculating monthly loan payments',
      'Estimating how many years it takes to double an investment',
      'Determining the optimal credit card limit',
      'Computing inflation-adjusted savings',
    ],
    correctAnswer: 'Estimating how many years it takes to double an investment',
  },
  {
    id: 'post-finlit-007',
    order: 7,
    text: 'Which digital wallet is associated with Banco de Credito del Peru (BCP)?',
    options: ['Plin', 'Yape', 'Tunki', 'Lukita'],
    correctAnswer: 'Yape',
  },
  {
    id: 'post-finlit-008',
    order: 8,
    text: 'What is inflation?',
    options: [
      'A decrease in the purchasing power of money over time',
      'An increase in personal savings rates',
      'The interest rate on government bonds',
      'A tax on imported goods',
    ],
    correctAnswer: 'A decrease in the purchasing power of money over time',
  },
  {
    id: 'post-finlit-009',
    order: 9,
    text: 'Financial experts recommend saving at least how many months of living expenses as an emergency fund?',
    options: ['1 month', '2 months', '3 to 6 months', '18 months'],
    correctAnswer: '3 to 6 months',
  },
  {
    id: 'post-finlit-010',
    order: 10,
    text: 'A credit card has a 60% TEA. You carry a S/500 balance for one year without paying. Approximately how much will you owe?',
    options: ['S/530', 'S/600', 'S/800', 'S/1,050'],
    correctAnswer: 'S/800',
  },
];

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
