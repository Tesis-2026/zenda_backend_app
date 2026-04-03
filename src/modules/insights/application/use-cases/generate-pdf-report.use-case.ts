import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';
import { IInsightsRepository } from '../../domain/ports/insights.repository';

export interface GeneratePdfReportQuery {
  userId: string;
  year: number;
  month: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const COLOR_PRIMARY = '#4F46E5';
const COLOR_INCOME = '#059669';
const COLOR_EXPENSE = '#DC2626';
const COLOR_MUTED = '#6B7280';
const COLOR_BORDER = '#E5E7EB';

@Injectable()
export class GeneratePdfReportUseCase {
  constructor(private readonly repo: IInsightsRepository) {}

  async execute(query: GeneratePdfReportQuery): Promise<Buffer> {
    const { userId, year, month } = query;
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59, 999);

    const data = await this.repo.getMonthSummary({ userId, year, month, from, to });
    const netBalance = data.totalIncome - data.totalExpense;

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Header ──────────────────────────────────────────────────────────
      doc
        .rect(0, 0, doc.page.width, 80)
        .fill(COLOR_PRIMARY);

      doc
        .fillColor('white')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('Zenda', 50, 22);

      doc
        .fontSize(11)
        .font('Helvetica')
        .text('Financial Report', 50, 50);

      const periodLabel = `${MONTH_NAMES[month - 1]} ${year}`;
      doc
        .fillColor('white')
        .fontSize(11)
        .text(periodLabel, 0, 35, { align: 'right' });

      // ── Summary section ──────────────────────────────────────────────────
      const sectionTop = 110;
      doc.fillColor('#1F2937').fontSize(14).font('Helvetica-Bold').text('Summary', 50, sectionTop);

      const summaryY = sectionTop + 24;
      this.drawSummaryRow(doc, 'Total Income', data.totalIncome, summaryY, COLOR_INCOME);
      this.drawSummaryRow(doc, 'Total Expense', data.totalExpense, summaryY + 28, COLOR_EXPENSE);

      // divider
      doc
        .moveTo(50, summaryY + 64)
        .lineTo(doc.page.width - 50, summaryY + 64)
        .strokeColor(COLOR_BORDER)
        .lineWidth(1)
        .stroke();

      const balanceColor = netBalance >= 0 ? COLOR_INCOME : COLOR_EXPENSE;
      this.drawSummaryRow(doc, 'Net Balance', netBalance, summaryY + 72, balanceColor, true);

      // ── Top Categories ───────────────────────────────────────────────────
      const catSectionTop = summaryY + 120;
      doc
        .fillColor('#1F2937')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Top Expense Categories', 50, catSectionTop);

      if (data.topCategories.length === 0) {
        doc
          .fillColor(COLOR_MUTED)
          .fontSize(11)
          .font('Helvetica')
          .text('No expense data for this period.', 50, catSectionTop + 24);
      } else {
        const maxAmount = data.topCategories.reduce((m, c) => Math.max(m, c.amount), 0);
        const barMaxWidth = doc.page.width - 160;

        data.topCategories.forEach((cat, i) => {
          const rowY = catSectionTop + 24 + i * 32;
          const barWidth = maxAmount > 0 ? (cat.amount / maxAmount) * barMaxWidth : 0;

          // category name
          doc
            .fillColor('#374151')
            .fontSize(11)
            .font('Helvetica')
            .text(cat.name, 50, rowY + 4, { width: 110, ellipsis: true });

          // bar background
          doc
            .rect(165, rowY, barMaxWidth, 16)
            .fillColor('#F3F4F6')
            .fill();

          // bar fill
          if (barWidth > 0) {
            doc
              .rect(165, rowY, barWidth, 16)
              .fillColor(COLOR_PRIMARY)
              .fill();
          }

          // amount label
          doc
            .fillColor('#374151')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(`S/ ${cat.amount.toFixed(2)}`, 165 + barMaxWidth + 6, rowY + 3);
        });
      }

      // ── Goals Progress ───────────────────────────────────────────────────
      const goalsSectionTop =
        catSectionTop + 24 + Math.max(data.topCategories.length, 1) * 32 + 20;

      if (data.goalsProgress.length > 0) {
        doc
          .fillColor('#1F2937')
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('Savings Goals', 50, goalsSectionTop);

        data.goalsProgress.forEach((goal, i) => {
          const rowY = goalsSectionTop + 24 + i * 40;
          const barMaxWidth = doc.page.width - 200;
          const barWidth = goal.progressPercent > 0 ? (goal.progressPercent / 100) * barMaxWidth : 0;

          doc
            .fillColor('#374151')
            .fontSize(11)
            .font('Helvetica')
            .text(goal.name, 50, rowY, { width: 130, ellipsis: true });

          doc
            .fillColor(COLOR_MUTED)
            .fontSize(9)
            .text(
              `S/ ${goal.currentAmount.toFixed(2)} / S/ ${goal.targetAmount.toFixed(2)}`,
              50, rowY + 15,
            );

          // bar background
          doc.rect(185, rowY + 4, barMaxWidth, 12).fillColor('#F3F4F6').fill();

          // bar fill
          if (barWidth > 0) {
            doc.rect(185, rowY + 4, barWidth, 12).fillColor(COLOR_INCOME).fill();
          }

          // percent label
          doc
            .fillColor('#374151')
            .fontSize(9)
            .font('Helvetica-Bold')
            .text(`${goal.progressPercent.toFixed(0)}%`, 185 + barMaxWidth + 6, rowY + 6);
        });
      }

      // ── Footer ───────────────────────────────────────────────────────────
      const footerY = doc.page.height - 50;
      doc
        .moveTo(50, footerY)
        .lineTo(doc.page.width - 50, footerY)
        .strokeColor(COLOR_BORDER)
        .lineWidth(1)
        .stroke();

      doc
        .fillColor(COLOR_MUTED)
        .fontSize(9)
        .font('Helvetica')
        .text(
          `Generated by Zenda on ${new Date().toLocaleDateString('en-US')}`,
          50,
          footerY + 8,
          { align: 'center' },
        );

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

    doc
      .fillColor(color)
      .font('Helvetica-Bold')
      .fontSize(fontSize)
      .text(`S/ ${amount.toFixed(2)}`, 0, y, { align: 'right' });
  }
}
