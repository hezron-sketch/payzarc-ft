/**
 * Generates a branded Payzarc PDF account statement — a summary of totals
 * followed by a multi-row transaction table on standard A4 pages, using the
 * same palette as the single-transaction receipt (generateReceipt.js) for a
 * consistent brand.
 */

const NAVY = [28, 35, 51];
const GOLD = [236, 201, 75];
const DARK = [30, 30, 30];
const MUTED = [120, 120, 120];
const FAINT = [180, 180, 180];
const ROW_ALT = [247, 245, 237];
const SUMMARY_BG = [247, 245, 237];
const SUCCESS = [22, 163, 74];
const DANGER = [220, 38, 38];

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 14;
const HEADER_HEIGHT = 38;
const ROW_HEIGHT = 9;
const FOOTER_HEIGHT = 16;
const SUMMARY_ROW_HEIGHT = 6.5;
const COLS = [
  { label: "Date", key: "date", width: 26, align: "left" },
  { label: "Recipient", key: "recipient", width: 62, align: "left" },
  { label: "Currency", key: "currency", width: 22, align: "left" },
  { label: "Amount", key: "amount", width: 34, align: "right" },
  { label: "Status", key: "status", width: 32, align: "right" },
];

const formatAmount = (tx) => {
  const amount = Number(tx.amount || 0);
  const prefix = tx.transaction_type === "CREDIT" ? "+" : "-";
  return `${prefix}${amount.toFixed(2)}`;
};

// One totals bucket per currency — summing across currencies would produce
// a meaningless number, so sent/received are kept separate per currency
// and each prints its own line.
function summarize(transactions) {
  const byCurrency = {};
  transactions.forEach((tx) => {
    const currency = tx.currency || "USD";
    const amount = Number(tx.amount || 0);
    const bucket = (byCurrency[currency] ||= {
      sentCount: 0,
      sentTotal: 0,
      receivedCount: 0,
      receivedTotal: 0,
    });
    if (tx.transaction_type === "CREDIT") {
      bucket.receivedCount += 1;
      bucket.receivedTotal += amount;
    } else {
      bucket.sentCount += 1;
      bucket.sentTotal += amount;
    }
  });
  return byCurrency;
}

