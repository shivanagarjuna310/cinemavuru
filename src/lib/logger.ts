// src/lib/logger.ts
// Central logging utility for CinemaVuru.
// Use this in any component to log events, errors, and debug info.
//
// Usage examples:
//   import { logger } from '@/lib/logger'
//
//   // Log an error
//   await logger.error('FilmActions', 'handleLike', 'Like failed', error, { filmId })
//
//   // Log info
//   await logger.info('UploadForm', 'handleSubmit', 'Film submitted', { title })
//
//   // Log a warning
//   await logger.warn('AdminPage', 'updateStatus', 'Slow update detected', { duration })

import { supabase } from '@/lib/supabase'

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical'

interface LogEntry {
  level:         LogLevel
  source:        string           // component name e.g. 'FilmActions'
  function_name?: string          // function name e.g. 'handleLike'
  message:       string
  error_code?:   string
  error_detail?: string
  user_id?:      string
  film_id?:      string
  request_data?: Record<string, unknown>
  response_data?: Record<string, unknown>
  duration_ms?:  number
}

// Main log function
async function log(entry: LogEntry): Promise<void> {
  try {
    // Always print to browser console too (useful for dev)
    const consoleMethod = {
      debug:    console.debug,
      info:     console.info,
      warn:     console.warn,
      error:    console.error,
      critical: console.error,
    }[entry.level]

    consoleMethod(
      `[CinemaVuru:${entry.source}] ${entry.function_name ?? ''} — ${entry.message}`,
      entry.request_data ?? ''
    )

    // Send to Supabase error_logs table
    const { error } = await supabase.from('error_logs').insert({
      level:         entry.level,
      source:        entry.source,
      function_name: entry.function_name ?? null,
      message:       entry.message,
      error_code:    entry.error_code ?? null,
      error_detail:  entry.error_detail ?? null,
      user_id:       entry.user_id ?? null,
      film_id:       entry.film_id ?? null,
      request_data:  entry.request_data ?? {},
      response_data: entry.response_data ?? {},
      duration_ms:   entry.duration_ms ?? null,
      user_agent:    typeof window !== 'undefined' ? navigator.userAgent : null,
    })

    // If logging itself fails, just console.error — don't throw
    if (error) {
      console.error('[Logger] Failed to write log:', error.message)
    }
  } catch {
    // Logging must never crash the app
  }
}

// Timed operation helper — automatically logs duration
async function timed<T>(
  source: string,
  functionName: string,
  operation: () => Promise<T>,
  requestData?: Record<string, unknown>
): Promise<T> {
  const start = Date.now()
  try {
    const result = await operation()
    const duration = Date.now() - start

    // Log slow operations (> 2 seconds) as warnings
    if (duration > 2000) {
      await log({
        level: 'warn',
        source,
        function_name: functionName,
        message: `Slow operation: ${duration}ms`,
        duration_ms: duration,
        request_data: requestData,
      })
    }

    return result
  } catch (err) {
    const duration = Date.now() - start
    const error = err as { message?: string; code?: string }

    await log({
      level: 'error',
      source,
      function_name: functionName,
      message: error.message ?? 'Unknown error',
      error_code: error.code,
      error_detail: JSON.stringify(err),
      duration_ms: duration,
      request_data: requestData,
    })

    throw err // re-throw so the component still handles it
  }
}

export const logger = {
  // Quick methods for each level
  debug: (source: string, fn: string, msg: string, data?: Record<string, unknown>) =>
    log({ level: 'debug', source, function_name: fn, message: msg, request_data: data }),

  info: (source: string, fn: string, msg: string, data?: Record<string, unknown>) =>
    log({ level: 'info', source, function_name: fn, message: msg, request_data: data }),

  warn: (source: string, fn: string, msg: string, data?: Record<string, unknown>) =>
    log({ level: 'warn', source, function_name: fn, message: msg, request_data: data }),

  error: (
    source: string,
    fn: string,
    msg: string,
    err?: { message?: string; code?: string } | null,
    data?: Record<string, unknown>
  ) =>
    log({
      level:        'error',
      source,
      function_name: fn,
      message:      msg,
      error_code:   err?.code,
      error_detail: err?.message,
      request_data: data,
    }),

  critical: (source: string, fn: string, msg: string, data?: Record<string, unknown>) =>
    log({ level: 'critical', source, function_name: fn, message: msg, request_data: data }),

  // Wrap an async operation with automatic timing + error logging
  timed,
}
