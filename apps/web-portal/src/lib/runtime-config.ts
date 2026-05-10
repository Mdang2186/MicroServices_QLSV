const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const apiGatewayPort = process.env.NEXT_PUBLIC_API_GATEWAY_PORT || "3000";
const webAdminPort = process.env.NEXT_PUBLIC_WEB_ADMIN_PORT || "4005";

export const apiUrl = trimTrailingSlash(
  process.env.NEXT_PUBLIC_API_URL || "",
);

export const socketUrl = trimTrailingSlash(
  process.env.NEXT_PUBLIC_API_URL || `http://localhost:${apiGatewayPort}`,
);

export const webAdminUrl = trimTrailingSlash(
  process.env.NEXT_PUBLIC_WEB_ADMIN_URL || `http://localhost:${webAdminPort}`,
);
