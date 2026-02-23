import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Lead, LeadFile } from '@/types'
import { LeadDetailClient } from '@/components/admin/LeadDetailClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return { title: `פנייה ${params.id.slice(0, 8).toUpperCase()} – Admin` }
}


export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { tab?: string }
}) {
  const supabase = createClient()
  const serviceClient = createServiceClient()

  // Fetch lead and files in parallel
  const [leadResult, filesResult] = await Promise.all([
    supabase
      .from('leads')
      .select('*')
      .eq('id', params.id)
      .single(),
    supabase
      .from('files')
      .select('*')
      .eq('lead_id', params.id)
      .order('created_at', { ascending: true }),
  ])

  const { data: lead, error } = leadResult
  if (error || !lead) notFound()

  const files = (filesResult.data ?? []) as LeadFile[]

  // Generate signed URLs for files in parallel
  const filesWithUrls = await Promise.all(
    files.map(async (file) => {
      const { data } = await serviceClient.storage
        .from('lead-files')
        .createSignedUrl(file.storage_path, 3600)
      return { ...file, signedUrl: data?.signedUrl ?? null }
    })
  )

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/leads" className="text-gray-400 hover:text-gray-600 text-sm">
          → חזור לרשימה
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{lead.full_name}</h1>
        <span className="text-sm text-gray-400 font-mono">
          #{params.id.slice(0, 8).toUpperCase()}
        </span>
      </div>

      <LeadDetailClient
        lead={lead as Lead}
        files={filesWithUrls}
        initialTab={searchParams.tab === 'emails' ? 'emails' : 'details'}
      />
    </div>
  )
}
