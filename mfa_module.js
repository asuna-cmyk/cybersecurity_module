import dotenv from "dotenv";
import nodemailer from "nodemailer";
dotenv.config();

const MFA_CODE_TTL_MS = Number(process.env.MFA_CODE_TTL_MS || 5 * 60 * 1000); // 5 min
const MFA_CODE_LENGTH = Number(process.env.MFA_CODE_LENGTH || 6);             // 6 digits
const FROM_EMAIL = process.env.FROM_EMAIL;
const EMAIL_APP_PASS = process.env.EMAIL_APP_PASS;

// In-memory store: Map<userId, { code, expiresAt, email }>
const challenges = new Map();

// Generate numeric 6-digit OTP
function makeCode() {
  let code = "";
  for (let i = 0; i < MFA_CODE_LENGTH; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
}

// Mask email for UI display
export function maskEmail(email) {
  if (!email) return "";
  const [name, domain] = email.split("@");
  const left = name.slice(0, 2);
  const right = name.slice(-1);
  return `${left}***${right}@${domain}`;
}

// Send OTP email
async function sendEmail(email, code) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: FROM_EMAIL, pass: EMAIL_APP_PASS }
    });

    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: `Your SmartPlant login code: ${code}`,
      text: `Your login verification code is: ${code}\nThis code expires in 5 minutes.`
    });

    return true;
  } catch (err) {
    console.error("[MFA] Email send failed:", err.message);
    return false;
  }
}

 // Start MFA (generate + email OTP)
export async function startMfa(userId, email) {
  if (!userId || !email) return { ok: false, message: "userId and email are required" };

  const code = makeCode();
  const expiresAt = Date.now() + MFA_CODE_TTL_MS;

  const delivered = await sendEmail(email, code);
  if (!delivered) return { ok: false, message: "Failed to send MFA code" };

  challenges.set(String(userId), { code, expiresAt, email });
  return { ok: true, to: maskEmail(email), ttl_ms: MFA_CODE_TTL_MS };
}

// Verify MFA code
export function verifyMfa(userId, code) {
  if (!userId || !code) return { ok: false, message: "userId and code are required" };

  const entry = challenges.get(String(userId));
  if (!entry) return { ok: false, message: "No MFA was requested" };

  if (Date.now() > entry.expiresAt) {
    challenges.delete(String(userId));
    return { ok: false, message: "MFA code expired" };
  }

  if (String(code).trim() !== entry.code) {
    return { ok: false, message: "Incorrect code" };
  }

  challenges.delete(String(userId));
  return { ok: true };
}

// Middleware: block access if MFA not completed
export function requireMfa(req, res, next) {
  if (!req.user?.id && !req.user?.sub) {
    return res.status(401).json({ message: "Login required" });
  }
  if (!req.session?.mfaVerified) {
    return res.status(401).json({ message: "MFA required" });
  }
  next();
}
