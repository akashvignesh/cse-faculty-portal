/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // knex dynamically requires every SQL dialect driver; keep it (and the
    // mysql2 driver we actually use) out of the webpack bundle.
    serverComponentsExternalPackages: ["knex", "mysql2"],
  },
};

export default nextConfig;
