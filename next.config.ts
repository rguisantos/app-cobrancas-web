import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  eslint: {
    // false = ESLint roda durante `next build` e falha o build se houver erros
    // Garante que problemas de qualidade não cheguem em produção silenciosamente
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default nextConfig
