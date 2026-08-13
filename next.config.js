const createNextIntlPlugin = require("next-intl/plugin");
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import("next").NextConfig} */
// DESPANEL-V2 — dessystems.io standalone config.
// standalone output keeps this app fully isolated from the shared .next dir.
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  allowedDevOrigins: ["bop-dev.dessystems.io"],
};
module.exports = withNextIntl(nextConfig);
