-- Migration 001: Create shops table and default data (FIXED for existing DB)
-- Run this in your Supabase SQL Editor

-- Check if shops table exists with correct structure (no FK to organizations)
DO $$
DECLARE
    has_wrong_fk BOOLEAN;
    table_exists BOOLEAN;
BEGIN
    -- Check if shops table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'shops'
    ) INTO table_exists;

    -- Check if it has foreign key to organizations table (the wrong one)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'shops' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'organizations'
    ) INTO has_wrong_fk;

    -- Only drop and recreate if it has the wrong FK
    IF table_exists AND has_wrong_fk THEN
        -- Drop dependent constraints first
        ALTER TABLE IF EXISTS inventory_items DROP CONSTRAINT IF EXISTS inventory_items_shop_id_fkey;
        ALTER TABLE IF EXISTS jobs DROP CONSTRAINT IF EXISTS jobs_shop_id_fkey;
        
        -- Now drop shops table
        DROP TABLE shops;
        
        -- Recreate shops table without FK
        CREATE TABLE shops (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            org_id UUID NOT NULL,
            name TEXT NOT NULL,
            location TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        RAISE NOTICE 'Dropped and recreated shops table without organizations FK';
    ELSIF NOT table_exists THEN
        -- Create shops table if it doesn't exist
        CREATE TABLE shops (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            org_id UUID NOT NULL,
            name TEXT NOT NULL,
            location TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        RAISE NOTICE 'Created new shops table';
    ELSE
        RAISE NOTICE 'Shops table already exists with correct structure';
    END IF;
END $$;

-- Enable RLS (safe to run multiple times)
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

-- Drop and recreate RLS policies (safe approach)
DROP POLICY IF EXISTS "shops_select" ON shops;
DROP POLICY IF EXISTS "shops_insert" ON shops;
DROP POLICY IF EXISTS "shops_update" ON shops;
DROP POLICY IF EXISTS "shops_delete" ON shops;

-- Create RLS policies for shops
CREATE POLICY "shops_select" ON shops FOR SELECT USING (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);
CREATE POLICY "shops_insert" ON shops FOR INSERT WITH CHECK (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);
CREATE POLICY "shops_update" ON shops FOR UPDATE USING (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);
CREATE POLICY "shops_delete" ON shops FOR DELETE USING (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);

-- Create default "Main Shop" for each existing user (only if not already exists)
INSERT INTO shops (org_id, name, location)
SELECT DISTINCT
    COALESCE((raw_user_meta_data->>'org_id')::uuid, id) as org_id,
    'Main Shop' as name,
    NULL as location
FROM auth.users
WHERE COALESCE((raw_user_meta_data->>'org_id')::uuid, id) NOT IN (
    SELECT DISTINCT org_id FROM shops WHERE org_id IS NOT NULL
)
ON CONFLICT DO NOTHING;
