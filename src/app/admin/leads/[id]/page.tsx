import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Lead, LeadFile } from '@/types'
import { LeadDetailClient } from '@/components/admin/LeadDetailClient'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return { title: `פנייה ${params.id.slice(0, 8).toUpperCase()} – Admin` }
}


export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const serviceClient = createServiceClient()

  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !lead) notFound()

  const { data: files = [] } = await supabase
    .from('files')
    .select('*')
    .eq('lead_id', params.id)
    .order('created_at', { ascending: true })

  // Generate signed URLs for files
  const filesWithUrls = await Promise.all(
    (files as LeadFile[]).map(async (file) => {
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
      />
    </div>
  )
}
