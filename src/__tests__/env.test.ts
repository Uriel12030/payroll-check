import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getRequiredEnv, getAdminAllowlist } from '@/lib/env'

describe('getRequiredEnv', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns env value when set', () => {
    process.env.TEST_VAR = 'hello'
    expect(getRequiredEnv('TEST_VAR')).toBe('hello')
  })

  it('throws when env var is missing', () => {
    delete process.env.MISSING_VAR
    expect(() => getRequiredEnv('MISSING_VAR')).toThrow('Missing required environment variable')
  })

  it('throws when env var is empty string', () => {
    process.env.EMPTY_VAR = ''
    expect(() => getRequiredEnv('EMPTY_VAR')).toThrow('Missing required environment variable')
  })
})

describe('getAdminAllowlist', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns empty array when env var is not set', () => {
    delete process.env.ADMIN_ALLOWLIST_EMAILS
    expect(getAdminAllowlist()).toEqual([])
  })

  it('returns empty array when env var is empty', () => {
    process.env.ADMIN_ALLOWLIST_EMAILS = ''
    expect(getAdminAllowlist()).toEqual([])
  })

  it('parses comma-separated emails', () => {
    process.env.ADMIN_ALLOWLIST_EMAILS = 'admin@test.com,user@test.com'
    expect(getAdminAllowlist()).toEqual(['admin@test.com', 'user@test.com'])
  })

  it('trims whitespace and lowercases', () => {
    process.env.ADMIN_ALLOWLIST_EMAILS = ' Admin@Test.com , USER@TEST.COM '
    expect(getAdminAllowlist()).toEqual(['admin@test.com', 'user@test.com'])
  })

  it('filters out empty entries', () => {
    process.env.ADMIN_ALLOWLIST_EMAILS = 'admin@test.com,,user@test.com,'
    expect(getAdminAllowlist()).toEqual(['admin@test.com', 'user@test.com'])
  })
})
