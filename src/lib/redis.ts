/**
 * Upstash Redis client (replaces deprecated Vercel KV).
 *
 * Requires env vars: KV_REST_API_URL, KV_REST_API_TOKEN
 * (automatically set when you add an Upstash Redis integration in Vercel,
 *  or set manually for local dev.)
 */

import { Redis } from '@upstash/redis'

let _redis: Redis | null = null

export function getRedis(): Redis | null {
  if (_redis) return _redis

  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN

  if (!url || !token) {
    console.warn('[redis] KV_REST_API_URL / KV_REST_API_TOKEN not set — analytics disabled')
    return null
  }

  _redis = new Redis({ url, token })
  return _redis
}
