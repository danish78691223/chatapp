import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const generateInvoice = (user, plan, amount) => {
  return new Promise((resolve, reject) => {
    const folder = path.join(process.cwd(), "invoices");

    // Create folder if missing
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }

    const filePath = path.join(folder, `${user._id}_${Date.now()}.pdf`);

    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(filePath);

    // PDF → file
    doc.pipe(writeStream);

    // Build Invoice
    doc.fontSize(24).text("PAYMENT INVOICE", { align: "center" });
    doc.moveDown();

    doc.fontSize(16).text(`User: ${user.name} (${user.email})`);
    doc.text(`Plan: ${plan.toUpperCase()}`);
    doc.text(`Amount Paid: ₹${amount}`);
    doc.text(`Date: ${new Date().toLocaleString()}`);

    doc.end();

    // VERY IMPORTANT: use stream finish event, not doc finish
    writeStream.on("finish", () => {
      console.log("📄 Invoice file created:", filePath);
      resolve(filePath);
    });

    writeStream.on("error", (err) => {
      console.error("❌ Error creating invoice:", err);
      reject(err);
    });
  });
};

export default generateInvoice;
