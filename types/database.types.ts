export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    email: string | null
                    full_name: string | null
                    avatar_url: string | null
                    role: string
                    access_mode: string
                    block_reason: string | null
                    blocked_until: string | null
                    last_seen_at: string | null
                    subscription_tier: string
                    subscription_expires_at: string | null
                    site_access: boolean
                    monthly_gen_used: number
                    gen_reset_at: string | null
                    gen_limit_override: number | null
                    chat_limit_override: number | null
                    username: string | null
                    public_profile: boolean
                    bio: string | null
                    preferences: Json | null
                    created_at: string
                    updated_at: string | null
                }
                Insert: {
                    id: string
                    email?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    role?: string
                    access_mode?: string
                    block_reason?: string | null
                    blocked_until?: string | null
                    last_seen_at?: string | null
                    subscription_tier?: string
                    subscription_expires_at?: string | null
                    site_access?: boolean
                    monthly_gen_used?: number
                    gen_reset_at?: string | null
                    gen_limit_override?: number | null
                    chat_limit_override?: number | null
                    username?: string | null
                    public_profile?: boolean
                    bio?: string | null
                    preferences?: Json | null
                    created_at?: string
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    email?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    role?: string
                    access_mode?: string
                    block_reason?: string | null
                    blocked_until?: string | null
                    last_seen_at?: string | null
                    subscription_tier?: string
                    subscription_expires_at?: string | null
                    site_access?: boolean
                    monthly_gen_used?: number
                    gen_reset_at?: string | null
                    gen_limit_override?: number | null
                    chat_limit_override?: number | null
                    username?: string | null
                    public_profile?: boolean
                    bio?: string | null
                    preferences?: Json | null
                    created_at?: string
                    updated_at?: string | null
                }
            }
            budget_expenses: {
                Row: {
                    amount: number
                    category: string | null
                    created_at: string
                    created_by: string | null
                    currency: string
                    description: string
                    id: string
                    paid_by: string | null
                    trip_id: string
                }
                Insert: {
                    amount: number
                    category?: string | null
                    created_at?: string
                    created_by?: string | null
                    currency?: string
                    description: string
                    id?: string
                    paid_by?: string | null
                    trip_id: string
                }
                Update: {
                    amount?: number
                    category?: string | null
                    created_at?: string
                    created_by?: string | null
                    currency?: string
                    description?: string
                    id?: string
                    paid_by?: string | null
                    trip_id?: string
                }
            }
            poll_options: {
                Row: {
                    id: string
                    poll_id: string
                    text: string
                }
                Insert: {
                    id?: string
                    poll_id: string
                    text: string
                }
                Update: {
                    id?: string
                    poll_id?: string
                    text?: string
                }
            }
            poll_votes: {
                Row: {
                    created_at: string
                    id: string
                    option_id: string
                    poll_id: string
                    user_id: string
                }
                Insert: {
                    created_at?: string
                    id?: string
                    option_id: string
                    poll_id: string
                    user_id: string
                }
                Update: {
                    created_at?: string
                    id?: string
                    option_id?: string
                    poll_id?: string
                    user_id?: string
                }
            }
            trip_members: {
                Row: {
                    id: string
                    joined_at: string
                    role: string
                    trip_id: string
                    user_id: string
                }
                Insert: {
                    id?: string
                    joined_at?: string
                    role?: string
                    trip_id: string
                    user_id: string
                }
                Update: {
                    id?: string
                    joined_at?: string
                    role?: string
                    trip_id?: string
                    user_id?: string
                }
            }
            trips: {
                Row: {
                    budget_analysis: Json | null
                    budget_range: string | null
                    countries: Json | null
                    cover_image: string | null
                    created_at: string
                    departure_city: string | null
                    description: string | null
                    destination: string
                    end_date: string | null
                    id: string
                    invite_code: string | null
                    is_public: boolean
                    itinerary: Json | null
                    payment_advice: Json | null
                    restrictions: Json | null
                    safety_info: Json | null
                    start_date: string | null
                    tags: string[] | null
                    title: string
                    total_cost: string | null
                    travel_mode: string | null
                    updated_at: string
                    user_id: string | null
                    visa_advice: Json | null
                }
                Insert: {
                    budget_analysis?: Json | null
                    budget_range?: string | null
                    countries?: Json | null
                    cover_image?: string | null
                    created_at?: string
                    departure_city?: string | null
                    description?: string | null
                    destination: string
                    end_date?: string | null
                    id?: string
                    invite_code?: string | null
                    is_public?: boolean
                    itinerary?: Json | null
                    payment_advice?: Json | null
                    restrictions?: Json | null
                    safety_info?: Json | null
                    start_date?: string | null
                    tags?: string[] | null
                    title: string
                    total_cost?: string | null
                    travel_mode?: string | null
                    updated_at?: string
                    user_id?: string | null
                    visa_advice?: Json | null
                }
                Update: {
                    budget_analysis?: Json | null
                    budget_range?: string | null
                    countries?: Json | null
                    cover_image?: string | null
                    created_at?: string
                    departure_city?: string | null
                    description?: string | null
                    destination?: string
                    end_date?: string | null
                    id?: string
                    invite_code?: string | null
                    is_public?: boolean
                    itinerary?: Json | null
                    payment_advice?: Json | null
                    restrictions?: Json | null
                    safety_info?: Json | null
                    start_date?: string | null
                    tags?: string[] | null
                    title?: string
                    total_cost?: string | null
                    travel_mode?: string | null
                    updated_at?: string
                    user_id?: string | null
                    visa_advice?: Json | null
                }
            }
            voting_polls: {
                Row: {
                    created_at: string
                    created_by: string | null
                    id: string
                    question: string
                    status: string | null
                    trip_id: string
                }
                Insert: {
                    created_at?: string
                    created_by?: string | null
                    id?: string
                    question: string
                    status?: string | null
                    trip_id: string
                }
                Update: {
                    created_at?: string
                    created_by?: string | null
                    id?: string
                    question?: string
                    status?: string | null
                    trip_id?: string
                }
            }
        }
    }
}
