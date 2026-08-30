const createNextIntlPlugin = require("next-intl/plugin");
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import("next").NextConfig} */
// DESPANEL-V2 — dessystems.io standalone config.
// standalone output keeps this app fully isolated from the shared .next dir.
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  allowedDevOrigins: ["bop-dev.dessystems.io"],
  async rewrites() {
    return [
      { source: "/solutions/demos/vehicles", destination: "/solutions/demos/vehicles/index.html" },
      { source: "/solutions/demos/vehicles/mockup1", destination: "/solutions/demos/vehicles/mockup1/index.html" },
      { source: "/solutions/demos/vehicles/mockup1/vehicle", destination: "/solutions/demos/vehicles/mockup1/vehicle.html" },
      { source: "/solutions/demos/vehicles/mockup2", destination: "/solutions/demos/vehicles/mockup2/index.html" },
      { source: "/solutions/demos/vehicles/mockup2/vehicle", destination: "/solutions/demos/vehicles/mockup2/vehicle.html" },
      { source: "/solutions/demos/vehicles/mockup3", destination: "/solutions/demos/vehicles/mockup3/index.html" },
      { source: "/solutions/demos/vehicles/mockup4", destination: "/solutions/demos/vehicles/mockup4/index.html" },
    ];
  },
};
module.exports = withNextIntl(nextConfig);
