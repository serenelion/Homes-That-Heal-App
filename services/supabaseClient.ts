import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Device } from './device';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);
const deviceId = Device.getId();

let supabase: SupabaseClient | null = null;
if (isConfigured && supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        'x-device-id': deviceId
      }
    }
  });
}

const functionsBase =
  (import.meta.env.VITE_SUPABASE_FUNCTIONS_BASE_URL as string | undefined) ??
  (supabaseUrl ? `${supabaseUrl}/functions/v1` : undefined);

export const Supabase = {
  client: supabase,
  isConfigured,
  deviceId,
  functionsBase
};
