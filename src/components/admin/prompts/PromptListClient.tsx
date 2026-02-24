'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { FileText, Globe, Languages, Tag } from 'lucide-react'
import type { PromptTemplate, PromptCategory } from '@/types'

interface PromptListClientProps {
  templates: PromptTemplate[]
}

const CATEGORY_LABELS: Record<PromptCategory, string> = {
  system: 'מערכת',
  user: 'משתמש',
  tone_instruction: 'טון',
}

const CATEGORY_COLORS: Record<PromptCategory, string> = {
  system: 'bg-purple-100 text-purple-700',
  user: 'bg-blue-100 text-blue-700',
  tone_instruction: 'bg-amber-100 text-amber-700',
}

const LANGUAGE_LABELS: Record<string, string> = {
  he: 'עברית',
  en: 'English',
  ru: 'Русский',
}

type FilterCategory = 'all' | PromptCategory

export function PromptListClient({ templates }: PromptListClientProps) {
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Group templates by slug: only show the active version per slug
  const activeTemplates = useMemo(() => {
    const slugMap = new Map<string, PromptTemplate>()
    for (const t of templates) {
      if (t.is_active && !slugMap.has(t.slug)) {
        slugMap.set(t.slug, t)
      }
    }
    return Array.from(slugMap.values())
  }, [templates])

  // Count all versions per slug
  const versionCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const t of templates) {
      counts.set(t.slug, (counts.get(t.slug) ?? 0) + 1)
    }
    return counts
  }, [templates])

  // Available languages per slug
  const languagesPerSlug = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const t of templates) {
      if (!map.has(t.slug)) map.set(t.slug, new Set())
      map.get(t.slug)!.add(t.language)
    }
    return map
  }, [templates])

  const filtered = useMemo(() => {
    return activeTemplates.filter((t) => {
      if (filterCategory !== 'all' && t.category !== filterCategory) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          t.title.toLowerCase().includes(q) ||
          t.slug.toLowerCase().includes(q) ||
          (t.description ?? '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [activeTemplates, filterCategory, searchQuery])

  const categories: { key: FilterCategory; label: string }[] = [
    { key: 'all', label: 'הכל' },
    { key: 'system', label: 'מערכת' },
    { key: 'user', label: 'משתמש' },
    { key: 'tone_instruction', label: 'טון' },
  ]

  return (
    <div className="py-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ניהול פרומפטים</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeTemplates.length} תבניות פעילות
            {' · '}
            {templates.length} גרסאות בסה&quot;כ
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Category tabs */}
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setFilterCategory(cat.key)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filterCategory === cat.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="חיפוש..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="form-input flex-1 max-w-sm text-sm"
        />
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((template) => {
          const langs = languagesPerSlug.get(template.slug)
          const versCount = versionCounts.get(template.slug) ?? 1

          return (
            <Link
              key={template.id}
              href={`/admin/prompts/${template.slug}?scope=${template.scope}&language=${template.language}`}
              className="card hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {template.title}
                  </h3>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    CATEGORY_COLORS[template.category as PromptCategory]
                  }`}
                >
                  {CATEGORY_LABELS[template.category as PromptCategory]}
                </span>
              </div>

              {template.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                  {template.description}
                </p>
              )}

              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {template.slug}
                </span>
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  {template.scope === 'global' ? 'גלובלי' : template.scope}
                </span>
                {langs && langs.size > 0 && (
                  <span className="flex items-center gap-1">
                    <Languages className="w-3 h-3" />
                    {Array.from(langs).map((l) => LANGUAGE_LABELS[l] ?? l).join(', ')}
                  </span>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                <span>
                  גרסה {template.version}
                  {versCount > 1 && ` (${versCount} גרסאות)`}
                </span>
                <span>
                  {template.variables.length > 0
                    ? `${template.variables.length} משתנים`
                    : 'ללא משתנים'}
                </span>
              </div>
            </Link>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">לא נמצאו פרומפטים</p>
          {searchQuery && (
            <p className="text-sm mt-1">נסה לחפש משהו אחר</p>
          )}
        </div>
      )}
    </div>
  )
}
