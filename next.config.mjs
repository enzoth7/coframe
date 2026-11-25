/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Uso interno: la raíz abre el panel de sponsors. La landing vieja queda en el código pero sin entrada.
  async redirects() {
    return [{ source: "/", destination: "/lab", permanent: false }];
  },
  outputFileTracingIncludes: {
    // Todas las rutas (incluida /api/brands/[id]/logo) necesitan la base y las fichas de sponsors.
    "/**": ["./data/coframe.sqlite", "./data/sponsors/*.json"],
  },
};

export default nextConfig;
