import { Supabase } from "./supabaseClient";

interface CallOptions {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
  query?: Record<string, string | number | undefined>;
}

export const SupabaseFunctions = {
  async call<T>(name: string, options: CallOptions = {}): Promise<T> {
    if (!Supabase.functionsBase || !Supabase.isConfigured) {
      throw new Error('Supabase functions are not configured');
    }

    const url = new URL(`${Supabase.functionsBase}/${name}`);
    if (options.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {
      'x-device-id': Supabase.deviceId
    };

    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
    if (anonKey) {
      headers['Authorization'] = `Bearer ${anonKey}`;
    }

    const response = await fetch(url.toString(), {
      method: options.method ?? (options.body ? 'POST' : 'GET'),
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Function ${name} failed: ${message}`);
    }

    return response.json() as Promise<T>;
  }
};
