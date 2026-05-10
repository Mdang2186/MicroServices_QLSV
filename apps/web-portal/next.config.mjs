import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiGatewayPort = process.env.API_GATEWAY_PORT || "3000";
const apiGatewayUrl =
  process.env.API_GATEWAY_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  `http://localhost:${apiGatewayPort}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    outputFileTracingRoot: path.join(__dirname, "../../"),
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiGatewayUrl}/api/:path*`,
      },
    ]
  }
};
export default nextConfig;
