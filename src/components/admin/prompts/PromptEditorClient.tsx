'use client'

import { useState, useCallback, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  Save,
  RotateCcw,
  Eye,
  History,
  Globe,
  Languages,
  Check,
  AlertCircle,
  Plus,
} from 'lucide-react'
import type { PromptTemplate, PromptVariable, PromptCategory } from '@/types'
import { VersionHistory } from './VersionHistory'
import { PromptPreview } from './PromptPreview'

interface PromptEditorClientProps {
  activeTemplate: PromptTemplate | null
  allVersions: PromptTemplate[]
  availableScopes: string[]
  availableLanguages: string[]
  currentScope: string
  currentLanguage: string
  slug: string
}

const LANGUAGE_LABELS: Record<string, string> = {
  he: 'עברית',
  en: 'English',
  ru: 'Русский',
  am: 'አማርኛ',
}

const SCOPE_LABELS: Record<string, string> = {
  global: 'גלובלי',
  overtime: 'שעות נוספות',
  wage_withholding: 'עיכוב שכר',
  pension: 'פנסיה',
  severance: 'פיצויי פיטורים',
  vacation_sick: 'חופשה וימי מחלה',
  wrongful_termination: 'פיטורים שלא כדין',
  deterioration: 'הרעת תנאים',
}