export async function generateStatementPDF(transactions, options = {}) {
  const jsPDFModule = await import("jspdf");
  const { jsPDF } = jsPDFModule;
  const { accountName, periodFrom, periodTo, typeLabel, balanceSummary } =
    options;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const text = (str, x, y, opts = {}) => {
    const { size = 9, weight = "normal", align = "left", color = DARK } = opts;
    doc.setFontSize(size);
    doc.setFont(undefined, weight);
    doc.setTextColor(...color);
    doc.text(String(str), x, y, { align });
  };

  let pageNum = 0;
  const drawBand = () => {
    pageNum += 1;
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, "F");
    text("PAYZARC", MARGIN, 17, { size: 20, weight: "bold", color: GOLD });
    text("ACCOUNT STATEMENT", MARGIN, 24, {
      size: 9,
      color: [200, 200, 200],
    });
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, 27.5, MARGIN + 24, 27.5);

    const metaX = PAGE_WIDTH - MARGIN;
    if (accountName) {
      text(accountName, metaX, 15, { align: "right", color: [230, 230, 230] });
    }
    const period =
      periodFrom || periodTo
        ? `${periodFrom || "—"} to ${periodTo || "—"}`
        : "All transactions";
    const typeSuffix = typeLabel && typeLabel !== "All types" ? ` · ${typeLabel}` : "";
    text(`${period}${typeSuffix}`, metaX, 20.5, {
      size: 8,
      align: "right",
      color: [180, 180, 180],
    });
    text(`Generated ${new Date().toLocaleDateString()}`, metaX, 25.5, {
      size: 7.5,
      align: "right",
      color: [160, 160, 160],
    });
  };

  const drawTableHeader = (y) => {
    let x = MARGIN;
    COLS.forEach((col) => {
      text(col.label, col.align === "right" ? x + col.width : x, y, {
        size: 8,
        weight: "bold",
        align: col.align,
        color: MUTED,
      });
      x += col.width;
    });
    doc.setDrawColor(...FAINT);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y + 2.5, PAGE_WIDTH - MARGIN, y + 2.5);
    return y + 2.5;
  };

  // Summary panel — only on page 1, right under the header band. Height
  // grows with however many currencies are involved (usually just one).
  const drawSummary = (y) => {
    const byCurrency = summarize(transactions);
    const currencies = Object.keys(byCurrency);
    const period =
      periodFrom || periodTo
        ? `${periodFrom || "—"} to ${periodTo || "—"}`
        : "All time";
    const lines = [
      ["Statement period", period],
      ["Transactions", String(transactions.length)],
    ];
    if (balanceSummary) {
      lines.push([
        `Opening balance (${balanceSummary.currency})`,
        balanceSummary.opening.toFixed(2),
      ]);
    }
    currencies.forEach((currency) => {
      const b = byCurrency[currency];
      if (b.receivedCount > 0) {
        lines.push([
          `Received (${currency}, ${b.receivedCount})`,
          `+${b.receivedTotal.toFixed(2)}`,
          SUCCESS,
        ]);
      }
      if (b.sentCount > 0) {
        lines.push([
          `Sent (${currency}, ${b.sentCount})`,
          `-${b.sentTotal.toFixed(2)}`,
          DANGER,
        ]);
      }
    });
    if (balanceSummary) {
      lines.push([
        `Closing balance (${balanceSummary.currency})`,
        balanceSummary.closing.toFixed(2),
      ]);
    }

    const boxHeight = 8 + lines.length * SUMMARY_ROW_HEIGHT;
    doc.setFillColor(...SUMMARY_BG);
    doc.roundedRect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, boxHeight, 2, 2, "F");
    text("STATEMENT SUMMARY", MARGIN + 5, y + 7, {
      size: 8.5,
      weight: "bold",
      color: DARK,
    });
    let rowY = y + 7 + SUMMARY_ROW_HEIGHT;
    lines.forEach(([label, value, color = DARK]) => {
      text(label, MARGIN + 5, rowY, { size: 8.5, color: MUTED });
      text(value, PAGE_WIDTH - MARGIN - 5, rowY, {
        size: 8.5,
        weight: "bold",
        align: "right",
        color,
      });
      rowY += SUMMARY_ROW_HEIGHT;
    });

    return y + boxHeight + 8;
  };

  const drawFooter = () => {
    const y = PAGE_HEIGHT - FOOTER_HEIGHT;
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    text("Thank you for choosing Payzarc.", MARGIN, y + 6, {
      size: 7.5,
      color: MUTED,
    });
    text("support@payzarc.com · www.payzarc.com", MARGIN, y + 11, {
      size: 7,
      color: FAINT,
    });
    text(`Page ${pageNum}`, PAGE_WIDTH - MARGIN, y + 11, {
      size: 7,
      align: "right",
      color: FAINT,
    });
  };

  const maxY = PAGE_HEIGHT - FOOTER_HEIGHT - 4;

  drawBand();
  let y = drawSummary(HEADER_HEIGHT + 8);
  y = drawTableHeader(y);

  transactions.forEach((tx, i) => {
    if (y + ROW_HEIGHT > maxY) {
      drawFooter();
      doc.addPage();
      drawBand();
      y = drawTableHeader(HEADER_HEIGHT + 8);
    }
    if (i % 2 === 0) {
      doc.setFillColor(...ROW_ALT);
      doc.rect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, ROW_HEIGHT, "F");
    }
    const row = {
      date: new Date(
        tx.created_at || tx.date || tx.timestamp,
      ).toLocaleDateString(),
      recipient: tx.name || tx.recipient_name || tx.sender_name || "N/A",
      currency: tx.currency || "USD",
      amount: formatAmount(tx),
      status:
        tx.status || (tx.transaction_type === "CREDIT" ? "Received" : "Paid"),
    };
    const rowY = y + ROW_HEIGHT / 2 + 1.5;
    let x = MARGIN;
    COLS.forEach((col) => {
      const value = row[col.key];
      const color =
        col.key === "amount" ? (value.startsWith("+") ? SUCCESS : DANGER) : DARK;
      text(value, col.align === "right" ? x + col.width - 2 : x + 2, rowY, {
        size: 8.5,
        weight: col.key === "amount" ? "bold" : "normal",
        align: col.align,
        color,
      });
      x += col.width;
    });
    y += ROW_HEIGHT;
  });

  if (transactions.length === 0) {
    text("No transactions in this statement.", PAGE_WIDTH / 2, y + 10, {
      size: 9,
      align: "center",
      color: MUTED,
    });
  }

  drawFooter();

  const filename = `Payzarc_Statement_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

export default generateStatementPDF;
