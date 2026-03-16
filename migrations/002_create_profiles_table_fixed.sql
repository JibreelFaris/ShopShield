-- Migration 002: Create profiles table for role-based access control (FIXED)
-- Run this in your Supabase SQL Editor

-- Check if profiles table exists and handle accordingly
DO $$
DECLARE
    table_exists BOOLEAN;
    has_full_name BOOLEAN;
    full_name_nullable BOOLEAN;
BEGIN
    -- Check if profiles table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'profiles'
    ) INTO table_exists;

    IF table_exists THEN
        -- Check if full_name column exists
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profiles' AND column_name = 'full_name'
        ) INTO has_full_name;

        IF has_full_name THEN
            -- Check if full_name is nullable
            SELECT is_nullable = 'YES'
            FROM information_schema.columns 
            WHERE table_name = 'profiles' AND column_name = 'full_name'
            INTO full_name_nullable;

            -- If full_name is NOT NULL, alter it to be nullable
            IF NOT full_name_nullable THEN
                ALTER TABLE profiles ALTER COLUMN full_name DROP NOT NULL;
                RAISE NOTICE 'Made full_name column nullable';
            END IF;
        END IF;
        
        RAISE NOTICE 'Profiles table already exists, updated structure if needed';
    ELSE
        -- Create profiles table with full_name column (nullable for compatibility)
        CREATE TABLE profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            org_id UUID NOT NULL,
            full_name TEXT,
            role TEXT NOT NULL CHECK (role IN ('owner', 'employee')) DEFAULT 'employee',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        RAISE NOTICE 'Created new profiles table';
    END IF;
END $$;

-- Enable RLS (safe to run multiple times)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop and recreate RLS policies (safe approach)
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;

-- Create RLS policies for profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);

-- Create profiles for existing users (handle both old and new table structures)
DO $$
DECLARE
    has_full_name BOOLEAN;
BEGIN
    -- Check if full_name column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'full_name'
    ) INTO has_full_name;

    IF has_full_name THEN
        -- Insert with full_name column
        INSERT INTO profiles (id, org_id, full_name, role)
        SELECT 
            id as id,
            CASE 
                WHEN raw_user_meta_data->>'org_id' IS NOT NULL 
                THEN (raw_user_meta_data->>'org_id')::uuid
                ELSE id
            END as org_id,
            raw_user_meta_data->>'full_name' as full_name,
            'owner' as role
        FROM auth.users
        WHERE id NOT IN (SELECT id FROM profiles)
        ON CONFLICT DO NOTHING;
    ELSE
        -- Insert without full_name column
        INSERT INTO profiles (id, org_id, role)
        SELECT 
            id as id,
            CASE 
                WHEN raw_user_meta_data->>'org_id' IS NOT NULL 
                THEN (raw_user_meta_data->>'org_id')::uuid
                ELSE id
            END as org_id,
            'owner' as role
        FROM auth.users
        WHERE id NOT IN (SELECT id FROM profiles)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Set first user in each organization as owner, others as employees
UPDATE profiles 
SET role = 'owner'
WHERE id = (
    SELECT MIN(id) 
    FROM profiles p2 
    WHERE p2.org_id = profiles.org_id
);

-- Function to automatically create profile on user signup (handles both structures)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    has_full_name BOOLEAN;
BEGIN
    -- Check if full_name column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'full_name'
    ) INTO has_full_name;

    IF has_full_name THEN
        INSERT INTO public.profiles (id, org_id, full_name, role)
        VALUES (
            NEW.id,
            COALESCE((NEW.raw_user_meta_data->>'org_id')::uuid, NEW.id),
            NEW.raw_user_meta_data->>'full_name',
            'employee'
        );
    ELSE
        INSERT INTO public.profiles (id, org_id, role)
        VALUES (
            NEW.id,
            COALESCE((NEW.raw_user_meta_data->>'org_id')::uuid, NEW.id),
            'employee'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