export function PromptEditorClient({
  activeTemplate,
  allVersions,
  availableScopes,
  availableLanguages,
  currentScope,
  currentLanguage,
  slug,
}: PromptEditorClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Editor state
  const [content, setContent] = useState(activeTemplate?.content ?? '')
  const [title, setTitle] = useState(activeTemplate?.title ?? '')
  const [description, setDescription] = useState(activeTemplate?.description ?? '')
  const [variables, setVariables] = useState<PromptVariable[]>(
    activeTemplate?.variables ?? []
  )
  // Track the category from the source template (needed for saving new scope versions)
  const [category, setCategory] = useState<PromptCategory>(
    activeTemplate?.category ?? 'system'
  )

  // UI state
  const [showPreview, setShowPreview] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [isCreatingNew, setIsCreatingNew] = useState(false)

  const isDirty = isCreatingNew || (
    content !== (activeTemplate?.content ?? '') ||
    title !== (activeTemplate?.title ?? '') ||
    description !== (activeTemplate?.description ?? '')
  )

  // Warn before navigating away with unsaved changes
  useEffect(() => {
    if (!isDirty) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const handleScopeChange = useCallback(
    (newScope: string) => {
      startTransition(() => {
        router.push(`/admin/prompts/${slug}?scope=${newScope}&language=${currentLanguage}`)
      })
    },
    [router, slug, currentLanguage]
  )

  const handleLanguageChange = useCallback(
    (newLang: string) => {
      startTransition(() => {
        router.push(`/admin/prompts/${slug}?scope=${currentScope}&language=${newLang}`)
      })
    },
    [router, slug, currentScope]
  )

  const handleSave = useCallback(async () => {
    if (!activeTemplate && !isCreatingNew) return
    if (!content.trim() || !title.trim()) return
    setSaveStatus('saving')
    setErrorMessage('')

    try {
      const res = await fetch('/api/admin/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          category: activeTemplate?.category ?? category,
          scope: currentScope,
          language: currentLanguage,
          title,
          description: description || null,
          content,
          variables,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save')
      }

      setSaveStatus('saved')
      setIsCreatingNew(false)
      setTimeout(() => setSaveStatus('idle'), 2000)

      // Refresh page data
      startTransition(() => {
        router.refresh()
      })
    } catch (err) {
      setSaveStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [activeTemplate, isCreatingNew, slug, category, currentScope, currentLanguage, title, description, content, variables, router])

  const handleReset = useCallback(async () => {
    if (!confirm('לאפס את הפרומפט לגרסת ברירת המחדל?')) return
    setSaveStatus('saving')

    try {
      const res = await fetch('/api/admin/prompts/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, scope: currentScope, language: currentLanguage }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to reset')
      }

      const { template } = await res.json()
      setContent(template.content)
      setTitle(template.title)
      setDescription(template.description ?? '')
      setVariables(template.variables ?? [])
      setIsCreatingNew(false)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)

      startTransition(() => {
        router.refresh()
      })
    } catch (err) {
      setSaveStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [slug, currentScope, currentLanguage, router])

  const handleActivateVersion = useCallback(
    async (versionId: string) => {
      try {
        const res = await fetch(`/api/admin/prompts/${versionId}/activate`, {
          method: 'POST',
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Failed to activate')
        }

        const { template } = await res.json()
        setContent(template.content)
        setTitle(template.title)
        setDescription(template.description ?? '')
        setVariables(template.variables ?? [])

        startTransition(() => {
          router.refresh()
        })
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error activating version')
      }
    },
    [router]
  )

  const handleCreateScopeVersion = useCallback(() => {
    // Pre-populate from global version if available
    const globalVersion = allVersions.find(
      (t) => t.scope === 'global' && t.language === currentLanguage && t.is_active
    ) ?? allVersions.find((t) => t.is_active)

    if (globalVersion) {
      setContent(globalVersion.content)
      setTitle(globalVersion.title + ` (${SCOPE_LABELS[currentScope] ?? currentScope})`)
      setDescription(globalVersion.description ?? '')
      setVariables(globalVersion.variables ?? [])
      setCategory(globalVersion.category)
    } else {
      setContent('')
      setTitle(`${slug} (${SCOPE_LABELS[currentScope] ?? currentScope})`)
      setDescription('')
      setVariables([])
    }
    setIsCreatingNew(true)
  }, [allVersions, currentLanguage, currentScope, slug])

  const showEditor = activeTemplate || isCreatingNew

  return (
    <div className="py-6" dir="rtl">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/prompts"
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{title || slug}</h1>
            <p className="text-sm text-gray-500">
              {slug}
              {isCreatingNew && (
                <span className="text-amber-600 font-medium"> · גרסה חדשה (לא נשמרה)</span>
              )}
              {activeTemplate && !isCreatingNew && (
                <>
                  {' · '}
                  גרסה {activeTemplate.version}
                  {activeTemplate.is_default && ' (ברירת מחדל)'}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save status indicator */}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Check className="w-4 h-4" /> נשמר
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" /> {errorMessage}
            </span>
          )}

          {activeTemplate && !isCreatingNew && (
            <button
              onClick={handleReset}
              disabled={saveStatus === 'saving'}
              className="btn-secondary flex items-center gap-1.5 text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              ברירת מחדל
            </button>
          )}

          {isCreatingNew && (
            <button
              onClick={() => {
                setIsCreatingNew(false)
                setContent(activeTemplate?.content ?? '')
                setTitle(activeTemplate?.title ?? '')
                setDescription(activeTemplate?.description ?? '')
                setVariables(activeTemplate?.variables ?? [])
              }}
              className="btn-secondary flex items-center gap-1.5 text-sm"
            >
              ביטול
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving' || !isDirty || !content.trim() || !title.trim()}
            className="btn-primary flex items-center gap-1.5 text-sm"
          >
            <Save className="w-4 h-4" />
            {saveStatus === 'saving' ? 'שומר...' : isCreatingNew ? 'צור גרסה' : 'שמור גרסה חדשה'}
          </button>
        </div>
      </div>

      {/* Scope + Language selectors */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Scope selector */}
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">היקף:</span>
          <div className="flex gap-1">
            {['global', ...availableScopes.filter((s) => s !== 'global')].map((s) => (
              <button
                key={s}
                onClick={() => handleScopeChange(s)}
                disabled={isPending}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  currentScope === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {SCOPE_LABELS[s] ?? s}
              </button>
            ))}
          </div>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-2">
          <Languages className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">שפה:</span>
          <div className="flex gap-1">
            {['he', 'en', 'ru', 'am'].map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                disabled={isPending}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  currentLanguage === lang
                    ? 'bg-blue-600 text-white'
                    : availableLanguages.includes(lang)
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'bg-gray-50 text-gray-300 border border-dashed border-gray-200'
                }`}
              >
                {LANGUAGE_LABELS[lang] ?? lang}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!showEditor ? (
        // No template for this scope/language yet
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">
            אין פרומפט עבור{' '}
            <strong>{SCOPE_LABELS[currentScope] ?? currentScope}</strong>
            {' '}בשפה{' '}
            <strong>{LANGUAGE_LABELS[currentLanguage] ?? currentLanguage}</strong>
          </p>
          <p className="text-sm text-gray-400 mb-4">
            המערכת תשתמש בגרסה הגלובלית כברירת מחדל.
            <br />
            ניתן ליצור גרסה ייעודית כאן.
          </p>
          <button
            onClick={handleCreateScopeVersion}
            className="btn-primary text-sm flex items-center gap-1.5 mx-auto"
          >
            <Plus className="w-4 h-4" />
            צור גרסה ייעודית
          </button>
        </div>
      ) : (
        /* Main editor layout */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Editor */}
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="form-label">כותרת</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="form-input w-full text-sm"
              />
            </div>

            {/* Description */}
            <div>
              <label className="form-label">תיאור</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="מה הפרומפט עושה..."
                className="form-input w-full text-sm"
              />
            </div>

            {/* Content editor */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0">תוכן הפרומפט</label>
                <span className="text-xs text-gray-400">
                  {content.length.toLocaleString()} תווים
                </span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={20}
                className="form-input w-full text-sm font-mono leading-relaxed resize-y"
                dir={currentLanguage === 'he' ? 'rtl' : 'ltr'}
                style={{ minHeight: '400px' }}
              />
            </div>

            {/* Variables reference */}
            {variables.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  משתנים זמינים
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {variables.map((v) => (
                    <div
                      key={v.name}
                      className="flex items-center gap-2 text-xs"
                    >
                      <code className="bg-white px-2 py-0.5 rounded border border-gray-200 text-blue-600 font-mono">
                        {'${'}
                        {v.name}
                        {'}'}
                      </code>
                      <span className="text-gray-500">{v.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Preview + History */}
          <div className="space-y-4">
            {/* Toggle buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPreview(!showPreview)
                  if (!showPreview) setShowHistory(false)
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  showPreview
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Eye className="w-4 h-4" />
                תצוגה מקדימה
              </button>
              {!isCreatingNew && (
                <button
                  onClick={() => {
                    setShowHistory(!showHistory)
                    if (!showHistory) setShowPreview(false)
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    showHistory
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <History className="w-4 h-4" />
                  היסטוריית גרסאות
                  {allVersions.length > 1 && (
                    <span className="bg-gray-200 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">
                      {allVersions.length}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Preview panel */}
            {showPreview && (
              <PromptPreview
                content={content}
                variables={variables}
                language={currentLanguage}
              />
            )}

            {/* History panel */}
            {showHistory && activeTemplate && (
              <VersionHistory
                versions={allVersions}
                activeVersionId={activeTemplate.id}
                onActivate={handleActivateVersion}
                onViewContent={(v) => {
                  setContent(v.content)
                  setTitle(v.title)
                  setDescription(v.description ?? '')
                }}
              />
            )}

            {/* If nothing selected, show a tip */}
            {!showPreview && !showHistory && (
              <div className="card bg-gray-50 border-dashed">
                <div className="text-center py-8 text-gray-400">
                  <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    לחץ &quot;תצוגה מקדימה&quot; לראות את הפרומפט עם ערכי דוגמה
                    {!isCreatingNew && (
                      <>
                        ,
                        <br />
                        או &quot;היסטוריית גרסאות&quot; לצפות בגרסאות קודמות.
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
