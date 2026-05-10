const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const apiGatewayPort = process.env.NEXT_PUBLIC_API_GATEWAY_PORT || "3000";
const webPortalPort = process.env.NEXT_PUBLIC_WEB_PORTAL_PORT || "4000";

export const socketUrl = trimTrailingSlash(
  process.env.NEXT_PUBLIC_API_URL || `http://localhost:${apiGatewayPort}`,
);

export const webPortalUrl = trimTrailingSlash(
  process.env.NEXT_PUBLIC_WEB_PORTAL_URL || `http://localhost:${webPortalPort}`,
);
