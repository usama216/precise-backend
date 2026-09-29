require("dotenv").config();
const express = require("express");
const multer = require("multer");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Store the uploaded file in memory (not on disk) — fine for small files
// that get forwarded straight into an email attachment.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB cap — adjust as needed
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true", // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

app.post("/api/contact", upload.single("file"), async (req, res) => {
  try {
    const { firstName, lastName, email, company, details } = req.body;
    const file = req.file;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const attachments = [];
    if (file) {
      attachments.push({
        filename: file.originalname,
        content: file.buffer,
      });
    }

    await transporter.sendMail({
      from: `"BuildScope Website" <${process.env.SMTP_USER}>`,
      to: process.env.RECEIVING_EMAIL,
      replyTo: email,
      subject: `New demo request — ${firstName} ${lastName}${company ? ` (${company})` : ""}`,
      text: [
        `Name: ${firstName} ${lastName}`,
        `Email: ${email}`,
        `Company: ${company || "N/A"}`,
        "",
        "Details:",
        details || "N/A",
        "",
        file ? `Attached file: ${file.originalname}` : "No file attached.",
      ].join("\n"),
      attachments,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Contact form error:", err);
    res.status(500).json({ success: false, error: "Something went wrong sending your request." });
  }
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
