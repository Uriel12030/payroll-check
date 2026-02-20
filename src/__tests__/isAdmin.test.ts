import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { isAdmin } from '@/lib/auth/isAdmin'

describe('isAdmin', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns false for null email', () => {
    process.env.ADMIN_ALLOWLIST_EMAILS = 'admin@test.com'
    expect(isAdmin(null)).toBe(false)
  })

  it('returns false for undefined email', () => {
    process.env.ADMIN_ALLOWLIST_EMAILS = 'admin@test.com'
    expect(isAdmin(undefined)).toBe(false)
  })

  it('returns false for empty string', () => {
    process.env.ADMIN_ALLOWLIST_EMAILS = 'admin@test.com'
    expect(isAdmin('')).toBe(false)
  })

  it('returns true for listed admin email', () => {
    process.env.ADMIN_ALLOWLIST_EMAILS = 'admin@test.com,user@test.com'
    expect(isAdmin('admin@test.com')).toBe(true)
  })

  it('is case-insensitive', () => {
    process.env.ADMIN_ALLOWLIST_EMAILS = 'admin@test.com'
    expect(isAdmin('ADMIN@TEST.COM')).toBe(true)
  })

  it('returns false for unlisted email', () => {
    process.env.ADMIN_ALLOWLIST_EMAILS = 'admin@test.com'
    expect(isAdmin('hacker@evil.com')).toBe(false)
  })

  it('returns false when allowlist is empty', () => {
    process.env.ADMIN_ALLOWLIST_EMAILS = ''
    expect(isAdmin('admin@test.com')).toBe(false)
  })

  it('returns false when allowlist env var is not set', () => {
    delete process.env.ADMIN_ALLOWLIST_EMAILS
    expect(isAdmin('admin@test.com')).toBe(false)
  })
})
