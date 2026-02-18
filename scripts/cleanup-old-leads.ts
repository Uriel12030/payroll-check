/**
 * Cleanup script: removes leads and their storage files older than 60 days.
 * Run via: npx ts-node scripts/cleanup-old-leads.ts
 * Or schedule as a cron job.
 *
 * Requires environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'

const RETENTION_DAYS = 60

async function cleanup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS)
  const cutoffISO = cutoffDate.toISOString()

  console.log(`Cleaning up leads older than ${RETENTION_DAYS} days (before ${cutoffISO})`)

  // Get leads to delete
  const { data: oldLeads, error: fetchError } = await supabase
    .from('leads')
    .select('id')
    .lt('created_at', cutoffISO)

  if (fetchError) {
    console.error('Error fetching old leads:', fetchError)
    process.exit(1)
  }

  if (!oldLeads || oldLeads.length === 0) {
    console.log('No leads to clean up.')
    return
  }

  console.log(`Found ${oldLeads.length} leads to delete.`)
  const leadIds = oldLeads.map((l) => l.id)

  // Get file paths for storage cleanup
  const { data: oldFiles } = await supabase
    .from('files')
    .select('storage_path')
    .in('lead_id', leadIds)

  // Delete storage files
  if (oldFiles && oldFiles.length > 0) {
    const paths = oldFiles.map((f) => f.storage_path)
    console.log(`Deleting ${paths.length} files from storage...`)

    // Delete in batches of 100
    for (let i = 0; i < paths.length; i += 100) {
      const batch = paths.slice(i, i + 100)
      const { error: storageError } = await supabase.storage
        .from('lead-files')
        .remove(batch)
      if (storageError) {
        console.warn(`Storage delete error (batch ${i}):`, storageError.message)
      }
    }
  }

  // Delete leads (files cascade via FK)
  const { error: deleteError, count } = await supabase
    .from('leads')
    .delete({ count: 'exact' })
    .lt('created_at', cutoffISO)

  if (deleteError) {
    console.error('Error deleting leads:', deleteError)
    process.exit(1)
  }

  console.log(`Deleted ${count} leads and their associated file records.`)
  console.log('Cleanup complete.')
}

cleanup().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
