export const ROLES = {
  ADMIN: "admin",
  RESEARCHER: "researcher",
  PUBLIC: "public",
};

// Permissions (string constants for clarity)
export const PERMISSIONS = {
  // table views
  VIEW_ROLES: "tables:roles:view",
  VIEW_USERS: "tables:users:view",
  VIEW_SPECIES_FULL: "tables:species:view_full",
  VIEW_SPECIES_PUBLIC: "tables:species:view_public",
  VIEW_SENSOR_DEVICES: "tables:sensor_devices:view",
  VIEW_SENSOR_READINGS: "tables:sensor_readings:view",
  VIEW_PLANT_OBSERVATIONS_FULL: "tables:plant_observations:view_full",
  VIEW_PLANT_OBSERVATIONS_PUBLIC: "tables:plant_observations:view_public",
  VIEW_AI_RESULTS: "tables:ai_results:view",
  VIEW_ALERTS: "tables:alerts:view",
  // admin actions
  ASSIGN_ROLES: "roles:assign",
};

// Final policy (each permission defined once)
const POLICY = {
  // Admin: everything, Researcher: Plant Data
  [PERMISSIONS.VIEW_ROLES]: [ROLES.ADMIN],
  [PERMISSIONS.VIEW_USERS]: [ROLES.ADMIN],
  [PERMISSIONS.VIEW_SPECIES_FULL]: [ROLES.ADMIN, ROLES.RESEARCHER],
  [PERMISSIONS.VIEW_SENSOR_DEVICES]: [ROLES.ADMIN, ROLES.RESEARCHER],
  [PERMISSIONS.VIEW_SENSOR_READINGS]: [ROLES.ADMIN, ROLES.RESEARCHER],
  [PERMISSIONS.VIEW_PLANT_OBSERVATIONS_FULL]: [ROLES.ADMIN, ROLES.RESEARCHER],
  [PERMISSIONS.VIEW_AI_RESULTS]: [ROLES.ADMIN, ROLES.RESEARCHER],
  [PERMISSIONS.VIEW_ALERTS]: [ROLES.ADMIN, ROLES.RESEARCHER],
  [PERMISSIONS.ASSIGN_ROLES]: [ROLES.ADMIN],

  // Public (everyone): only public/non-sensitive views
  [PERMISSIONS.VIEW_SPECIES_PUBLIC]: [ROLES.ADMIN, ROLES.RESEARCHER, ROLES.PUBLIC],
  [PERMISSIONS.VIEW_PLANT_OBSERVATIONS_PUBLIC]: [ROLES.ADMIN, ROLES.RESEARCHER, ROLES.PUBLIC],
};

// Normalize external text to a canonical role
function normalizeRole(value) {
  if (!value) return ROLES.PUBLIC;
  const r = String(value).toLowerCase().trim();
  if (r === "user") return ROLES.PUBLIC; // alias
  if (r === ROLES.ADMIN) return ROLES.ADMIN;
  if (r === ROLES.RESEARCHER) return ROLES.RESEARCHER;
  if (r === ROLES.PUBLIC) return ROLES.PUBLIC;
  return ROLES.PUBLIC;
}

// Attach role to req. Prefer req.user.role set by auth middleware.
export function attachRole(req, _res, next) {
  const fromAuth = req.user?.role || req.user?.role_name; // preferred
  const fromHeader = req.headers["x-user-role"];
  const fromQuery = req.query?.role;
  const fromBody = req.body?.role;
  req.role = normalizeRole(fromAuth || fromHeader || fromQuery || fromBody);
  next();
}

// Boolean check
export function hasPermission(role, permission) {
  const allowed = POLICY[permission] || [];
  return allowed.includes(role);
}

// Require a specific permission
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!hasPermission(req.role, permission)) {
      return res.status(403).json({ message: "Forbidden: permission denied" });
    }
    next();
  };
}

// Table view helper: scope = "public" | "full"
export function requireTableView(tableName, scope = "public") {
  const t = String(tableName).toLowerCase().trim();
  const s = String(scope).toLowerCase().trim();

  let perm = null;
  if (t === "roles" && s === "full") perm = PERMISSIONS.VIEW_ROLES;
  if (t === "users" && s === "full") perm = PERMISSIONS.VIEW_USERS;
  if (t === "species" && s === "full") perm = PERMISSIONS.VIEW_SPECIES_FULL;
  if (t === "species" && s === "public") perm = PERMISSIONS.VIEW_SPECIES_PUBLIC;
  if (t === "sensor_devices" && s === "full") perm = PERMISSIONS.VIEW_SENSOR_DEVICES;
  if (t === "sensor_readings" && s === "full") perm = PERMISSIONS.VIEW_SENSOR_READINGS;
  if (t === "plant_observations" && s === "full") perm = PERMISSIONS.VIEW_PLANT_OBSERVATIONS_FULL;
  if (t === "plant_observations" && s === "public") perm = PERMISSIONS.VIEW_PLANT_OBSERVATIONS_PUBLIC;
  if (t === "ai_results" && s === "full") perm = PERMISSIONS.VIEW_AI_RESULTS;
  if (t === "alerts" && s === "full") perm = PERMISSIONS.VIEW_ALERTS;

  return requirePermission(perm);
}

// Only admins can assign/change roles
export function requireRoleAssignment(req, res, next) {
  if (!hasPermission(req.role, PERMISSIONS.ASSIGN_ROLES)) {
    return res.status(403).json({ message: "Only admin can assign or change roles." });
  }
  next();
}

// Convenience guards for decrypting endpoints
export function requireDecryptRole(req, res, next) {
  // Only admin and researcher can view decrypted payloads
  if ([ROLES.ADMIN, ROLES.RESEARCHER].includes(req.role)) return next();
  return res.status(403).json({ message: "Forbidden: no decrypt permission" });
}
