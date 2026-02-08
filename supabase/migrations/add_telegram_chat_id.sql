-- Add telegram_chat_id column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_chat_id ON profiles(telegram_chat_id);

-- Component to allow admins to see who has connected telegram
COMMENT ON COLUMN profiles.telegram_chat_id IS 'Telegram Chat ID for admin notifications';
