import {
  createAccount,
  startLogin,
  verifyLoginCode,
  getMyProfile,
  signOut,
} from "./service/auth_service.js";

// register
export async function registerUser(req, res) {
  try {
    const result = await createAccount(req.body);
    return res.status(201).json(result);
  } catch (e) {
    return res.status(400).json({ ok: false, message: e?.message || "Registration failed" });
  }
}

// login
export async function loginUser(req, res) {
  try {
    const result = await startLogin(req.body);
    if (!result.ok) return res.status(401).json(result);

    // store partial login state (waiting for MFA)
    req.session.mfaPendingUser = result.user; // { id, role_id }

    return res.json({
      ok: true,
      mfa_required: true,
      code_sent_to: result.sent_to, // masked email
    });
  } catch (e) {
    return res.status(400).json({ ok: false, message: e?.message || "Login failed" });
  }
}

// verify-mfa
export async function verifyLogin(req, res) {
  try {
    const pending = req.session.mfaPendingUser;
    if (!pending?.id) {
      return res.status(401).json({ ok: false, message: "No login in progress" });
    }

    const result = await verifyLoginCode({
      user_id: pending.id,
      code: req.body.code,
    });

    if (!result.ok) return res.status(401).json(result);

    // MFA success → user officially logged in
    req.session.user = { id: pending.id, role_id: pending.role_id };
    req.session.mfaVerified = true;
    delete req.session.mfaPendingUser;

    return res.json({ ok: true, logged_in: true });
  } catch (e) {
    return res.status(400).json({ ok: false, message: e?.message || "MFA verification failed" });
  }
}

// GET profile
export async function getProfile(req, res) {
  try {
    if (!req.session?.user?.id) {
      return res.status(401).json({ ok: false, message: "Not logged in" });
    }

    const profile = await getMyProfile(req.session.user.id);
    if (!profile) return res.status(404).json({ ok: false, message: "User not found" });

    return res.json({ ok: true, user: profile });
  } catch (e) {
    return res.status(400).json({ ok: false, message: e?.message || "Could not load profile" });
  }
}

// POST logout
export async function logoutUser(req, res) {
  try {
    const result = signOut();
    req.session.destroy(() => {});
    return res.json(result);
  } catch (e) {
    return res.status(400).json({ ok: false, message: e?.message || "Logout failed" });
  }
}
