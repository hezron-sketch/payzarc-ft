const NAVY = [28, 35, 51];
const GOLD = [236, 201, 75];
const DARK = [30, 30, 30];
const MUTED = [120, 120, 120];
const FAINT = [180, 180, 180];
const LINE = [220, 220, 220];

const STATUS_COLORS = {
  paid: [34, 197, 94],
  sent: [34, 197, 94],
  completed: [34, 197, 94],
  received: [59, 130, 246],
  pending: [251, 191, 36],
};

const PAGE_WIDTH = 110;
const PAGE_HEIGHT = 204;
const MARGIN = 10;

export async function generateReceiptPDF(transaction) {
  const jsPDFModule = await import("jspdf");
  const { jsPDF } = jsPDFModule;

  const refNo =
    transaction.refNo ||
    transaction.transaction_code ||
    transaction.reference ||
    "N/A";
  const name =
    transaction.name ||
    transaction.recipient_name ||
    transaction.sender_name ||
    "N/A";
  const amount = transaction.amount ?? "N/A";
  const fee = transaction.fee ?? transaction.transaction_fee ?? "N/A";
  const rawDate =
    transaction.date || transaction.created_at || transaction.timestamp;
  const date = rawDate ? new Date(rawDate).toLocaleString() : "N/A";
  const recipient =
    transaction.recipient ||
    transaction.recipient_name ||
    transaction.recipient_number ||
    "N/A";
  const status =
    transaction.status ||
    (transaction.transaction_type === "CREDIT" ? "Received" : "Paid");
  const country =
    transaction.country || transaction.recipient_country || "N/A";
  const statusKey = status.toLowerCase();
  const statusColor = STATUS_COLORS[statusKey] || [156, 163, 175];

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [PAGE_WIDTH, PAGE_HEIGHT],
  });

  const centerX = PAGE_WIDTH / 2;

  const text = (str, y, options = {}) => {
    const {
      x = centerX,
      size = 10,
      weight = "normal",
      align = "center",
      color = DARK,
    } = options;
    doc.setFontSize(size);
    doc.setFont(undefined, weight);
    doc.setTextColor(...color);
    doc.text(String(str), x, y, { align });
  };

  const dashedLine = (y) => {
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    doc.setLineDashPattern([], 0);
  };

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_WIDTH, 34, "F");
  text("PAYZARC", 15, { size: 19, weight: "bold", color: GOLD });
  text("TRANSACTION RECEIPT", 22, { size: 7.5, color: [200, 200, 200] });
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(centerX - 12, 27, centerX + 12, 27);

  const iconY = 48;
  doc.setFillColor(...statusColor);
  doc.circle(centerX, iconY, 9, "F");
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.1);
  doc.setLineCap(1);
  doc.setLineJoin(1);
  if (statusKey === "pending") {
    doc.circle(centerX, iconY, 4.5, "S");
  } else {
    doc.line(centerX - 4, iconY, centerX - 1.3, iconY + 3);
    doc.line(centerX - 1.3, iconY + 3, centerX + 4.5, iconY - 4);
  }

  text(status.toUpperCase(), 65, {
    size: 11,
    weight: "bold",
    color: statusColor,
  });

  text("AMOUNT", 74, { size: 7.5, color: MUTED });
  const amountStr = typeof amount === "number" ? amount.toFixed(2) : amount;
  text(amountStr, 87, { size: 25, weight: "bold", color: NAVY });

  const feeStr = typeof fee === "number" ? fee.toFixed(2) : fee;
  text(`+ Fee ${feeStr}`, 94, { size: 8.5, color: MUTED });

  dashedLine(101);

  text("TRANSACTION DETAILS", 110, {
    x: MARGIN,
    align: "left",
    size: 9,
    weight: "bold",
    color: DARK,
  });

  const rows = [
    ["Reference", refNo],
    ["Date", date],
    ["Recipient", name],
    ["Account / Phone", recipient],
    ["Destination", country],
  ];

  let y = 118;
  rows.forEach(([label, value]) => {
    text(label, y, { x: MARGIN, align: "left", size: 8.5, color: MUTED });
    text(value, y, {
      x: PAGE_WIDTH - MARGIN,
      align: "right",
      size: 8.5,
      weight: "bold",
      color: DARK,
    });
    y += 7.5;
  });

  y += 3;
  doc.setFillColor(252, 246, 227);
  doc.roundedRect(MARGIN, y - 5.5, PAGE_WIDTH - MARGIN * 2, 11, 2, 2, "F");
  text("TOTAL CHARGED", y, {
    x: MARGIN + 4,
    align: "left",
    size: 8.5,
    weight: "bold",
    color: DARK,
  });
  const totalCharged =
    typeof amount === "number" && typeof fee === "number"
      ? (amount + fee).toFixed(2)
      : "N/A";
  text(totalCharged, y, {
    x: PAGE_WIDTH - MARGIN - 4,
    align: "right",
    size: 10.5,
    weight: "bold",
    color: NAVY,
  });

  dashedLine(y + 14);

  let footerY = y + 22;
  text("Thank you for choosing Payzarc.", footerY, {
    size: 8,
    color: MUTED,
  });
  footerY += 6;
  text("support@payzarc.com · www.payzarc.com", footerY, {
    size: 7.5,
    color: MUTED,
  });
  footerY += 6;
  text(`Generated ${new Date().toLocaleString()}`, footerY, {
    size: 6.5,
    color: FAINT,
  });

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.line(0, PAGE_HEIGHT - 4, PAGE_WIDTH, PAGE_HEIGHT - 4);

  const filename = `Payzarc_Receipt_${refNo}.pdf`;
  doc.save(filename);
}

export default generateReceiptPDF;
