import { BadRequestException, Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { BudgetsFacade } from '../../../budgets/application/budgets.facade';
import { IInsightsRepository } from '../../domain/ports/insights.repository';

export interface GeneratePdfReportQuery {
  userId: string;
  fromYear: number;
  fromMonth: number;
  toYear: number;
  toMonth: number;
}

// User-facing PDF content is Spanish-only (the app targets Peruvian students).
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const MAX_RANGE_MONTHS = 6;

const COLOR_PRIMARY = '#4F46E5';
const COLOR_INCOME = '#059669';
const COLOR_EXPENSE = '#DC2626';
const COLOR_AMBER = '#F59E0B';
const COLOR_MUTED = '#6B7280';
const COLOR_BORDER = '#E5E7EB';
const COLOR_TRACK = '#F3F4F6';

@Injectable()
export class GeneratePdfReportUseCase {
  constructor(
    private readonly repo: IInsightsRepository,
    private readonly budgets: BudgetsFacade,
  ) {}

  async execute(query: GeneratePdfReportQuery): Promise<Buffer> {
    const { userId, fromYear, fromMonth, toYear, toMonth } = query;

    // Validate the range: ordered and at most 6 months inclusive.
    const fromIndex = fromYear * 12 + (fromMonth - 1);
    const toIndex = toYear * 12 + (toMonth - 1);
    const spanMonths = toIndex - fromIndex + 1;
    if (spanMonths < 1) {
      throw new BadRequestException('The start of the range must not be after its end');
    }
    if (spanMonths > MAX_RANGE_MONTHS) {
      throw new BadRequestException(`The range cannot exceed ${MAX_RANGE_MONTHS} months`);
    }

    const from = new Date(fromYear, fromMonth - 1, 1);
    const to = new Date(toYear, toMonth, 0, 23, 59, 59, 999);

    // Aggregate income/expense/top-categories/goals over the whole range, and
    // the user's current budgets (most recent month in the range).
    const [data, budgetSnapshots] = await Promise.all([
      this.repo.getPeriodSummary({ userId, from, to }),
      this.budgets.listSnapshotsForPeriod(userId, toMonth, toYear),
    ]);
    const netBalance = data.totalIncome - data.totalExpense;

    const periodLabel =
      spanMonths === 1
        ? `${MONTH_NAMES[fromMonth - 1]} ${fromYear}`
        : `${MONTH_NAMES[fromMonth - 1]} ${fromYear} – ${MONTH_NAMES[toMonth - 1]} ${toYear}`;

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const left = 50;
      const pageRight = doc.page.width - 50;
      const footerReserve = 70;

      // Adds a page and resets the cursor when the next block would overflow.
      const ensureSpace = (needed: number, y: number): number => {
        if (y + needed > doc.page.height - footerReserve) {
          doc.addPage();
          return 50;
        }
        return y;
      };

      // ── Header ──────────────────────────────────────────────────────────
      doc.rect(0, 0, doc.page.width, 80).fill(COLOR_PRIMARY);
      doc.fillColor('white').fontSize(22).font('Helvetica-Bold').text('Zenda', left, 22);
      doc.fontSize(11).font('Helvetica').text('Reporte Financiero', left, 50);
      doc.fillColor('white').fontSize(11).text(periodLabel, 0, 35, { align: 'right' });

      let y = 110;

      // ── Summary ──────────────────────────────────────────────────────────
      doc.fillColor('#1F2937').fontSize(14).font('Helvetica-Bold').text('Resumen', left, y);
      y += 24;
      this.drawSummaryRow(doc, 'Ingresos totales', data.totalIncome, y, COLOR_INCOME);
      y += 28;
      this.drawSummaryRow(doc, 'Gastos totales', data.totalExpense, y, COLOR_EXPENSE);
      y += 36;
      doc.moveTo(left, y).lineTo(pageRight, y).strokeColor(COLOR_BORDER).lineWidth(1).stroke();
      y += 8;
      const balanceColor = netBalance >= 0 ? COLOR_INCOME : COLOR_EXPENSE;
      this.drawSummaryRow(doc, 'Saldo neto', netBalance, y, balanceColor, true);
      y += 48;

      // ── Top expense categories (aggregated over the range) ───────────────
      y = ensureSpace(60, y);
      doc.fillColor('#1F2937').fontSize(14).font('Helvetica-Bold').text('Principales categorías de gasto', left, y);
      y += 24;
      if (data.topCategories.length === 0) {
        doc.fillColor(COLOR_MUTED).fontSize(11).font('Helvetica').text('Sin datos de gastos para este periodo.', left, y);
        y += 28;
      } else {
        const maxAmount = data.topCategories.reduce((m, c) => Math.max(m, c.amount), 0);
        const barMaxWidth = pageRight - 165 - 70;
        for (const cat of data.topCategories) {
          y = ensureSpace(32, y);
          const barWidth = maxAmount > 0 ? (cat.amount / maxAmount) * barMaxWidth : 0;
          doc.fillColor('#374151').fontSize(11).font('Helvetica').text(cat.name, left, y + 4, { width: 110, ellipsis: true });
          doc.rect(165, y, barMaxWidth, 16).fillColor(COLOR_TRACK).fill();
          if (barWidth > 0) doc.rect(165, y, barWidth, 16).fillColor(COLOR_PRIMARY).fill();
          doc.fillColor('#374151').fontSize(10).font('Helvetica-Bold').text(`S/ ${cat.amount.toFixed(2)}`, 165 + barMaxWidth + 6, y + 3);
          y += 32;
        }
        y += 8;
      }

      // ── Current budgets (most recent month in the range) ─────────────────
      y = ensureSpace(60, y);
      const budgetsTitle =
        spanMonths === 1 ? 'Presupuestos del mes' : `Presupuestos actuales (${MONTH_NAMES[toMonth - 1]} ${toYear})`;
      doc.fillColor('#1F2937').fontSize(14).font('Helvetica-Bold').text(budgetsTitle, left, y);
      y += 24;
      if (budgetSnapshots.length === 0) {
        doc.fillColor(COLOR_MUTED).fontSize(11).font('Helvetica').text('Sin presupuestos registrados para este mes.', left, y);
        y += 28;
      } else {
        const barMaxWidth = pageRight - 185 - 110;
        for (const b of budgetSnapshots) {
          y = ensureSpace(36, y);
          const pct = Math.min(100, b.percentageUsed);
          const barWidth = (pct / 100) * barMaxWidth;
          const barColor = pct > 80 ? COLOR_EXPENSE : pct >= 60 ? COLOR_AMBER : COLOR_INCOME;
          const name = b.categoryName ?? 'Presupuesto';
          doc.fillColor('#374151').fontSize(11).font('Helvetica').text(name, left, y, { width: 120, ellipsis: true });
          doc.fillColor(COLOR_MUTED).fontSize(9).text(`S/ ${b.currentSpent.toFixed(2)} / S/ ${b.amountLimit.toFixed(2)}`, left, y + 15);
          doc.rect(185, y + 4, barMaxWidth, 12).fillColor(COLOR_TRACK).fill();
          if (barWidth > 0) doc.rect(185, y + 4, barWidth, 12).fillColor(barColor).fill();
          doc.fillColor('#374151').fontSize(9).font('Helvetica-Bold').text(`${pct.toFixed(0)}%`, 185 + barMaxWidth + 6, y + 6);
          y += 36;
        }
        y += 8;
      }

      // ── Savings goals ────────────────────────────────────────────────────
      if (data.goalsProgress.length > 0) {
        y = ensureSpace(60, y);
        doc.fillColor('#1F2937').fontSize(14).font('Helvetica-Bold').text('Metas de ahorro', left, y);
        y += 24;
        const barMaxWidth = pageRight - 185 - 40;
        for (const goal of data.goalsProgress) {
          y = ensureSpace(40, y);
          const barWidth = goal.progressPercent > 0 ? (goal.progressPercent / 100) * barMaxWidth : 0;
          doc.fillColor('#374151').fontSize(11).font('Helvetica').text(goal.name, left, y, { width: 130, ellipsis: true });
          doc.fillColor(COLOR_MUTED).fontSize(9).text(`S/ ${goal.currentAmount.toFixed(2)} / S/ ${goal.targetAmount.toFixed(2)}`, left, y + 15);
          doc.rect(185, y + 4, barMaxWidth, 12).fillColor(COLOR_TRACK).fill();
          if (barWidth > 0) doc.rect(185, y + 4, barWidth, 12).fillColor(COLOR_INCOME).fill();
          doc.fillColor('#374151').fontSize(9).font('Helvetica-Bold').text(`${goal.progressPercent.toFixed(0)}%`, 185 + barMaxWidth + 6, y + 6);
          y += 40;
        }
      }

      // ── Footer (current/last page) ───────────────────────────────────────
      const footerY = doc.page.height - 50;
      doc.moveTo(left, footerY).lineTo(pageRight, footerY).strokeColor(COLOR_BORDER).lineWidth(1).stroke();
      doc
        .fillColor(COLOR_MUTED)
        .fontSize(9)
        .font('Helvetica')
        .text(`Generado por Zenda el ${new Date().toLocaleDateString('es-PE')}`, left, footerY + 8, { align: 'center' });

      doc.end();
    });
  }

  private drawSummaryRow(
    doc: PDFKit.PDFDocument,
    label: string,
    amount: number,
    y: number,
    color: string,
    bold = false,
  ): void {
    const font = bold ? 'Helvetica-Bold' : 'Helvetica';
    const fontSize = bold ? 13 : 12;
    doc.fillColor('#374151').font(font).fontSize(fontSize).text(label, 50, y);
    doc.fillColor(color).font('Helvetica-Bold').fontSize(fontSize).text(`S/ ${amount.toFixed(2)}`, 0, y, { align: 'right' });
  }
}
