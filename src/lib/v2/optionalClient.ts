import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/integrations/supabase/types'
import type { V2CityConfigRow, V2FeatureFlagRow, V2PricingConfigRow } from './contracts'

// These optional reads fail closed when V2 is not installed. Keep their
// contract separate from types generated from the actual production schema.
type ReadTable<Row> = {
  Row: { [Key in keyof Row]: Row[Key] }
  Insert: never
  Update: never
  Relationships: []
}

type OptionalV2Database = {
  public: {
    Tables: {
      v2_city_configs: ReadTable<V2CityConfigRow>
      v2_feature_flags: ReadTable<V2FeatureFlagRow>
      v2_pricing_config: ReadTable<V2PricingConfigRow>
    }
    Views: Record<never, never>
    Functions: {
      v2_emit_client_event: {
        Args: {
          p_event_name: string
          p_payload: Json
          p_session_id: string | null
          p_consent_scope: string
        }
        Returns: Json
      }
    }
  }
}

export type V2Client = SupabaseClient<OptionalV2Database>

export function asV2Client(client: SupabaseClient<Database>): V2Client {
  return client as unknown as V2Client
}
