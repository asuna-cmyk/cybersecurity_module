import * as adminService from "../services/admin_service.js";

export async function getAllUsers(req, res) {
  try {
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 20);
    const search = String(req.query.search || "").trim();

    const data = await adminService.listUsers({ page, pageSize, search });
    res.json({ ok: true, ...data });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message || "Failed to get users" });
  }
}

export async function assignUserRole(req, res) {
  try {
    const targetUserId = Number(req.params.id || req.body.userId);
    const newRoleName = req.body.role; // "admin" | "researcher" | "user"
    const actorUserId = req.session?.user?.user_id || req.user?.id || null;

    const result = await adminService.assignUserRole({ targetUserId, newRoleName, actorUserId });
    if (!result.ok) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message || "Failed to assign role" });
  }
}
