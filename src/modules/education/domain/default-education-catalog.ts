import { TopicDifficulty } from '@prisma/client';

export type DefaultEducationTopic = {
  title: string;
  content: string;
  difficulty: TopicDifficulty;
  order: number;
  category: string;
};

export type DefaultQuizQuestion = {
  questionGroupKey: string;
  language: 'es';
  difficulty: TopicDifficulty;
  text: string;
  options: string[];
  correctAnswer: string;
};

export const DEFAULT_EDUCATION_TOPICS: DefaultEducationTopic[] = [
  {
    title: 'Presupuesto personal',
    content:
      'Un presupuesto personal te ayuda a planificar ingresos, gastos, ahorro y deudas. La regla 50/30/20 propone usar 50% para necesidades, 30% para deseos y 20% para ahorro o pago de deudas. Para estudiantes, lo importante es registrar gastos pequenos, comparar lo planificado contra lo real y ajustar cada semana.',
    difficulty: TopicDifficulty.BEGINNER,
    order: 1,
    category: 'budgeting',
  },
  {
    title: 'Habitos de ahorro',
    content:
      'Ahorrar no depende solo de tener ingresos altos, sino de separar dinero antes de gastarlo. Una estrategia simple es pagarte primero: apenas recibes ingreso, aparta un monto para emergencia o metas. Ahorrar S/10 por semana suma S/520 al ano y crea disciplina financiera.',
    difficulty: TopicDifficulty.BEGINNER,
    order: 2,
    category: 'saving',
  },
  {
    title: 'Credito y deudas',
    content:
      'El credito permite comprar hoy y pagar despues, pero puede generar intereses altos. Antes de usar tarjeta o prestamo, revisa la TEA/TCEA y confirma si podras pagar a tiempo. Una deuda para estudiar puede ser productiva; una deuda por consumo impulsivo suele afectar tu presupuesto.',
    difficulty: TopicDifficulty.INTERMEDIATE,
    order: 3,
    category: 'budgeting',
  },
  {
    title: 'Inflacion',
    content:
      'La inflacion es el aumento general de precios. Si tus ingresos no suben al mismo ritmo, compras menos con el mismo dinero. Para protegerte, conviene comparar precios, evitar gasto impulsivo y buscar que tus ahorros no pierdan valor frente al incremento de precios.',
    difficulty: TopicDifficulty.INTERMEDIATE,
    order: 4,
    category: 'investing',
  },
  {
    title: 'Tasas de interes',
    content:
      'La tasa de interes mide el costo de pedir dinero o la ganancia por ahorrar. En Peru se usa mucho la TEA, que considera el efecto del interes compuesto. Para comparar productos financieros, mira la TEA/TCEA y no solo la cuota mensual.',
    difficulty: TopicDifficulty.INTERMEDIATE,
    order: 5,
    category: 'investing',
  },
  {
    title: 'Inversion basica',
    content:
      'Invertir es usar dinero con la expectativa de que crezca con el tiempo. Puedes empezar con opciones simples como cuentas remuneradas o fondos mutuos. La clave es diversificar, entender el riesgo y no invertir dinero que necesitas para gastos inmediatos.',
    difficulty: TopicDifficulty.ADVANCED,
    order: 6,
    category: 'investing',
  },
  {
    title: 'Consumo responsable',
    content:
      'Consumir responsablemente significa distinguir entre necesidad y deseo. Antes de comprar algo no esencial, espera 24 horas y revisa si afecta tus metas. Registrar gastos ayuda a detectar gastos hormiga como snacks, delivery, taxis o suscripciones que casi no usas.',
    difficulty: TopicDifficulty.BEGINNER,
    order: 7,
    category: 'budgeting',
  },
  {
    title: 'Billeteras digitales en Peru',
    content:
      'Yape, Plin y otras billeteras digitales facilitan pagos pequenos, transferencias y division de cuentas. Son utiles, pero tambien pueden ocultar gastos frecuentes. Revisar movimientos por billetera te ayuda a saber si gastas mas por ese medio que con efectivo o banco.',
    difficulty: TopicDifficulty.BEGINNER,
    order: 8,
    category: 'saving',
  },
];

