-- Add address fields to profiles (country already exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS street_address text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city          text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS postal_code   text;
