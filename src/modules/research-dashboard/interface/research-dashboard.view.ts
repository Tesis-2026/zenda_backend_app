import {
  CountShare,
  DailyResearchPoint,
  OpenAnswerSample,
  ResearchDashboardData,
  SatisfactionQuestionSummary,
} from '../application/research-dashboard.types';

export function renderResearchDashboard(params: {
  data: ResearchDashboardData;
  token?: string;
}): string {
  const { data, token } = params;
  const query = buildQuery({
    token,
    from: data.period.from ?? undefined,
    to: data.period.to ?? undefined,
  });
  const summaryHref = `/api/research-dashboard/summary${query}`;
  const csvHref = `/api/research-dashboard/export.csv${query}`;
  const jsonHref = `/api/research-dashboard/export.json${query}`;

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Zenda Research Dashboard</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #172033;
      --muted: #687385;
      --line: #dfe5ee;
      --soft: #f6f8fb;
      --paper: #ffffff;
      --accent: #0f9f8f;
      --accent-dark: #08796d;
      --warn: #b7791f;
      --danger: #be123c;
      --blue: #2563eb;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      background: var(--soft);
      color: var(--ink);
      line-height: 1.45;
    }
    header {
      background: #111827;
      color: #fff;
      padding: 28px clamp(18px, 4vw, 48px);
    }
    main {
      width: min(1180px, calc(100% - 28px));
      margin: 22px auto 48px;
    }
    h1, h2, h3, p { margin-top: 0; }
    h1 { font-size: clamp(26px, 4vw, 40px); margin-bottom: 8px; letter-spacing: 0; }
    h2 { font-size: 22px; margin-bottom: 14px; }
    h3 { font-size: 17px; margin-bottom: 10px; }
    a { color: var(--accent-dark); font-weight: 700; text-decoration: none; }
    .subtle { color: var(--muted); }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: end;
      justify-content: space-between;
      margin-bottom: 18px;
      padding: 14px;
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 8px;
    }
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: end;
    }
    label {
      display: grid;
      gap: 5px;
      font-size: 12px;
      color: var(--muted);
      font-weight: 700;
      text-transform: uppercase;
    }
    input {
      min-height: 40px;
      border: 1px solid var(--line);
      border-radius: 7px;
      padding: 8px 10px;
      color: var(--ink);
      background: #fff;
    }
    button, .button {
      min-height: 40px;
      border: 0;
      border-radius: 7px;
      padding: 9px 14px;
      background: var(--accent);
      color: #fff;
      font-weight: 700;
      cursor: pointer;
    }
    .button.secondary {
      background: #e9edf3;
      color: var(--ink);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }
    .metric, section {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 8px;
    }
    .metric {
      padding: 15px;
      min-height: 110px;
      display: grid;
      align-content: space-between;
    }
    .metric strong {
      display: block;
      font-size: 28px;
      letter-spacing: 0;
      margin: 4px 0;
    }
    .metric span { color: var(--muted); font-size: 13px; }
    section {
      padding: clamp(16px, 3vw, 24px);
      margin-bottom: 18px;
    }
    .two-col {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 18px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    th, td {
      padding: 10px 8px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }
    th {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0;
    }
    .bar {
      display: grid;
      gap: 5px;
      margin: 8px 0;
    }
    .bar-line {
      height: 9px;
      overflow: hidden;
      border-radius: 99px;
      background: #e9edf3;
    }
    .bar-line i {
      display: block;
      height: 100%;
      width: var(--w);
      background: var(--accent);
    }
    .pill {
      display: inline-flex;
      align-items: center;
      min-height: 26px;
      border-radius: 99px;
      padding: 3px 9px;
      background: #eefbf8;
      color: var(--accent-dark);
      font-size: 12px;
      font-weight: 700;
    }
    .pill.warn { background: #fff7ed; color: var(--warn); }
    .pill.danger { background: #fff1f2; color: var(--danger); }
    .samples {
      display: grid;
      gap: 10px;
    }
    blockquote {
      margin: 0;
      padding: 12px 14px;
      border-left: 4px solid var(--accent);
      background: #f9fbfd;
      border-radius: 0 8px 8px 0;
    }
    footer {
      color: var(--muted);
      font-size: 12px;
      text-align: center;
      padding: 20px;
    }
    @media (max-width: 640px) {
      main { width: min(100% - 18px, 1180px); }
      .toolbar { align-items: stretch; }
      .filters, .actions { width: 100%; }
      label, input, button, .button { width: 100%; }
      table { font-size: 13px; }
      th, td { padding: 8px 6px; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Zenda Research Dashboard</h1>
    <p class="subtle">Vista agregada para el piloto de tesis: finanzas personales, educacion financiera, uso del agente IA y usabilidad.</p>
    <span class="pill">Periodo: ${escapeHtml(data.period.label)}</span>
  </header>

  <main>
    <form class="toolbar" method="get" action="/api/research-dashboard">
      <div class="filters">
        ${token ? `<input type="hidden" name="token" value="${escapeAttr(token)}">` : ''}
        <label>Desde
          <input type="date" name="from" value="${escapeAttr(data.period.from ?? '')}">
        </label>
        <label>Hasta
          <input type="date" name="to" value="${escapeAttr(data.period.to ?? '')}">
        </label>
        <button type="submit">Filtrar</button>
      </div>
      <div class="actions">
        <a class="button secondary" href="${escapeAttr(summaryHref)}">JSON</a>
        <a class="button secondary" href="${escapeAttr(jsonHref)}">Export JSON</a>
        <a class="button secondary" href="${escapeAttr(csvHref)}">Export CSV</a>
      </div>
    </form>

    <div class="grid">
      ${metric('Participantes', data.participants.totalUsers, `${data.participants.activeUsers} activos en el periodo`)}
      ${metric('Pre-test promedio', score(data.surveys.pre.averageScore), `${data.surveys.pre.completed} completados`)}
      ${metric('Post-test promedio', score(data.surveys.post.averageScore), `${data.surveys.post.completed} completados`)}
      ${metric('Delta pre/post', signedScore(data.surveys.averagePrePostDelta), `${data.surveys.pairedPrePostUsers} usuarios comparables`)}
      ${metric('SUS promedio', score(data.surveys.sus.averageScore), `${data.surveys.sus.completed} respuestas`)}
      ${metric('Satisfaccion', score(data.surveys.satisfaction.averageScore), `${data.surveys.satisfaction.completed} respuestas`)}
      ${metric('Transacciones', data.finance.transactions, `${money(data.finance.totalExpense)} en gastos`)}
      ${metric('Mensajes IA', data.ai.userMessages, `${data.ai.feedbackCount} evaluaciones del agente`)}
    </div>

    <section>
      <h2>Lectura para el paper</h2>
      <div class="two-col">
        <div>
          <h3>Impacto academico</h3>
          <table>
            <tbody>
              <tr><th>Pre-test completados</th><td>${data.surveys.pre.completed}</td></tr>
              <tr><th>Post-test completados</th><td>${data.surveys.post.completed}</td></tr>
              <tr><th>Usuarios con pre y post</th><td>${data.surveys.pairedPrePostUsers}</td></tr>
              <tr><th>Mejora promedio</th><td>${signedScore(data.surveys.averagePrePostDelta)}</td></tr>
              <tr><th>Mejora relativa</th><td>${percentOrDash(data.surveys.averagePrePostDeltaPercentage)}</td></tr>
            </tbody>
          </table>
        </div>
        <div>
          <h3>Calidad del agente IA</h3>
          <table>
            <tbody>
              <tr><th>Conversaciones</th><td>${data.ai.conversations}</td></tr>
              <tr><th>Usuarios con chat</th><td>${data.ai.usersWithConversations}</td></tr>
              <tr><th>Rating promedio</th><td>${score(data.ai.averageRating)}</td></tr>
              <tr><th>Respuestas utiles</th><td>${percentOrDash(data.ai.helpfulRate)}</td></tr>
              <tr><th>Claridad</th><td>${percentOrDash(data.ai.clearRate)}</td></tr>
              <tr><th>Personalizacion</th><td>${percentOrDash(data.ai.personalizedRate)}</td></tr>
              <tr><th>Palabras por respuesta</th><td>${numberOrDash(data.ai.averageAssistantWords)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section>
      <h2>Participantes y perfil inicial</h2>
      <div class="two-col">
        <div>
          <table>
            <tbody>
              <tr><th>Usuarios registrados</th><td>${data.participants.totalUsers}</td></tr>
              <tr><th>Perfil completado</th><td>${data.participants.profileCompleted}</td></tr>
              <tr><th>Consentimiento</th><td>${data.participants.consentGiven}</td></tr>
              <tr><th>Edad promedio</th><td>${numberOrDash(data.participants.averageAge)}</td></tr>
              <tr><th>Ingreso mensual promedio</th><td>${moneyOrDash(data.participants.averageMonthlyIncome)}</td></tr>
            </tbody>
          </table>
        </div>
        <div>
          ${bars('Nivel financiero inicial', data.participants.literacyLevels)}
          ${bars('Tipo de ingreso', data.participants.incomeTypes)}
        </div>
      </div>
      ${data.participants.universities.length > 0 ? `<h3>Universidades</h3>${bars('', data.participants.universities)}` : ''}
    </section>

    <section>
      <h2>Uso de funcionalidades</h2>
      <div class="two-col">
        <div>
          <table>
            <tbody>
              <tr><th>Eventos registrados</th><td>${data.usage.totalEvents}</td></tr>
              <tr><th>Sesiones</th><td>${data.usage.sessions}</td></tr>
              <tr><th>Usuarios activos</th><td>${data.participants.activeUsers}</td></tr>
              <tr><th>DAU promedio</th><td>${numberOrDash(data.usage.dailyActiveUsersAverage)}</td></tr>
            </tbody>
          </table>
        </div>
        <div>${bars('Eventos principales', data.usage.eventsByType)}</div>
      </div>
      <h3>Actividad diaria</h3>
      ${dailyTable(data.usage.daily)}
    </section>

    <section>
      <h2>Gestion financiera</h2>
      <div class="two-col">
        <div>
          <table>
            <tbody>
              <tr><th>Ingresos</th><td>${data.finance.incomeCount} / ${money(data.finance.totalIncome)}</td></tr>
              <tr><th>Gastos</th><td>${data.finance.expenseCount} / ${money(data.finance.totalExpense)}</td></tr>
              <tr><th>Transferencias</th><td>${data.finance.transferCount} / ${money(data.finance.totalTransfer)}</td></tr>
              <tr><th>Usuarios con transacciones</th><td>${data.finance.usersWithTransactions}</td></tr>
              <tr><th>Presupuestos</th><td>${data.finance.budgets} (${data.finance.usersWithBudgets} usuarios)</td></tr>
              <tr><th>Metas de ahorro</th><td>${data.finance.goals} (${data.finance.usersWithGoals} usuarios)</td></tr>
              <tr><th>Clasificacion IA</th><td>${data.finance.aiCategorizedTransactions} (${percentOrDash(data.finance.aiCategoryShare)})</td></tr>
              <tr><th>Transacciones con presupuesto</th><td>${data.finance.budgetLinkedTransactions} (${percentOrDash(data.finance.budgetLinkedShare)})</td></tr>
            </tbody>
          </table>
        </div>
        <div>${bars('Cuentas por tipo', data.finance.accountTypes)}</div>
      </div>
    </section>

    <section>
      <h2>SUS y satisfaccion</h2>
      <div class="two-col">
        <div>
          <h3>Items de satisfaccion</h3>
          ${satisfactionTable(data.surveys.satisfactionLikert)}
        </div>
        <div>
          <h3>Builds beta detectados</h3>
          ${bars('', data.usage.betaBuilds)}
        </div>
      </div>
    </section>

    <section>
      <h2>Respuestas abiertas</h2>
      <div class="two-col">
        <div>
          <h3>Satisfaccion final</h3>
          ${openAnswers(data.surveys.openAnswers)}
        </div>
        <div>
          <h3>Feedback del agente y app</h3>
          ${samples([...data.ai.comments, ...data.qualitativeFeedback.samples])}
        </div>
      </div>
    </section>
  </main>

  <footer>
    Generado: ${escapeHtml(formatDateTime(data.generatedAt))}. Los datos son agregados para analisis academico; no se muestran emails ni identificadores personales.
  </footer>
</body>
</html>`;
}

function metric(label: string, value: string | number, detail: string): string {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong><span>${escapeHtml(detail)}</span></div>`;
}

function bars(title: string, items: CountShare[]): string {
  if (items.length === 0) return '<p class="subtle">Sin datos.</p>';
  return `${title ? `<h3>${escapeHtml(title)}</h3>` : ''}${items
    .map(
      (item) => `<div class="bar">
        <div><strong>${escapeHtml(item.label)}</strong> <span class="subtle">${item.count} (${item.percentage}%)</span></div>
        <div class="bar-line"><i style="--w:${Math.max(2, item.percentage)}%"></i></div>
      </div>`,
    )
    .join('')}`;
}

function dailyTable(points: DailyResearchPoint[]): string {
  if (points.length === 0) return '<p class="subtle">Sin actividad diaria en el periodo.</p>';
  return `<table>
    <thead><tr><th>Fecha</th><th>Usuarios activos</th><th>Eventos</th><th>Transacciones</th><th>Mensajes IA</th></tr></thead>
    <tbody>${points
      .slice(-45)
      .map(
        (point) => `<tr><td>${escapeHtml(point.date)}</td><td>${point.activeUsers}</td><td>${point.events}</td><td>${point.transactions}</td><td>${point.chatMessages}</td></tr>`,
      )
      .join('')}</tbody>
  </table>`;
}

function satisfactionTable(items: SatisfactionQuestionSummary[]): string {
  if (items.length === 0) return '<p class="subtle">Sin respuestas de satisfaccion.</p>';
  return `<table>
    <thead><tr><th>#</th><th>Pregunta</th><th>Promedio</th><th>N</th></tr></thead>
    <tbody>${items
      .map(
        (item) => `<tr><td>${item.order}</td><td>${escapeHtml(item.text)}</td><td>${score(item.average)}</td><td>${item.responses}</td></tr>`,
      )
      .join('')}</tbody>
  </table>`;
}

function openAnswers(items: OpenAnswerSample[]): string {
  if (items.length === 0) return '<p class="subtle">Sin respuestas abiertas.</p>';
  return `<div class="samples">${items
    .map(
      (item) => `<blockquote><strong>${escapeHtml(item.question)}</strong><br>${escapeHtml(item.answer)}</blockquote>`,
    )
    .join('')}</div>`;
}

function samples(items: string[]): string {
  if (items.length === 0) return '<p class="subtle">Sin comentarios cualitativos.</p>';
  return `<div class="samples">${items
    .map((item) => `<blockquote>${escapeHtml(item)}</blockquote>`)
    .join('')}</div>`;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

function score(value: number | null): string {
  return value === null ? '-' : String(value);
}

function signedScore(value: number | null): string {
  if (value === null) return '-';
  return value > 0 ? `+${value}` : String(value);
}

function numberOrDash(value: number | null): string {
  return value === null ? '-' : String(value);
}

function percentOrDash(value: number | null): string {
  return value === null ? '-' : `${value}%`;
}

function money(value: number): string {
  return `S/ ${value.toFixed(2)}`;
}

function moneyOrDash(value: number | null): string {
  return value === null ? '-' : money(value);
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}
