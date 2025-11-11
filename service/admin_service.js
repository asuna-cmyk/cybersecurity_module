import db from "../config/db.js";
import { loadBundle, decryptText } from "../modules/encryption_module.js";

export async function listUsers({ page = 1, pageSize = 20, search = "" } = {}) {
  const limit = Math.max(1, Math.min(100, Number(pageSize)));
  const offset = Math.max(0, (Number(page) - 1) * limit);

  // Optional simple search: match on role or do LIKE on decrypted fields later (kept simple for now).
  // If you want indexed search by email/username, send a lookup key and filter by *_index instead.
  const [rows] = await db.query(
    `
    SELECT u.user_id, u.role_id, u.email_bundle_json, u.username_bundle_json, r.role_name
    FROM users u
    LEFT JOIN roles r ON r.role_id = u.role_id
    ORDER BY u.user_id DESC
    LIMIT ? OFFSET ?
    `,
    [limit, offset]
  );

  // Decrypt username/email for admin viewing
  const users = rows.map((u) => {
    const email = u.email_bundle_json ? decryptText(loadBundle(u.email_bundle_json)) : null;
    const username = u.username_bundle_json ? decryptText(loadBundle(u.username_bundle_json)) : null;
    return {
      user_id: u.user_id,
      role_id: u.role_id,
      role_name: u.role_name,
      email,
      username
    };
  });

  // Get total count for pagination UI
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM users`);
  return { total, page, pageSize: limit, users };
}

/**
 * This function is to resolve a role_id from a role name; after that it returns null if not found.
 */
async function resolveRoleIdByName(roleName) {
  const name = String(roleName || "").toLowerCase().trim();
  const [rows] = await db.query(
    `SELECT role_id FROM roles WHERE LOWER(role_name) = ? LIMIT 1`,
    [name]
  );
  return rows.length ? rows[0].role_id : null;
}

export async function assignUserRole({ targetUserId, newRoleName, actorUserId }) {
  if (!targetUserId || !newRoleName) {
    return { ok: false, message: "userId and role are required" };
  }

  const roleId = await resolveRoleIdByName(newRoleName);
  if (!roleId) return { ok: false, message: "Invalid role name" };

  // Optional: prevent an admin from changing their own role (safety)
  if (actorUserId && Number(actorUserId) === Number(targetUserId)) {
    return { ok: false, message: "You cannot change your own role" };
  }

  await db.query(`UPDATE users SET role_id = ? WHERE user_id = ?`, [roleId, targetUserId]);

  // Return fresh info for UI
  const [[user]] = await db.query(
    `SELECT u.user_id, u.role_id, r.role_name
     FROM users u LEFT JOIN roles r ON r.role_id = u.role_id
     WHERE u.user_id = ?`,
    [targetUserId]
  );

  return { ok: true, user };
}
