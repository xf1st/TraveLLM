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
                    referral_code: string | null
                    referred_by: string | null
                    partner_promo_code: string | null
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
                    referral_code?: string | null
                    referred_by?: string | null
                    partner_promo_code?: string | null
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
                    referral_code?: string | null
                    referred_by?: string | null
                    partner_promo_code?: string | null
                    username?: string | null
                    public_profile?: boolean
                    bio?: string | null
                    preferences?: Json | null
                    created_at?: string
                    updated_at?: string | null
                }
            }
            referral_rewards: {
                Row: {
                    id: string
                    referee_id: string
                    referrer_id: string
                    bonus_generations: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    referee_id: string
                    referrer_id: string
                    bonus_generations?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    referee_id?: string
                    referrer_id?: string
                    bonus_generations?: number
                    created_at?: string
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
            discovery_reels: {
                Row: {
                    id: string
                    title: string
                    country: string
                    city: string | null
                    price_amount: number | null
                    price_currency: string
                    price_label: string | null
                    suggested_start_date: string | null
                    suggested_end_date: string | null
                    anchor_day: number
                    images: Json
                    activity_anchor: Json
                    music_url: string | null
                    locale: string
                    published: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    title: string
                    country: string
                    city?: string | null
                    price_amount?: number | null
                    price_currency?: string
                    price_label?: string | null
                    suggested_start_date?: string | null
                    suggested_end_date?: string | null
                    anchor_day?: number
                    images?: Json
                    activity_anchor?: Json
                    music_url?: string | null
                    locale?: string
                    published?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    title?: string
                    country?: string
                    city?: string | null
                    price_amount?: number | null
                    price_currency?: string
                    price_label?: string | null
                    suggested_start_date?: string | null
                    suggested_end_date?: string | null
                    anchor_day?: number
                    images?: Json
                    activity_anchor?: Json
                    music_url?: string | null
                    locale?: string
                    published?: boolean
                    created_at?: string
                    updated_at?: string
                }
            }
        }
        Functions: {
            apply_my_referral: {
                Args: { p_code: string }
                Returns: Json
            }
        }
    }
}
