import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { getAppBaseUrl } from "@/lib/appBaseUrl";

export const auth0 = new Auth0Client({
  appBaseUrl: getAppBaseUrl(),
});
