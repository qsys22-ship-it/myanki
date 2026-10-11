import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = 'sb_publishable_f3KIoC59edOm1Ro03BVBhw_Y1E-dzTQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)