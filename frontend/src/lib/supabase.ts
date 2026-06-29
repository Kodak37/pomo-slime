import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export async function initSupabase(): Promise<SupabaseClient> {
  if (_client) return _client
  const config = await fetch('/api/config').then(r => r.json())
  _client = createClient(config.supabaseUrl, config.supabaseKey)
  return _client
}

export function getSupabase(): SupabaseClient {
  if (!_client) throw new Error('Supabase not initialized')
  return _client
}
