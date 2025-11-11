import db from "./config/db.js";
import {
  makeLookupKey,     // HMAC index for fast search (email)
  encryptText,       // AES-GCM encrypt
  decryptText,       // AES-GCM decrypt
  saveBundle,        // object -> JSON
  loadBundle,        // JSON -> object
  hashPassword,      // bcrypt hash
  checkPassword,     // bcrypt compare
} from "./modules/encryption_module.js";
import { startMfa, verifyMfa } from "./modules/mfa_module.js";

// Create Account
export async function createAccount({ email, username, password, role_id }) {
  if (!email || !password) throw new Error("email and password are required");

  const password_hash = await hashPassword(password);

  const email_index = makeLookupKey(email);
  const username_index = username ? makeLookupKey(username) : null;

  const email_bundle_json = saveBundle(encryptText(email));
  const username_bundle_json = username ? saveBundle(encryptText(username)) : null;

  const [r] = await db.execute(
    `INSERT INTO users
      (role_id, email, username, email_index, email_bundle_json, username_index, username_bundle_json, password_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      role_id ?? null,
      email,               
      username ?? null,
      email_index,
      email_bundle_json,
      username_index,
      username_bundle_json,
      password_hash,
    ]
  );

  return { ok: true, user_id: r.insertId };
}

// Start Login
export async function startLogin({ email, password }) {
  if (!email || !password) throw new Error("email and password are required");

  const idx = makeLookupKey(email);
  const [rows] = await db.execute(
    `SELECT user_id, role_id, email_bundle_json, password_hash
       FROM users
      WHERE email_index = ?
      LIMIT 1`,
    [idx]
  );
  const user = rows[0];
  if (!user) return { ok: false, message: "Invalid email or password" };

  const passOK = await checkPassword(password, user.password_hash);
  if (!passOK) return { ok: false, message: "Invalid email or password" };

  const decryptedEmail = user.email_bundle_json
    ? decryptText(loadBundle(user.email_bundle_json))
    : null;
  if (!decryptedEmail) return { ok: false, message: "Could not resolve email for MFA" };

  const sent = await startMfa(user.user_id, decryptedEmail);
  if (!sent.ok) return { ok: false, message: "Failed to send MFA code" };

  return {
    ok: true,
    require_mfa: true,
    sent_to: sent.to,  // masked email for UI
    user: { id: user.user_id, role_id: user.role_id }, // for session.mfaPendingUser
  };
}

// Verify Login Code
export async function verifyLoginCode({ user_id, code }) {
  if (!user_id || !code) throw new Error("user_id and code are required");
  const out = verifyMfa(user_id, code);
  if (!out.ok) return { ok: false, message: out.message || "MFA failed" };
  return { ok: true };
}

// Get Profile
export async function getMyProfile(user_id) {
  const [rows] = await db.execute(
    `SELECT user_id, role_id, email_bundle_json, username_bundle_json
       FROM users
      WHERE user_id = ?
      LIMIT 1`,
    [user_id]
  );
  const u = rows[0];
  if (!u) return null;

  const email = u.email_bundle_json ? decryptText(loadBundle(u.email_bundle_json)) : null;
  const username = u.username_bundle_json ? decryptText(loadBundle(u.username_bundle_json)) : null;

  return { id: u.user_id, role_id: u.role_id, email, username };
}

// SignOut
export function signOut() {
  return { ok: true };
}
