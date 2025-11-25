import nodemailer from "nodemailer";
import fs from "fs";

const sendInvoiceEmail = async (email, plan, amount, invoicePath) => {
  try {
    // Check if invoice exists
    if (!fs.existsSync(invoicePath)) {
      console.log("❌ Invoice file not found:", invoicePath);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // must be 16 chars, no spaces
      },
    });

    await transporter.sendMail({
      from: `"Chat App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Invoice - ${plan.toUpperCase()} Plan`,
      html: `
        <h2>Payment Successful 🎉</h2>
        <p>Your subscription has been upgraded.</p>
        <ul>
          <li>Plan: <strong>${plan.toUpperCase()}</strong></li>
          <li>Amount Paid: <strong>₹${amount}</strong></li>
        </ul>
        <p>Your invoice is attached below.</p>
      `,
      attachments: [
        {
          filename: "Invoice.pdf",
          path: invoicePath,
          contentType: "application/pdf",
        },
      ],
    });

    console.log("✅ Invoice email sent successfully");

  } catch (err) {
    console.error("❌ Email sending failed:", err);
  }
};

export default sendInvoiceEmail;
