import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

/**
 * Service role client for operations requiring elevated privileges.
 * Use for webhooks, cron jobs, and other server-side operations
 * that bypass RLS policies.
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for service role operations"
    )
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
