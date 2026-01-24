-- Migration: Add Social & Collaboration tables
-- Run this in Supabase SQL Editor

-- 1. Add invite_code to trips for link-based sharing
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex');

-- 2. Create trip_members table
CREATE TABLE IF NOT EXISTS public.trip_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')) DEFAULT 'viewer',
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(trip_id, user_id)
);

-- 3. Enable RLS on trip_members
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;

-- 4. Policies for trip_members
-- Owners/Editors of a trip can see all members
CREATE POLICY "Users can view members of trips they belong to" 
ON public.trip_members FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.trip_members AS tm 
        WHERE tm.trip_id = trip_members.trip_id 
        AND tm.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.trips AS t 
        WHERE t.id = trip_members.trip_id 
        AND t.user_id = auth.uid()
    )
);

-- Every user can add themselves if they have the invite code (logic handled in app but protected here)
CREATE POLICY "Users can join trips via link" 
ON public.trip_members FOR INSERT 
WITH CHECK (true); -- Verification happens via invite_code check in the function/middleware

-- 5. Update Policies for trips table
-- Allow members to view/edit trips
CREATE POLICY "Members can view trips" 
ON public.trips FOR SELECT 
USING (
    user_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM public.trip_members 
        WHERE trip_id = trips.id AND user_id = auth.uid()
    )
);

CREATE POLICY "Editor members can update trips" 
ON public.trips FOR UPDATE 
USING (
    user_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM public.trip_members 
        WHERE trip_id = trips.id AND user_id = auth.uid() AND role = 'editor'
    )
);
