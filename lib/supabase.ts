import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// We use the service role key because this client will only be used server-side
// to bypass Row Level Security and allow inserts/updates.
// DO NOT use this client in the frontend!
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
