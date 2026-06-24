import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nscxzzyksjzdekbnuhgq.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_490WDAaU0vh37_48L9fSRg_sPUDnzd9'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
