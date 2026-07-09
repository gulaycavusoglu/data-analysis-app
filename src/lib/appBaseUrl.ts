const PRODUCTION_APP_URL = "https://data-analysis-amber.vercel.app";
const LOCAL_APP_URL = "http://localhost:3000";

/** Auth0 callback/logout base URL: localhost in dev, Vercel URL in production. */
export function getAppBaseUrl(): string {
  const explicit = process.env.APP_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  if (process.env.VERCEL_ENV === "production") {
    return PRODUCTION_APP_URL;
  }

  return LOCAL_APP_URL;
}
