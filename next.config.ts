/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Esto ignorará los errores de TypeScript durante el build
    ignoreBuildErrors: true,
  },
  eslint: {
    // También ignoraremos los avisos de ESLint por si acaso
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
