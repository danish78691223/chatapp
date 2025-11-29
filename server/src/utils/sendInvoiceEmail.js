import fs from "fs";
import brevo from "./brevoClient.js";

const sendInvoiceEmail = async (email, plan, amount, filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      console.log("❌ Invoice not found:", filePath);
      return;
    }

    const pdfBase64 = fs.readFileSync(filePath, { encoding: "base64" });

    await brevo.sendTransacEmail({
      sender: { email: process.env.BREVO_SENDER },
      to: [{ email }],
      subject: `Invoice for ${plan.toUpperCase()} Plan`,
      htmlContent: `
        <h2>Your Payment Invoice</h2>
        <p>Plan: <b>${plan.toUpperCase()}</b></p>
        <p>Amount Paid: <b>₹${amount}</b></p>
      `,
      attachment: [
        {
          name: "invoice.pdf",
          content: pdfBase64
        }
      ]
    });

    console.log("📧 Invoice Sent →", email);
  } catch (err) {
    console.log("❌ Invoice Email Error:", err.message);
  }
};

export default sendInvoiceEmail;
