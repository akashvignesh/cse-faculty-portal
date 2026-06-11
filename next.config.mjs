/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // knex dynamically requires every SQL dialect driver; keep it (and the
  // mysql2 driver we actually use) out of the webpack bundle.
  serverExternalPackages: ["knex", "mysql2"],
};

export default nextConfig;
