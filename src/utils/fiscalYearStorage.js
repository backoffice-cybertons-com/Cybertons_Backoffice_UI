const SESSION_KEY = "sb_fiscal_year_id";
const COOKIE_KEY = "sb_fiscal_year_id";

const readCookie = (name) => {
  if (typeof document === "undefined") return null;
  const matches = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return matches ? decodeURIComponent(matches[1]) : null;
};

const writeCookieSessionOnly = (name, value) => {
  if (typeof document === "undefined") return;
  // Session cookie: no expires/max-age => cleared when browser closes.
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
};

const deleteCookie = (name) => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
};

export const getSelectedFiscalYearId = () => {
  const raw = localStorage.getItem(SESSION_KEY) ?? readCookie(COOKIE_KEY);
  if (raw === null || raw === undefined || raw === "") return null;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export const setSelectedFiscalYearId = (id) => {
  const parsed = typeof id === "string" ? parseInt(id, 10) : id;
  if (parsed === null || parsed === undefined || Number.isNaN(parsed)) return;
  localStorage.setItem(SESSION_KEY, String(parsed));
  writeCookieSessionOnly(COOKIE_KEY, String(parsed));
};

export const clearSelectedFiscalYearId = () => {
  localStorage.removeItem(SESSION_KEY);
  deleteCookie(COOKIE_KEY);
};