export function defaultQuizQuestionsForTopic(
  topicTitle: string,
): DefaultQuizQuestion[] {
  const key = topicTitle
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  const templates: Record<string, DefaultQuizQuestion[]> = {
    'Presupuesto personal': [
      q(
        key,
        1,
        TopicDifficulty.BEGINNER,
        'En la regla 50/30/20, que porcentaje va a necesidades?',
        ['50%', '30%', '20%', '10%'],
        '50%',
      ),
      q(
        key,
        2,
        TopicDifficulty.BEGINNER,
        'Si recibes S/1000, cuanto seria el 20% para ahorro?',
        ['S/100', 'S/200', 'S/300', 'S/500'],
        'S/200',
      ),
      q(
        key,
        3,
        TopicDifficulty.INTERMEDIATE,
        'Un gasto de alquiler se clasifica como:',
        ['Deseo', 'Necesidad', 'Inversion', 'Deuda mala'],
        'Necesidad',
      ),
      q(
        key,
        4,
        TopicDifficulty.INTERMEDIATE,
        'Si tus necesidades superan el 50%, que conviene hacer primero?',
        [
          'Ignorar el presupuesto',
          'Revisar gastos fijos y ajustar',
          'Gastar mas en deseos',
          'Eliminar todo ahorro',
        ],
        'Revisar gastos fijos y ajustar',
      ),
      q(
        key,
        5,
        TopicDifficulty.ADVANCED,
        'En presupuesto base cero, el dinero sobrante debe:',
        [
          'Quedar sin plan',
          'Asignarse a un proposito',
          'Gastarse rapido',
          'Ocultarse del registro',
        ],
        'Asignarse a un proposito',
      ),
    ],
    'Habitos de ahorro': [
      q(
        key,
        1,
        TopicDifficulty.BEGINNER,
        'Que significa pagarte primero?',
        [
          'Ahorrar antes de gastar',
          'Comprar primero',
          'Pagar solo deudas',
          'Usar todo el ingreso',
        ],
        'Ahorrar antes de gastar',
      ),
      q(
        key,
        2,
        TopicDifficulty.BEGINNER,
        'Ahorrar S/10 por semana suma aproximadamente al ano:',
        ['S/120', 'S/240', 'S/520', 'S/1000'],
        'S/520',
      ),
      q(
        key,
        3,
        TopicDifficulty.INTERMEDIATE,
        'Un fondo de emergencia deberia cubrir idealmente:',
        ['1 dia', '1 semana', '3 a 6 meses', '10 anos'],
        '3 a 6 meses',
      ),
      q(
        key,
        4,
        TopicDifficulty.INTERMEDIATE,
        'La mejor forma de mantener constancia es:',
        [
          'Ahorrar solo si sobra',
          'Separar ahorro al recibir ingreso',
          'Esperar fin de mes',
          'Pedir prestamos',
        ],
        'Separar ahorro al recibir ingreso',
      ),
      q(
        key,
        5,
        TopicDifficulty.ADVANCED,
        'El interes compuesto ayuda porque:',
        [
          'Suma intereses sobre intereses',
          'Elimina todo riesgo',
          'Evita registrar gastos',
          'Reduce precios',
        ],
        'Suma intereses sobre intereses',
      ),
    ],
  };

  return (
    templates[topicTitle] ?? [
      q(
        key,
        1,
        TopicDifficulty.BEGINNER,
        `Cual es la idea principal de ${topicTitle}?`,
        [
          'Registrar y decidir mejor',
          'Gastar sin control',
          'Evitar todo ahorro',
          'No revisar movimientos',
        ],
        'Registrar y decidir mejor',
      ),
      q(
        key,
        2,
        TopicDifficulty.BEGINNER,
        'Que habito mejora tu control financiero?',
        [
          'Registrar movimientos',
          'Comprar por impulso',
          'No mirar saldos',
          'Usar credito sin plan',
        ],
        'Registrar movimientos',
      ),
      q(
        key,
        3,
        TopicDifficulty.INTERMEDIATE,
        'Que debes hacer antes de tomar una decision financiera?',
        [
          'Comparar opciones',
          'Elegir al azar',
          'Ignorar costos',
          'Copiar a otros',
        ],
        'Comparar opciones',
      ),
      q(
        key,
        4,
        TopicDifficulty.INTERMEDIATE,
        'Un buen indicador de avance es:',
        [
          'Cumplir metas medibles',
          'Gastar mas cada dia',
          'No revisar presupuesto',
          'Ocultar deudas',
        ],
        'Cumplir metas medibles',
      ),
      q(
        key,
        5,
        TopicDifficulty.ADVANCED,
        'La educacion financiera busca ayudarte a:',
        [
          'Tomar mejores decisiones',
          'Eliminar todo riesgo',
          'Adivinar precios',
          'Gastar sin limites',
        ],
        'Tomar mejores decisiones',
      ),
    ]
  );
}

function q(
  key: string,
  order: number,
  difficulty: TopicDifficulty,
  text: string,
  options: string[],
  correctAnswer: string,
): DefaultQuizQuestion {
  return {
    questionGroupKey: `${key}_${order}`,
    language: 'es',
    difficulty,
    text,
    options,
    correctAnswer,
  };
}
