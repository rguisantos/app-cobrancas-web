// GET /api/health — Compatível com mobile (ApiService.healthCheck)
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      database: 'connected',
    })
  } catch {
    return NextResponse.json({ ok: false, timestamp: new Date().toISOString() }, { status: 503 })
  }
}
