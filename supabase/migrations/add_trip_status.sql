-- Migration: Add trip status and progress tracking
-- Run this in Supabase SQL Editor

ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'planning', -- 'planning', 'booking', 'active', 'completed'
ADD COLUMN IF NOT EXISTS bookings jsonb DEFAULT '{}'::jsonb, -- { "flights": false, "hotels": false, ... }
ADD COLUMN IF NOT EXISTS completed_activities jsonb DEFAULT '[]'::jsonb; -- Array of activity IDs or indices

COMMENT ON COLUMN trips.status IS 'Current state of the trip cycle';
COMMENT ON COLUMN trips.bookings IS 'Checklist state for booking phase';
COMMENT ON COLUMN trips.completed_activities IS 'List of completed activity IDs';
