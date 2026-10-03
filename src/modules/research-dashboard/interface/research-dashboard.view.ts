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
    cohort: data.cohort?.code,
  });
  const summaryHref = `/api/research-dashboard/summary${query}`;
  const csvHref = `/api/research-dashboard/export.csv${query}`;
  const jsonHref = `/api/research-dashboard/export.json${query}`;
  const refreshHref = `/api/research-dashboard${query}`;
  const activeRate = percentage(data.participants.activeUsers, data.participants.totalUsers);
  const preCoverage = percentage(data.surveys.pre.completed, data.participants.totalUsers);
  const pairedCoverage = percentage(data.surveys.pairedPrePostUsers, data.participants.totalUsers);

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <meta name="robots" content="noindex, nofollow">
  <title>Zenda Research · Panel de evidencia</title>
  <style>
    :root {
      color-scheme: light;
      --navy-950: #071a2b;
      --navy-900: #0c2438;
      --navy-800: #14364f;
      --ink: #122538;
      --muted: #5d6d7e;
      --subtle: #7b8a99;
      --line: #dce5e9;
      --line-strong: #c9d7dc;
      --canvas: #f4f8f7;
      --surface: #ffffff;
      --surface-soft: #eef6f4;
      --teal: #087f70;
      --teal-strong: #056358;
      --teal-soft: #dff5ef;
      --blue: #3569d4;
      --blue-soft: #eaf0ff;
      --amber: #a45f05;
      --amber-soft: #fff4d8;
      --rose: #b42348;
      --rose-soft: #fff0f3;
      --shadow: 0 12px 30px rgba(15, 42, 54, 0.08);
      --radius-lg: 22px;
      --radius-md: 14px;
      --focus: #0b6bcb;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      min-width: 320px;
      background: var(--canvas);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 16px;
      line-height: 1.55;
      -webkit-font-smoothing: antialiased;
    }
    a { color: inherit; }
    button, input { font: inherit; }
    button, .button, a { touch-action: manipulation; }
    :focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }
    .skip-link {
      position: fixed;
      left: 16px;
      top: 12px;
      z-index: 100;
      transform: translateY(-180%);
      border-radius: 10px;
      background: #fff;
      color: var(--navy-950);
      padding: 10px 14px;
      font-weight: 800;
    }
    .skip-link:focus { transform: translateY(0); }
    .shell { width: min(1240px, calc(100% - 40px)); margin-inline: auto; }
    .topbar {
      background: var(--navy-950);
      color: #fff;
      border-bottom: 1px solid rgba(255,255,255,.12);
    }
    .topbar-inner {
      min-height: 70px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
    }
    .brand { display: flex; align-items: center; gap: 12px; font-weight: 800; }
    .brand-mark {
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      border-radius: 11px;
      background: #11a78f;
      color: #fff;
      font-size: 21px;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.22);
    }
    .brand-copy { display: grid; line-height: 1.15; }
    .brand-copy small { color: #a9c0ce; font-size: 11px; font-weight: 650; letter-spacing: .08em; text-transform: uppercase; }
    .privacy-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 36px;
      padding: 7px 11px;
      border: 1px solid rgba(255,255,255,.18);
      border-radius: 999px;
      color: #d9e8ed;
      font-size: 12px;
      font-weight: 700;
    }
    .privacy-badge svg { width: 16px; height: 16px; }
    .hero {
      color: #fff;
      background:
        radial-gradient(circle at 85% 15%, rgba(17,167,143,.28), transparent 34%),
        linear-gradient(145deg, var(--navy-950), var(--navy-800));
      padding: clamp(46px, 7vw, 84px) 0 92px;
    }
    .hero-grid { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(280px, .55fr); gap: 54px; align-items: end; }
    .hero-grid > * { min-width: 0; }
    .eyebrow { margin: 0 0 12px; color: #66dbc5; font-size: 12px; font-weight: 850; letter-spacing: .12em; text-transform: uppercase; }
    h1, h2, h3, p { margin-top: 0; }
    h1 { max-width: 780px; margin-bottom: 18px; font-size: clamp(34px, 5vw, 58px); line-height: 1.04; letter-spacing: -.04em; }
    .hero-copy { max-width: 740px; margin-bottom: 26px; color: #c7d8e0; font-size: clamp(16px, 2vw, 19px); }
    .meta-row, .legend, .section-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
    .meta-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 34px;
      padding: 6px 11px;
      border-radius: 999px;
      background: rgba(255,255,255,.09);
      border: 1px solid rgba(255,255,255,.13);
      color: #e6f1f4;
      font-size: 12px;
      font-weight: 700;
    }
    .hero-status {
      padding: 22px;
      border: 1px solid rgba(255,255,255,.14);
      border-radius: var(--radius-lg);
      background: rgba(255,255,255,.07);
      backdrop-filter: blur(10px);
    }
    .hero-status-label { color: #a9c0ce; font-size: 12px; font-weight: 750; text-transform: uppercase; letter-spacing: .08em; }
    .hero-status strong { display: block; margin: 8px 0 4px; font-size: 24px; line-height: 1.2; }
    .hero-status p { margin: 0; color: #c7d8e0; font-size: 13px; overflow-wrap: anywhere; }
    main { margin-top: -58px; padding-bottom: 60px; }
    .toolbar {
      position: relative;
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 22px;
      padding: 18px;
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      background: var(--surface);
      box-shadow: var(--shadow);
    }
    .filters, .actions { display: flex; flex-wrap: wrap; align-items: end; gap: 10px; }
    label { display: grid; gap: 6px; color: var(--muted); font-size: 12px; font-weight: 800; }
    input {
      min-height: 46px;
      padding: 9px 12px;
      border: 1px solid var(--line-strong);
      border-radius: 11px;
      background: #fff;
      color: var(--ink);
    }
    button, .button {
      min-height: 46px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 15px;
      border: 1px solid transparent;
      border-radius: 11px;
      background: var(--teal);
      color: #fff;
      font-size: 14px;
      font-weight: 800;
      text-decoration: none;
      cursor: pointer;
      transition: transform .18s ease, background .18s ease, border-color .18s ease;
    }
    button:hover, .button:hover { transform: translateY(-1px); background: var(--teal-strong); }
    .button.secondary { border-color: var(--line-strong); background: #fff; color: var(--ink); }
    .button.secondary:hover { background: var(--surface-soft); border-color: #abc5c5; }
    .button svg { width: 17px; height: 17px; }
    .section-nav {
      display: flex;
      gap: 6px;
      margin: 0 0 22px;
      padding: 6px;
      overflow-x: auto;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: rgba(255,255,255,.78);
      scrollbar-width: thin;
    }
    .section-nav a { min-height: 40px; display: inline-flex; align-items: center; padding: 8px 13px; border-radius: 9px; color: var(--muted); font-size: 13px; font-weight: 750; text-decoration: none; white-space: nowrap; }
    .section-nav a:hover { background: var(--surface-soft); color: var(--teal-strong); }
    .section-heading { display: flex; justify-content: space-between; align-items: end; gap: 20px; margin: 34px 0 16px; }
    .section-heading h2 { margin-bottom: 4px; font-size: clamp(22px, 3vw, 30px); line-height: 1.2; letter-spacing: -.025em; }
    .section-heading p { max-width: 700px; margin: 0; color: var(--muted); font-size: 14px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 14px; }
    .kpi {
      grid-column: span 3;
      min-height: 156px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 20px;
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      background: var(--surface);
      box-shadow: 0 4px 18px rgba(15,42,54,.04);
    }
    .kpi.featured { grid-column: span 6; background: linear-gradient(145deg, #0a7568, #07594f); color: #fff; border-color: transparent; }
    .kpi-label { display: flex; justify-content: space-between; gap: 10px; color: var(--muted); font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .055em; }
    .featured .kpi-label, .featured .kpi-detail { color: #c6eee5; }
    .kpi-icon { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px; background: var(--teal-soft); color: var(--teal-strong); }
    .kpi-icon svg { width: 17px; height: 17px; }
    .featured .kpi-icon { background: rgba(255,255,255,.13); color: #fff; }
    .kpi-value { margin: 14px 0 3px; font-size: clamp(28px, 4vw, 38px); font-weight: 850; line-height: 1; letter-spacing: -.035em; font-variant-numeric: tabular-nums; }
    .kpi-detail { color: var(--muted); font-size: 13px; }
    .panel-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; }
    .panel {
      grid-column: span 6;
      min-width: 0;
      padding: clamp(18px, 3vw, 26px);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      background: var(--surface);
      box-shadow: 0 4px 18px rgba(15,42,54,.04);
    }
    .panel.wide { grid-column: 1 / -1; }
    .panel h3 { margin-bottom: 5px; font-size: 18px; letter-spacing: -.015em; }
    .panel-intro { margin-bottom: 20px; color: var(--muted); font-size: 13px; }
    .insight-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .insight { padding: 16px; border-radius: 13px; background: var(--surface-soft); }
    .insight strong { display: block; margin-bottom: 4px; font-size: 17px; }
    .insight span { color: var(--muted); font-size: 12px; }
    .status {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 4px 9px;
      border-radius: 999px;
      background: var(--teal-soft);
      color: var(--teal-strong);
      font-size: 11px;
      font-weight: 850;
    }
    .status.warn { background: var(--amber-soft); color: var(--amber); }
    .status.neutral { background: var(--blue-soft); color: #274eaa; }
    .cohort-notice {
      margin: 0 0 22px;
      padding: 15px 18px;
      border: 1px solid #e8c779;
      border-radius: 14px;
      background: var(--amber-soft);
      color: #70420a;
      font-size: 13px;
    }
    .cohort-notice strong { display: block; margin-bottom: 3px; font-size: 14px; }
    .chart-frame { width: 100%; overflow: hidden; }
    .chart-frame svg { width: 100%; height: auto; min-height: 230px; display: block; }
    .chart-grid { stroke: #dde7e9; stroke-width: 1; }
    .chart-label { fill: var(--subtle); font-size: 11px; }
    .chart-line { fill: none; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
    .chart-area { opacity: .09; }
    .legend { margin-top: 14px; color: var(--muted); font-size: 12px; }
    .legend-item { display: inline-flex; align-items: center; gap: 6px; }
    .legend-dot { width: 9px; height: 9px; border-radius: 99px; background: var(--legend-color); }
    .comparison { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; align-items: end; min-height: 250px; padding: 20px 16px 0; }
    .comparison-item { height: 100%; display: grid; grid-template-rows: auto 1fr auto; gap: 10px; text-align: center; }
    .comparison-value { font-size: 21px; font-weight: 850; font-variant-numeric: tabular-nums; }
    .comparison-track { height: 170px; display: flex; align-items: end; overflow: hidden; border-radius: 12px 12px 4px 4px; background: #edf2f4; }
    .comparison-bar { width: 100%; min-height: 3px; border-radius: 12px 12px 4px 4px; background: linear-gradient(180deg, #3ab69f, var(--teal)); }
    .comparison-item:last-child .comparison-bar { background: linear-gradient(180deg, #6189df, var(--blue)); }
    .comparison-label { color: var(--muted); font-size: 12px; font-weight: 800; }
    .data-list { display: grid; gap: 13px; }
    .bar { display: grid; gap: 6px; }
    .bar-copy { display: flex; align-items: baseline; justify-content: space-between; gap: 14px; font-size: 13px; }
    .bar-copy strong { overflow-wrap: anywhere; }
    .bar-copy span { color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .bar-track { height: 8px; overflow: hidden; border-radius: 99px; background: #e8eef0; }
    .bar-fill { display: block; width: var(--w); height: 100%; border-radius: inherit; background: var(--teal); }
    .stats { display: grid; gap: 0; margin: 0; }
    .stat-row { display: grid; grid-template-columns: 1fr auto; gap: 18px; padding: 13px 0; border-bottom: 1px solid var(--line); }
    .stat-row:last-child { border-bottom: 0; }
    .stat-row dt { color: var(--muted); font-size: 13px; }
    .stat-row dd { margin: 0; font-weight: 800; text-align: right; font-variant-numeric: tabular-nums; }
    .table-wrap { width: 100%; overflow-x: auto; border: 1px solid var(--line); border-radius: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 12px 13px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
    tr:last-child td { border-bottom: 0; }
    th { background: #f5f8f8; color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: .055em; white-space: nowrap; }
    td { font-variant-numeric: tabular-nums; }
    .samples { display: grid; gap: 10px; }
    blockquote { margin: 0; padding: 14px 16px; border-left: 3px solid var(--teal); border-radius: 0 12px 12px 0; background: var(--surface-soft); color: #304557; font-size: 13px; }
    blockquote strong { display: block; margin-bottom: 4px; color: var(--ink); }
    .empty { margin: 0; padding: 20px; border: 1px dashed var(--line-strong); border-radius: 12px; color: var(--muted); text-align: center; font-size: 13px; }
    footer { padding: 24px 0 40px; color: var(--muted); font-size: 12px; }
    footer .shell { display: flex; justify-content: space-between; gap: 18px; border-top: 1px solid var(--line); padding-top: 22px; }
    @media (max-width: 980px) {
      .hero-grid { grid-template-columns: 1fr; gap: 28px; }
      .hero-status { max-width: 480px; }
      .kpi { grid-column: span 6; }
      .panel { grid-column: 1 / -1; }
      .insight-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 680px) {
      .shell { width: min(100% - 24px, 1240px); }
      .privacy-badge span { display: none; }
      .hero { padding-top: 38px; }
      .toolbar { align-items: stretch; flex-direction: column; }
      .filters, .actions { width: 100%; }
      .filters label { flex: 1 1 130px; }
      .filters button { flex: 1 1 100%; }
      .actions .button { flex: 1 1 120px; }
      .kpi, .kpi.featured { grid-column: 1 / -1; }
      .insight-grid { grid-template-columns: 1fr; }
      .section-heading { align-items: start; flex-direction: column; }
      footer .shell { flex-direction: column; }
    }
    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      *, *::before, *::after { transition-duration: .01ms !important; }
    }
    @media print {
      body { background: #fff; }
      .topbar, .toolbar, .section-nav { display: none !important; }
      .hero { padding: 28px 0; background: #fff; color: var(--ink); border-bottom: 2px solid var(--ink); }
      .hero-copy, .hero-status p, .hero-status-label { color: var(--muted); }
      .hero-status { border-color: var(--line); background: #fff; }
      .meta-pill { border-color: var(--line); background: #fff; color: var(--ink); }
      main { margin-top: 24px; }
      .panel, .kpi { break-inside: avoid; box-shadow: none; }
    }
  </style>
</head>
<body>
  <a class="skip-link" href="#contenido">Saltar al contenido</a>
  <div class="topbar">
    <div class="shell topbar-inner">
      <div class="brand" aria-label="Zenda Research">
        <span class="brand-mark" aria-hidden="true">Z</span>
        <span class="brand-copy">Zenda Research<small>Inteligencia del piloto</small></span>
      </div>
      <span class="privacy-badge">${icon('shield')}<span>Datos agregados y seudonimizados</span></span>
    </div>
  </div>
  <header class="hero">
    <div class="shell hero-grid">
      <div>
        <p class="eyebrow">Observatorio del prepiloto académico</p>
        <h1>Evidencia clara para decidir el siguiente paso</h1>
        <p class="hero-copy">Seguimiento ejecutivo del impacto en educación financiera, la adopción del producto y la calidad percibida del asistente de Zenda.</p>
        <div class="meta-row">
          <span class="meta-pill">${icon('calendar')} ${escapeHtml(data.period.label)}</span>
          <span class="meta-pill">${icon('clock')} Actualizado ${escapeHtml(formatDateTime(data.generatedAt))}</span>
          ${data.cohort ? `<span class="meta-pill">${icon('users')} ${escapeHtml(data.cohort.label)}</span>` : ''}
        </div>
      </div>
      <aside class="hero-status" aria-label="Estado de la evidencia">
        <span class="hero-status-label">Estado de evidencia</span>
        <strong>${escapeHtml(evidenceStatus(data.surveys.pairedPrePostUsers))}</strong>
        <p>${data.surveys.pairedPrePostUsers} participantes cuentan con medición PRE y POST comparable.</p>
      </aside>
    </div>
  </header>

  <main id="contenido" class="shell">
    <form class="toolbar" method="get" action="/api/research-dashboard" aria-label="Filtrar periodo y exportar datos">
      <div class="filters">
        ${token ? `<input type="hidden" name="token" value="${escapeAttr(token)}">` : ''}
        <label>Desde<input type="date" name="from" value="${escapeAttr(data.period.from ?? '')}"></label>
        <label>Hasta<input type="date" name="to" value="${escapeAttr(data.period.to ?? '')}"></label>
        <label>Cohorte<input type="text" name="cohort" maxlength="64" placeholder="Todas las cohortes reales" value="${escapeAttr(data.cohort?.code ?? '')}"></label>
        <button type="submit">${icon('filter')} Aplicar periodo</button>
      </div>
      <div class="actions" aria-label="Acciones del reporte">
        <a class="button secondary" href="${escapeAttr(refreshHref)}">${icon('refresh')} Actualizar</a>
        <a class="button secondary" href="${escapeAttr(summaryHref)}">${icon('code')} Ver JSON</a>
        <a class="button secondary" href="${escapeAttr(csvHref)}" download>${icon('download')} CSV</a>
        <a class="button secondary" href="${escapeAttr(jsonHref)}" download>${icon('download')} JSON</a>
      </div>
    </form>

    ${data.cohort?.synthetic ? `<aside class="cohort-notice" role="note"><strong>Escenario ilustrativo: ${escapeHtml(data.cohort.label)}</strong>Estos registros son sintéticos y están aislados de las cohortes reales. Sirven para demostrar el dashboard; no constituyen resultados observados del estudio.</aside>` : ''}

    <nav class="section-nav" aria-label="Secciones del dashboard">
      <a href="#resumen">Resumen</a><a href="#impacto">Impacto</a><a href="#adopcion">Adopción</a><a href="#finanzas">Finanzas</a><a href="#experiencia">Experiencia</a><a href="#voz">Voz del usuario</a>
    </nav>

    <section id="resumen" aria-labelledby="resumen-title">
      <div class="section-heading">
        <div><h2 id="resumen-title">Resumen ejecutivo</h2><p>Indicadores prioritarios para comités, asesores y responsables del piloto.</p></div>
        <span class="status ${data.surveys.pairedPrePostUsers < 5 ? 'warn' : ''}">${escapeHtml(evidenceStatus(data.surveys.pairedPrePostUsers))}</span>
      </div>
      <div class="kpi-grid">
        ${kpi('Participantes', data.participants.totalUsers, `${data.participants.activeUsers} activos · ${activeRate}%`, 'users')}
        ${kpi('Cobertura PRE', `${preCoverage}%`, `${data.surveys.pre.completed} evaluaciones`, 'check')}
        ${kpi('Cohorte comparable', `${pairedCoverage}%`, `${data.surveys.pairedPrePostUsers} con PRE + POST`, 'compare')}
        ${kpi('SUS promedio', score(data.surveys.sus.averageScore), `${data.surveys.sus.completed} respuestas`, 'spark')}
        ${kpi('Cambio PRE / POST', signedScore(data.surveys.averagePrePostDelta), `${percentOrDash(data.surveys.averagePrePostDeltaPercentage)} relativo`, 'trend', true)}
        ${kpi('Actividad financiera', data.finance.transactions, `${data.finance.usersWithTransactions} usuarios · ${money(data.finance.totalExpense)} en gastos`, 'wallet', true)}
      </div>
      <div class="section-heading"><div><h2>Lectura rápida</h2><p>Contexto mínimo para interpretar las cifras sin sobreestimar la muestra.</p></div></div>
      <div class="insight-grid">
        ${insight(`${activeRate}% activos`, 'Participación con actividad registrada durante el periodo.')}
        ${insight(`${pairedCoverage}% comparable`, pairedCoverage > 0 ? 'Cobertura disponible para estimar cambio individual.' : 'Aún no hay pares PRE/POST para estimar cambio.')}
        ${insight(percentOrDash(data.surveys.utilityFavorable.percentage), `${data.surveys.utilityFavorable.favorable} de ${data.surveys.utilityFavorable.total} participantes reportan utilidad favorable.`)}
        ${insight(`${data.qualitativeFeedback.total} comentarios`, 'Señales cualitativas disponibles para complementar los indicadores.')}
      </div>
    </section>

    <section id="impacto" aria-labelledby="impacto-title">
      <div class="section-heading"><div><h2 id="impacto-title">Impacto académico</h2><p>Comparación de alfabetización financiera y cobertura de la medición longitudinal.</p></div></div>
      <div class="panel-grid">
        <article class="panel wide">
          <h3>Indicadores de resultado</h3>
          <p class="panel-intro">Lectura consolidada de impacto, usabilidad, adopción y desempeño de clasificación.</p>
          ${researchResultsTable(data)}
        </article>
        <article class="panel">
          <h3>Promedio PRE vs. POST</h3>
          <p class="panel-intro">Los promedios se muestran junto al tamaño de cada medición.</p>
          ${scoreComparison(data)}
          <div class="legend"><span class="legend-item"><span class="legend-dot" style="--legend-color:var(--teal)"></span>PRE · N=${data.surveys.pre.completed}</span><span class="legend-item"><span class="legend-dot" style="--legend-color:var(--blue)"></span>POST · N=${data.surveys.post.completed}</span></div>
        </article>
        <article class="panel">
          <h3>Validez de la comparación</h3>
          <p class="panel-intro">Cobertura y magnitud del cambio para la cohorte pareada.</p>
          ${stats([
            ['PRE completados', String(data.surveys.pre.completed)],
            ['POST completados', String(data.surveys.post.completed)],
            ['Participantes pareados', String(data.surveys.pairedPrePostUsers)],
            ['Cambio promedio', signedScore(data.surveys.averagePrePostDelta)],
            ['Cambio relativo', percentOrDash(data.surveys.averagePrePostDeltaPercentage)],
          ])}
        </article>
      </div>
    </section>

    <section id="adopcion" aria-labelledby="adopcion-title">
      <div class="section-heading"><div><h2 id="adopcion-title">Adopción y actividad</h2><p>Evolución diaria del uso y composición de la cohorte participante.</p></div></div>
      <div class="panel-grid">
        <article class="panel wide">
          <h3>Actividad de los últimos 45 días del periodo</h3>
          <p class="panel-intro">Usuarios activos, transacciones y mensajes enviados al asistente.</p>
          ${activityChart(data.usage.daily)}
        </article>
        <article class="panel">
          <h3>Perfil de participantes</h3>
          <p class="panel-intro">Indicadores agregados de incorporación y consentimiento.</p>
          ${stats([
            ['Usuarios registrados', String(data.participants.totalUsers)],
            ['Usuarios activos', String(data.participants.activeUsers)],
            [
              'Perfil completado',
              `${data.participants.profileCompleted} (${percentage(data.participants.profileCompleted, data.participants.totalUsers)}%)`,
            ],
            [
              'Consentimiento',
              `${data.participants.consentGiven} (${percentage(data.participants.consentGiven, data.participants.totalUsers)}%)`,
            ],
            ['Edad promedio', numberOrDash(data.participants.averageAge)],
            ['Ingreso mensual promedio', moneyOrDash(data.participants.averageMonthlyIncome)],
          ])}
        </article>
        <article class="panel"><h3>Nivel financiero inicial</h3><p class="panel-intro">Distribución declarada en el perfil.</p>${bars(data.participants.literacyLevels)}</article>
        <article class="panel"><h3>Eventos principales</h3><p class="panel-intro">Interacciones con mayor volumen durante el periodo.</p>${bars(data.usage.eventsByType)}</article>
        <article class="panel"><h3>Builds observados</h3><p class="panel-intro">Versiones detectadas en la telemetría del piloto.</p>${bars(data.usage.betaBuilds)}</article>
        <article class="panel"><h3>Contexto de la muestra</h3><p class="panel-intro">Instituciones y tipos de ingreso reportados.</p>${bars(data.participants.universities)}<div style="height:18px"></div>${bars(data.participants.incomeTypes)}</article>
      </div>
    </section>

    <section id="finanzas" aria-labelledby="finanzas-title">
      <div class="section-heading"><div><h2 id="finanzas-title">Comportamiento financiero</h2><p>Uso real de registros, presupuestos, metas y categorización asistida.</p></div></div>
      <div class="panel-grid">
        <article class="panel">
          <h3>Actividad financiera</h3><p class="panel-intro">Volumen agregado en soles y alcance por usuario.</p>
          ${stats([
            ['Ingresos', `${data.finance.incomeCount} · ${money(data.finance.totalIncome)}`],
            ['Gastos', `${data.finance.expenseCount} · ${money(data.finance.totalExpense)}`],
            [
              'Transferencias',
              `${data.finance.transferCount} · ${money(data.finance.totalTransfer)}`,
            ],
            ['Usuarios con transacciones', String(data.finance.usersWithTransactions)],
            ['Presupuestos', `${data.finance.budgets} · ${data.finance.usersWithBudgets} usuarios`],
            ['Metas de ahorro', `${data.finance.goals} · ${data.finance.usersWithGoals} usuarios`],
          ])}
        </article>
        <article class="panel">
          <h3>Adopción de herramientas</h3><p class="panel-intro">Señales del uso de automatización y planificación.</p>
          ${bars([
            {
              label: 'Categorización IA',
              count: data.finance.aiCategorizedTransactions,
              percentage: data.finance.aiCategoryShare,
            },
            {
              label: 'Vinculación a presupuesto',
              count: data.finance.budgetLinkedTransactions,
              percentage: data.finance.budgetLinkedShare,
            },
          ])}
          <div style="height:22px"></div><h3>Cuentas por tipo</h3>${bars(data.finance.accountTypes)}
        </article>
        <article class="panel wide">
          <h3>Cambio declarado de hábitos</h3><p class="panel-intro">Comparación de observaciones PRE y POST persistidas para la misma cohorte.</p>
          ${stats([
            ['Registro habitual de gastos', behaviorLabel(data.finance.habitualExpenseTracking)],
            ['Planificación de gastos', behaviorLabel(data.finance.expensePlanning)],
            [
              'Exactitud de clasificación IA',
              favorableLabel(
                data.ai.classificationAccuracy.correct,
                data.ai.classificationAccuracy.total,
                data.ai.classificationAccuracy.percentage,
              ),
            ],
          ])}
        </article>
      </div>
    </section>

    <section id="experiencia" aria-labelledby="experiencia-title">
      <div class="section-heading"><div><h2 id="experiencia-title">Experiencia e IA</h2><p>Usabilidad, satisfacción y percepción de las respuestas del asistente.</p></div></div>
      <div class="panel-grid">
        <article class="panel">
          <h3>Calidad del asistente</h3><p class="panel-intro">Valoración explícita de quienes interactuaron con el chat.</p>
          ${stats([
            ['Conversaciones', String(data.ai.conversations)],
            ['Usuarios con chat', String(data.ai.usersWithConversations)],
            ['Mensajes de usuarios', String(data.ai.userMessages)],
            ['Rating promedio', score(data.ai.averageRating)],
            ['Respuestas útiles', percentOrDash(data.ai.helpfulRate)],
            ['Claridad', percentOrDash(data.ai.clearRate)],
            ['Personalización', percentOrDash(data.ai.personalizedRate)],
          ])}
        </article>
        <article class="panel">
          <h3>Usabilidad y satisfacción</h3><p class="panel-intro">Resultados globales de instrumentos posteriores al uso.</p>
          ${stats([
            ['SUS promedio', score(data.surveys.sus.averageScore)],
            ['Respuestas SUS', String(data.surveys.sus.completed)],
            ['Satisfacción promedio', score(data.surveys.satisfaction.averageScore)],
            ['Respuestas de satisfacción', String(data.surveys.satisfaction.completed)],
            ['Rating cualitativo', score(data.qualitativeFeedback.averageRating)],
          ])}
        </article>
        <article class="panel wide">
          <h3>Ítems de satisfacción</h3><p class="panel-intro">Promedio y tamaño de respuesta por pregunta.</p>
          ${satisfactionTable(data.surveys.satisfactionLikert)}
        </article>
      </div>
    </section>

    <section id="voz" aria-labelledby="voz-title">
      <div class="section-heading"><div><h2 id="voz-title">Voz del usuario</h2><p>Muestras anonimizadas para aportar contexto a las métricas cuantitativas.</p></div><span class="status neutral">Sin identificadores directos</span></div>
      <div class="panel-grid">
        <article class="panel"><h3>Satisfacción final</h3><p class="panel-intro">Respuestas abiertas del instrumento final.</p>${openAnswers(data.surveys.openAnswers)}</article>
        <article class="panel"><h3>Comentarios sobre IA y producto</h3><p class="panel-intro">Comentarios recientes limitados a fragmentos breves.</p>${samples([...data.ai.comments, ...data.qualitativeFeedback.samples])}</article>
      </div>
    </section>
  </main>

  <footer><div class="shell"><span>Generado ${escapeHtml(formatDateTime(data.generatedAt))}</span><span>Uso académico · Datos agregados · Sin correos ni identificadores personales</span></div></footer>
</body>
</html>`;
}

function kpi(
  label: string,
  value: string | number,
  detail: string,
  iconName: IconName,
  featured = false,
): string {
  return `<article class="kpi${featured ? ' featured' : ''}"><div class="kpi-label"><span>${escapeHtml(label)}</span><span class="kpi-icon">${icon(iconName)}</span></div><strong class="kpi-value">${escapeHtml(String(value))}</strong><span class="kpi-detail">${escapeHtml(detail)}</span></article>`;
}

function insight(value: string, detail: string): string {
  return `<div class="insight"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(detail)}</span></div>`;
}

function stats(items: Array<[string, string]>): string {
  return `<dl class="stats">${items
    .map(
      ([label, value]) =>
        `<div class="stat-row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`,
    )
    .join('')}</dl>`;
}

function bars(items: CountShare[]): string {
  if (items.length === 0) return empty('Sin datos disponibles para este periodo.');
  return `<div class="data-list">${items
    .map(
      (item) => `<div class="bar">
        <div class="bar-copy"><strong>${escapeHtml(item.label)}</strong><span>${item.count} · ${item.percentage}%</span></div>
        <div class="bar-track" role="img" aria-label="${escapeAttr(`${item.label}: ${item.percentage}%`)}"><i class="bar-fill" style="--w:${clamp(item.percentage, 0, 100)}%"></i></div>
      </div>`,
    )
    .join('')}</div>`;
}

function activityChart(points: DailyResearchPoint[]): string {
  const values = points.slice(-45);
  if (values.length === 0) return empty('Aún no existe actividad diaria para el periodo elegido.');
  const width = 760;
  const height = 260;
  const left = 42;
  const right = 18;
  const top = 18;
  const bottom = 36;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maxValue = Math.max(
    1,
    ...values.flatMap((point) => [point.activeUsers, point.transactions, point.chatMessages]),
  );
  const x = (index: number) =>
    left + (values.length === 1 ? chartWidth / 2 : (index / (values.length - 1)) * chartWidth);
  const y = (value: number) => top + chartHeight - (value / maxValue) * chartHeight;
  const series = [
    { key: 'activeUsers' as const, label: 'Usuarios activos', color: '#087f70' },
    { key: 'transactions' as const, label: 'Transacciones', color: '#3569d4' },
    { key: 'chatMessages' as const, label: 'Mensajes IA', color: '#a45f05' },
  ];
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((ratio) => {
      const lineY = top + chartHeight * (1 - ratio);
      return `<line class="chart-grid" x1="${left}" y1="${lineY}" x2="${width - right}" y2="${lineY}"/><text class="chart-label" x="${left - 8}" y="${lineY + 4}" text-anchor="end">${Math.round(maxValue * ratio)}</text>`;
    })
    .join('');
  const lines = series
    .map((item) => {
      const coords = values.map((point, index) => `${x(index)},${y(point[item.key])}`).join(' ');
      const dots = values
        .map(
          (point, index) =>
            `<circle cx="${x(index)}" cy="${y(point[item.key])}" r="3" fill="${item.color}"><title>${escapeHtml(`${point.date}: ${point[item.key]} ${item.label.toLowerCase()}`)}</title></circle>`,
        )
        .join('');
      return `<polyline class="chart-line" stroke="${item.color}" points="${coords}"/>${dots}`;
    })
    .join('');
  const first = values[0]?.date ?? '';
  const middle = values[Math.floor((values.length - 1) / 2)]?.date ?? '';
  const last = values.at(-1)?.date ?? '';
  return `<div class="chart-frame"><svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="activity-chart-title activity-chart-desc"><title id="activity-chart-title">Actividad diaria</title><desc id="activity-chart-desc">Serie temporal de usuarios activos, transacciones y mensajes de inteligencia artificial.</desc>${grid}${lines}<text class="chart-label" x="${left}" y="${height - 9}">${escapeHtml(shortDate(first))}</text><text class="chart-label" x="${width / 2}" y="${height - 9}" text-anchor="middle">${escapeHtml(shortDate(middle))}</text><text class="chart-label" x="${width - right}" y="${height - 9}" text-anchor="end">${escapeHtml(shortDate(last))}</text></svg></div><div class="legend">${series.map((item) => `<span class="legend-item"><span class="legend-dot" style="--legend-color:${item.color}"></span>${item.label}</span>`).join('')}</div>`;
}

function scoreComparison(data: ResearchDashboardData): string {
  const pre = data.surveys.pre.averageScore;
  const post = data.surveys.post.averageScore;
  const max = Math.max(100, pre ?? 0, post ?? 0);
  const item = (label: string, value: number | null) =>
    `<div class="comparison-item"><strong class="comparison-value">${score(value)}</strong><div class="comparison-track"><i class="comparison-bar" style="height:${value === null ? 0 : clamp((value / max) * 100, 2, 100)}%"></i></div><span class="comparison-label">${label}</span></div>`;
  return `<div class="comparison" role="img" aria-label="Comparación de puntajes promedio PRE y POST">${item('PRE', pre)}${item('POST', post)}</div>`;
}

function satisfactionTable(items: SatisfactionQuestionSummary[]): string {
  if (items.length === 0) return empty('Aún no hay respuestas de satisfacción.');
  return `<div class="table-wrap"><table><thead><tr><th>#</th><th>Pregunta</th><th>Promedio</th><th>Respuestas</th></tr></thead><tbody>${items
    .map(
      (item) =>
        `<tr><td>${item.order}</td><td>${escapeHtml(item.text)}</td><td><strong>${score(item.average)}</strong></td><td>${item.responses}</td></tr>`,
    )
    .join('')}</tbody></table></div>`;
}

function researchResultsTable(data: ResearchDashboardData): string {
  const participants = data.participants.totalUsers;
  const rows: Array<[string, string, string]> = [
    [
      'Participantes con consentimiento',
      String(data.participants.consentGiven),
      data.participants.consentGiven === participants && participants > 0
        ? 'Cohorte completa'
        : `${percentage(data.participants.consentGiven, participants)}% de la cohorte`,
    ],
    [
      'Pares pretest–postest válidos',
      String(data.surveys.pairedPrePostUsers),
      'Comparación de los mismos participantes',
    ],
    [
      'Promedio de conocimiento financiero inicial',
      `${metricNumber(data.surveys.pre.averageScore)}/100`,
      'Medición previa',
    ],
    [
      'Promedio de conocimiento financiero final',
      `${metricNumber(data.surveys.post.averageScore)}/100`,
      'Medición posterior',
    ],
    [
      'Diferencia media',
      `${signedMetric(data.surveys.averagePrePostDelta)} puntos porcentuales`,
      targetInterpretation(data.surveys.averagePrePostDelta, 20, 'puntos'),
    ],
    [
      'SUS promedio',
      `${metricNumber(data.surveys.sus.averageScore)}/100`,
      targetInterpretation(data.surveys.sus.averageScore, 75, 'puntos'),
    ],
    [
      'Utilidad global favorable',
      favorableLabel(
        data.surveys.utilityFavorable.favorable,
        data.surveys.utilityFavorable.total,
        data.surveys.utilityFavorable.percentage,
      ),
      targetInterpretation(data.surveys.utilityFavorable.percentage, 70, '%'),
    ],
    [
      'Intención de continuar utilizando Zenda',
      favorableLabel(
        data.surveys.continuationIntent.favorable,
        data.surveys.continuationIntent.total,
        data.surveys.continuationIntent.percentage,
      ),
      'Intención declarada de continuidad',
    ],
    [
      'Registro habitual de gastos, antes → después',
      behaviorLabel(data.finance.habitualExpenseTracking),
      behaviorInterpretation(data.finance.habitualExpenseTracking),
    ],
    [
      'Planificación de gastos, antes → después',
      behaviorLabel(data.finance.expensePlanning),
      behaviorInterpretation(data.finance.expensePlanning),
    ],
    [
      'Usuarios que registraron movimientos',
      ratioLabel(data.finance.usersWithTransactions, participants),
      'Evidencia de uso',
    ],
    [
      'Usuarios que configuraron presupuestos',
      ratioLabel(data.finance.usersWithBudgets, participants),
      'Adopción de la función',
    ],
    [
      'Usuarios que crearon metas de ahorro',
      ratioLabel(data.finance.usersWithGoals, participants),
      'Adopción de la función',
    ],
    [
      'Exactitud de clasificación de IA',
      favorableLabel(
        data.ai.classificationAccuracy.correct,
        data.ai.classificationAccuracy.total,
        data.ai.classificationAccuracy.percentage,
      ),
      targetInterpretation(data.ai.classificationAccuracy.percentage, 80, '%'),
    ],
  ];
  return `<div class="table-wrap"><table><thead><tr><th>Indicador</th><th>Resultado</th><th>Interpretación</th></tr></thead><tbody>${rows
    .map(
      ([indicator, result, interpretation]) =>
        `<tr><td>${escapeHtml(indicator)}</td><td><strong>${escapeHtml(result)}</strong></td><td>${escapeHtml(interpretation)}</td></tr>`,
    )
    .join('')}</tbody></table></div>`;
}

function behaviorLabel(item: ResearchDashboardData['finance']['habitualExpenseTracking']): string {
  if (item.total === 0) return '—';
  return `${item.pre} → ${item.post} de ${item.total}`;
}

function behaviorInterpretation(
  item: ResearchDashboardData['finance']['habitualExpenseTracking'],
): string {
  if (
    item.prePercentage === null ||
    item.postPercentage === null ||
    item.deltaPercentagePoints === null
  ) {
    return 'Sin medición PRE/POST comparable';
  }
  return `${metricNumber(item.prePercentage)}% → ${metricNumber(item.postPercentage)}%; cambio declarado de ${signedMetric(item.deltaPercentagePoints)} puntos`;
}

function favorableLabel(favorable: number, total: number, value: number | null): string {
  if (total === 0 || value === null) return '—';
  return `${favorable} de ${total} · ${metricNumber(value)}%`;
}

function ratioLabel(value: number, total: number): string {
  if (total === 0) return '—';
  return `${value} de ${total} · ${metricNumber(percentage(value, total))}%`;
}

function targetInterpretation(value: number | null, target: number, unit: string): string {
  if (value === null) return 'Sin datos suficientes';
  return value >= target
    ? `Supera la meta de ${metricNumber(target)} ${unit}`
    : `Por debajo de la meta de ${metricNumber(target)} ${unit}`;
}

function metricNumber(value: number | null): string {
  if (value === null) return '—';
  return new Intl.NumberFormat('es-PE', {
    maximumFractionDigits: 1,
  }).format(value);
}

function signedMetric(value: number | null): string {
  if (value === null) return '—';
  return `${value > 0 ? '+' : ''}${metricNumber(value)}`;
}

function openAnswers(items: OpenAnswerSample[]): string {
  if (items.length === 0) return empty('Aún no hay respuestas abiertas.');
  return `<div class="samples">${items
    .map(
      (item) =>
        `<blockquote><strong>${escapeHtml(item.question)}</strong>${escapeHtml(item.answer)}</blockquote>`,
    )
    .join('')}</div>`;
}

function samples(items: string[]): string {
  if (items.length === 0) return empty('Aún no hay comentarios cualitativos.');
  return `<div class="samples">${items
    .map((item) => `<blockquote>${escapeHtml(item)}</blockquote>`)
    .join('')}</div>`;
}

function empty(message: string): string {
  return `<p class="empty">${escapeHtml(message)}</p>`;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

function evidenceStatus(pairedUsers: number): string {
  if (pairedUsers === 0) return 'Esperando cohorte pareada';
  if (pairedUsers < 5) return 'Muestra inicial';
  return 'Evidencia comparable';
}

function score(value: number | null): string {
  return metricNumber(value);
}

function signedScore(value: number | null): string {
  if (value === null) return '—';
  return `${value > 0 ? '+' : ''}${metricNumber(value)}`;
}

function numberOrDash(value: number | null): string {
  return value === null ? '—' : String(value);
}

function percentOrDash(value: number | null): string {
  return value === null ? '—' : `${value}%`;
}

function percentage(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function money(value: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(value);
}

function moneyOrDash(value: number | null): string {
  return value === null ? '—' : money(value);
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Lima',
  });
}

function shortDate(value: string): string {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year.slice(-2)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

type IconName =
  | 'calendar'
  | 'clock'
  | 'shield'
  | 'filter'
  | 'refresh'
  | 'code'
  | 'download'
  | 'users'
  | 'check'
  | 'compare'
  | 'spark'
  | 'trend'
  | 'wallet';

function icon(name: IconName): string {
  const paths: Record<IconName, string> = {
    calendar: '<path d="M6 2v3M18 2v3M3 9h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    shield:
      '<path d="M12 3 5 6v5c0 4.6 2.8 8.1 7 10 4.2-1.9 7-5.4 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-5"/>',
    filter: '<path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z"/>',
    refresh:
      '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 9A7 7 0 0 1 18 6l2 6M17.9 15A7 7 0 0 1 6 18l-2-6"/>',
    code: '<path d="m8 9-3 3 3 3M16 9l3 3-3 3M14 5l-4 14"/>',
    download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14"/>',
    users:
      '<path d="M16 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-3A4.5 4.5 0 0 0 4 18.5V20M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM17 4a3 3 0 0 1 0 6M20 20v-1.5a4 4 0 0 0-3-3.8"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
    compare: '<path d="M7 3v18M3 7l4-4 4 4M17 21V3m-4 14 4 4 4-4"/>',
    spark: '<path d="M4 17h3l2-5 3 3 3-8 2 5h3"/>',
    trend: '<path d="m4 16 5-5 4 4 7-8M15 7h5v5"/>',
    wallet:
      '<path d="M4 6h15a2 2 0 0 1 2 2v11H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h13v3M16 12h5"/><circle cx="16" cy="12" r=".5"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
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
