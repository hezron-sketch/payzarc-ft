/**
 * generateReceipt.js
 * Generates a professional, branded PDF receipt for Payzarc transactions
 * with company branding, transaction details, and a polished layout.
 */

export async function generateReceiptPDF(
  transaction,
  recipientFlagEmoji = "🏳️",
) {
  // Dynamic import of jsPDF - add this to your package.json dependencies:
  // npm install jspdf
  const jsPDFModule = await import("jspdf");
  const { jsPDF } = jsPDFModule;

  // Extract transaction data with fallbacks
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
  const country = transaction.country || transaction.recipient_country || "N/A";

  // Create PDF in portrait orientation
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 15;

  // Helper to add text
  const addText = (text, x = pageWidth / 2, y = yPosition, options = {}) => {
    const {
      size = 12,
      weight = "normal",
      align = "center",
      color = [30, 30, 30],
    } = options;

    doc.setFontSize(size);
    doc.setFont(undefined, weight);
    doc.setTextColor(...color);
    doc.text(text, x, y, { align });
    return y + size / 2 + 2;
  };

  const addLine = (y, color = [200, 200, 200]) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    doc.line(15, y, pageWidth - 15, y);
    return y + 3;
  };

  // Header: Payzarc Branding
  doc.setFillColor(28, 35, 51); // Dark navy background
  doc.rect(0, 0, pageWidth, 35, "F");

  yPosition = 12;
  doc.setFontSize(24);
  doc.setFont(undefined, "bold");
  doc.setTextColor(236, 201, 75); // Gold color
  doc.text("PAYZARC", pageWidth / 2, yPosition, { align: "center" });

  yPosition = 22;
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.setTextColor(200, 200, 200); // Light gray
  doc.text("TRANSACTION RECEIPT", pageWidth / 2, yPosition, {
    align: "center",
  });

  yPosition = 40;

  // Receipt Title
  yPosition = addText("TRANSACTION RECEIPT", pageWidth / 2, yPosition, {
    size: 14,
    weight: "bold",
    color: [30, 30, 30],
  });
  yPosition += 5;

  // Status Badge
  const statusColor =
    status.toLowerCase() === "paid" || status.toLowerCase() === "sent"
      ? [34, 197, 94] // Green
      : status.toLowerCase() === "received"
        ? [59, 130, 246] // Blue
        : [156, 163, 175]; // Gray
  const statusBackground = statusColor.map((c) =>
    c + 200 > 255 ? 255 : c + 200,
  );

  doc.setFillColor(...statusBackground);
  doc.roundedRect(15, yPosition - 4, pageWidth - 30, 8, 2, 2, "F");
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.setTextColor(...statusColor);
  doc.text(status.toUpperCase(), pageWidth / 2, yPosition + 1, {
    align: "center",
  });

  yPosition += 12;

  // Reference Number
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.setTextColor(120, 120, 120);
  doc.text("Reference: " + refNo, 15, yPosition);
  yPosition += 6;

  // Date
  doc.text("Date: " + date, 15, yPosition);
  yPosition += 8;

  yPosition = addLine(yPosition);

  // Amount Section (highlighted)
  yPosition += 3;
  doc.setFillColor(249, 250, 251); // Light background
  doc.rect(15, yPosition - 4, pageWidth - 30, 45, "F");

  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.setTextColor(120, 120, 120);
  doc.text("Amount Sent", 20, yPosition);

  const amountStr = typeof amount === "number" ? amount.toFixed(2) : amount;
  doc.setFontSize(20);
  doc.setFont(undefined, "bold");
  doc.setTextColor(236, 201, 75); // Gold
  doc.text(amountStr, pageWidth - 20, yPosition, { align: "right" });

  yPosition += 12;
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.setTextColor(120, 120, 120);
  doc.text("Transaction Fee", 20, yPosition);

  const feeStr = typeof fee === "number" ? fee.toFixed(2) : fee;
  doc.setFontSize(11);
  doc.setFont(undefined, "bold");
  doc.setTextColor(100, 100, 100);
  doc.text(feeStr, pageWidth - 20, yPosition, { align: "right" });

  yPosition += 10;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(20, yPosition - 2, pageWidth - 20, yPosition - 2);

  yPosition += 4;
  doc.setFontSize(9);
  doc.setFont(undefined, "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Total Charged", 20, yPosition);

  const totalCharged =
    typeof amount === "number" && typeof fee === "number"
      ? (amount + fee).toFixed(2)
      : "N/A";
  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(totalCharged, pageWidth - 20, yPosition, { align: "right" });

  yPosition += 15;

  yPosition = addLine(yPosition);

  // Transaction Details
  yPosition += 5;
  doc.setFontSize(11);
  doc.setFont(undefined, "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("RECIPIENT DETAILS", 15, yPosition);
  yPosition += 8;

  // Detail rows
  const detailRows = [
    ["Recipient Name", name],
    ["Account/Phone", recipient],
    ["Destination Country", `${recipientFlagEmoji} ${country}`],
  ];

  detailRows.forEach(([label, value]) => {
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(label, 15, yPosition);

    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(String(value), pageWidth - 15, yPosition, { align: "right" });

    yPosition += 7;
  });

  yPosition += 5;
  yPosition = addLine(yPosition);

  // Footer
  yPosition = pageHeight - 25;

  doc.setFontSize(8);
  doc.setFont(undefined, "normal");
  doc.setTextColor(150, 150, 150);
  doc.text(
    "This receipt confirms your transaction details. Please keep it safe for your records.",
    pageWidth / 2,
    yPosition,
    { align: "center" },
  );

  yPosition += 6;
  doc.text(
    "For support, visit www.payzarc.com or contact support@payzarc.com",
    pageWidth / 2,
    yPosition,
    { align: "center" },
  );

  yPosition += 6;
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text(
    `Receipt generated on ${new Date().toLocaleString()}`,
    pageWidth / 2,
    yPosition,
    { align: "center" },
  );

  // Bottom border line
  doc.setDrawColor(236, 201, 75);
  doc.setLineWidth(0.8);
  doc.line(15, pageHeight - 8, pageWidth - 15, pageHeight - 8);

  // Download the PDF
  const filename = `Payzarc_Receipt_${refNo}.pdf`;
  doc.save(filename);
}

export default generateReceiptPDF;
