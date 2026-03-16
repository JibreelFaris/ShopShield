-- Migration 004: Update all RLS policies with proper org_id isolation
-- Run this in your Supabase SQL Editor

-- Drop all existing policies to start fresh
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- JOBS policies
CREATE POLICY "jobs_select" ON jobs FOR SELECT USING (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);
CREATE POLICY "jobs_insert" ON jobs FOR INSERT WITH CHECK (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);
CREATE POLICY "jobs_update" ON jobs FOR UPDATE USING (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);
CREATE POLICY "jobs_delete" ON jobs FOR DELETE USING (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);

-- PARTS policies
CREATE POLICY "parts_select" ON parts FOR SELECT USING (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);
CREATE POLICY "parts_insert" ON parts FOR INSERT WITH CHECK (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);
CREATE POLICY "parts_update" ON parts FOR UPDATE USING (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);
CREATE POLICY "parts_delete" ON parts FOR DELETE USING (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);

-- INVENTORY_ITEMS policies
CREATE POLICY "inv_select" ON inventory_items FOR SELECT USING (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);
CREATE POLICY "inv_insert" ON inventory_items FOR INSERT WITH CHECK (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);
CREATE POLICY "inv_update" ON inventory_items FOR UPDATE USING (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);
CREATE POLICY "inv_delete" ON inventory_items FOR DELETE USING (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);

-- JOB_PARTS policies
CREATE POLICY "jp_select" ON job_parts FOR SELECT USING (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);
CREATE POLICY "jp_insert" ON job_parts FOR INSERT WITH CHECK (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);
CREATE POLICY "jp_update" ON job_parts FOR UPDATE USING (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);
CREATE POLICY "jp_delete" ON job_parts FOR DELETE USING (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);

-- ACTIVITY_LOGS policies
CREATE POLICY "logs_select" ON activity_logs FOR SELECT USING (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);
CREATE POLICY "logs_insert" ON activity_logs FOR INSERT WITH CHECK (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);

-- SALES policies (immutable - no update/delete)
CREATE POLICY "sales_select" ON sales FOR SELECT USING (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);
CREATE POLICY "sales_insert" ON sales FOR INSERT WITH CHECK (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);

-- SHOPS policies (already created in migration 001, but including for completeness)
CREATE POLICY "shops_select" ON shops FOR SELECT USING (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);
CREATE POLICY "shops_insert" ON shops FOR INSERT WITH CHECK (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);
CREATE POLICY "shops_update" ON shops FOR UPDATE USING (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);
CREATE POLICY "shops_delete" ON shops FOR DELETE USING (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);

-- PROFILES policies (already created in migration 002, but including for completeness)
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid);
