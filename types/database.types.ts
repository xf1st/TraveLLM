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
                    itinerary: Json | null
                    payment_advice: Json | null
                    restrictions: Json | null
                    safety_info: Json | null
                    start_date: string | null
                    tags: string[] | null
                    title: string
                    total_cost: string | null
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
                    itinerary?: Json | null
                    payment_advice?: Json | null
                    restrictions?: Json | null
                    safety_info?: Json | null
                    start_date?: string | null
                    tags?: string[] | null
                    title: string
                    total_cost?: string | null
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
                    itinerary?: Json | null
                    payment_advice?: Json | null
                    restrictions?: Json | null
                    safety_info?: Json | null
                    start_date?: string | null
                    tags?: string[] | null
                    title?: string
                    total_cost?: string | null
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
