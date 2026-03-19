const ADMIN_FULL_PASSWORD =
  process.env.ADMIN_FULL_PASSWORD || "SHRIDAR123";
const ADMIN_LIMITED_PASSWORD = process.env.ADMIN_LIMITED_PASSWORD || "SHRIDAR";
const AUTH_HEADER_NAME = "x-auth-token";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function resolveAdminMode(password) {
  if (password === ADMIN_FULL_PASSWORD) {
    return "admin-full";
  }

  if (password === ADMIN_LIMITED_PASSWORD) {
    return "admin-limited";
  }

  return null;
}

module.exports = {
  ADMIN_FULL_PASSWORD,
  ADMIN_LIMITED_PASSWORD,
  AUTH_HEADER_NAME,
  SESSION_TTL_MS,
  resolveAdminMode,
};
