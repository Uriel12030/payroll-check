import { describe, it, expect } from 'vitest'
import { cn, formatDate, formatCurrency } from '@/lib/utils'

describe('cn (class name merge)', () => {
  it('merges simple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  it('deduplicates tailwind classes', () => {
    expect(cn('p-4', 'p-6')).toBe('p-6')
  })

  it('handles undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
  })
})

describe('formatDate', () => {
  it('formats a date string in he-IL format', () => {
    const result = formatDate('2024-01-15')
    expect(result).toMatch(/15/)
    expect(result).toMatch(/01/)
    expect(result).toMatch(/2024/)
  })

  it('formats a Date object', () => {
    const result = formatDate(new Date('2024-06-30'))
    expect(result).toMatch(/2024/)
  })
})

describe('formatCurrency', () => {
  it('formats amount as ILS currency', () => {
    const result = formatCurrency(5000)
    // Should contain the number and ILS symbol (₪)
    expect(result).toMatch(/5,000|5.000/)
    expect(result).toMatch(/₪/)
  })

  it('handles zero', () => {
    const result = formatCurrency(0)
    expect(result).toMatch(/0/)
    expect(result).toMatch(/₪/)
  })

  it('handles decimal amounts', () => {
    const result = formatCurrency(1234.56)
    expect(result).toMatch(/₪/)
  })
})
