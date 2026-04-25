// lib/logger.ts — Logger com gate por NODE_ENV
// Substitui console.log direto para evitar logs verbosos em produção

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

function getMinLevel(): LogLevel {
  if (process.env.NODE_ENV === 'production') return 'warn'
  if (process.env.LOG_LEVEL) return process.env.LOG_LEVEL as LogLevel
  return 'debug'
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[getMinLevel()]
}

function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString()
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`
}

export const logger = {
  debug(message: string, ...args: any[]) {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', message), ...args)
    }
  },

  info(message: string, ...args: any[]) {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message), ...args)
    }
  },

  warn(message: string, ...args: any[]) {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message), ...args)
    }
  },

  error(message: string, ...args: any[]) {
    // Errors sempre logam
    console.error(formatMessage('error', message), ...args)
  },
}
