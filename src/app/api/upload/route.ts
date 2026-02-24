import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const ALLOWED_EXTS = ['pdf', 'jpg', 'jpeg', 'png']
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

// ---------------------------------------------------------------------------
// In-memory rate limiter — best-effort protection for the anonymous upload
// endpoint. Works within a single serverless instance; each warm instance
// maintains its own window, which is sufficient to block scripted abuse.
// ---------------------------------------------------------------------------
const RATE_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const RATE_MAX_UPLOADS = 10            // per IP per window

const _ratemap = new Map<string, { count: number; resetAt: number }>()

function checkUploadRateLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now()

  // Periodically evict expired entries to prevent unbounded growth
  if (_ratemap.size > 5000) {
    Array.from(_ratemap.entries()).forEach(([key, val]) => {
      if (now > val.resetAt) _ratemap.delete(key)
    })
  }

  const entry = _ratemap.get(ip)
  if (!entry || now > entry.resetAt) {
    _ratemap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return { allowed: true, retryAfterSec: 0 }
  }
  if (entry.count >= RATE_MAX_UPLOADS) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) }
  }
  entry.count++
  return { allowed: true, retryAfterSec: 0 }
}

/**
 * POST /api/upload
 *
 * Accepts a single file via multipart form-data and uploads it to the
 * `lead-files` Supabase Storage bucket using the service role key.
 *
 * Why server-side?  The anon Supabase client used in the browser requires
 * the bucket + RLS upload policy to be correctly configured in every
 * environment.  Doing the upload here with the service role key bypasses
 * RLS entirely and works reliably in any environment without extra setup.
 *
 * Security: this route is intentionally unauthenticated (intake form users
 * are anonymous), but it applies the same restrictions as the RLS policy:
 * allowed extensions, allowed MIME types, and a 10 MB size cap.
 */
export async function POST(request: NextRequest) {
  // Rate-limit by IP address
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  const rl = checkUploadRateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'יותר מדי העלאות. נסו שוב מאוחר יותר.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rl.retryAfterSec) },
      }
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart request' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTS.includes(ext)) {
    return NextResponse.json(
      { error: `סוג קובץ לא נתמך: .${ext}. יש להעלות PDF, JPG או PNG בלבד.` },
      { status: 400 }
    )
  }

  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json(
      { error: `MIME type לא נתמך: ${file.type}` },
      { status: 400 }
    )
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `הקובץ גדול מדי. גודל מקסימלי: 10MB` },
      { status: 400 }
    )
  }

  const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const supabase = createServiceClient()
  const { error } = await supabase.storage
    .from('lead-files')
    .upload(storagePath, file, { contentType: file.type })

  if (error) {
    console.error('[api/upload] Supabase storage error:', error.message, error)
    return NextResponse.json(
      { error: `שגיאת אחסון: ${error.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({
    storage_path: storagePath,
    original_filename: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    file_type: ext,
  })
}
