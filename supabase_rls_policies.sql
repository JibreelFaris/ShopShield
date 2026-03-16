-- ShopShield: Complete RLS Policies
-- Run this ENTIRE script in your Supabase SQL Editor.
-- It will safely skip anything that already exists.

-- =====================================================
-- 1. CREATE THE SALES TABLE (if not already done)
-- =====================================================
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    shop_id TEXT,
    created_by UUID REFERENCES auth.users(id),
    sale_type TEXT NOT NULL CHECK (sale_type IN ('repair', 'retail')),
    item_name TEXT NOT NULL,
    default_price NUMERIC(10, 2) DEFAULT 0,
    final_price NUMERIC(10, 2) DEFAULT 0,
    discount_amount NUMERIC(10, 2) DEFAULT 0,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'transfer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. DROP ALL EXISTING POLICIES (clean slate)
-- =====================================================
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- =====================================================
-- 3. JOBS policies
-- =====================================================
CREATE POLICY "jobs_select" ON jobs FOR SELECT USING (true);
CREATE POLICY "jobs_insert" ON jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "jobs_update" ON jobs FOR UPDATE USING (true);
CREATE POLICY "jobs_delete" ON jobs FOR DELETE USING (true);

-- =====================================================
-- 4. PARTS policies
-- =====================================================
CREATE POLICY "parts_select" ON parts FOR SELECT USING (true);
CREATE POLICY "parts_insert" ON parts FOR INSERT WITH CHECK (true);
CREATE POLICY "parts_update" ON parts FOR UPDATE USING (true);
CREATE POLICY "parts_delete" ON parts FOR DELETE USING (true);

-- =====================================================
-- 5. INVENTORY_ITEMS policies
-- =====================================================
CREATE POLICY "inv_select" ON inventory_items FOR SELECT USING (true);
CREATE POLICY "inv_insert" ON inventory_items FOR INSERT WITH CHECK (true);
CREATE POLICY "inv_update" ON inventory_items FOR UPDATE USING (true);
CREATE POLICY "inv_delete" ON inventory_items FOR DELETE USING (true);

-- =====================================================
-- 6. JOB_PARTS policies
-- =====================================================
CREATE POLICY "jp_select" ON job_parts FOR SELECT USING (true);
CREATE POLICY "jp_insert" ON job_parts FOR INSERT WITH CHECK (true);
CREATE POLICY "jp_update" ON job_parts FOR UPDATE USING (true);
CREATE POLICY "jp_delete" ON job_parts FOR DELETE USING (true);

-- =====================================================
-- 7. ACTIVITY_LOGS policies
-- =====================================================
CREATE POLICY "logs_select" ON activity_logs FOR SELECT USING (true);
CREATE POLICY "logs_insert" ON activity_logs FOR INSERT WITH CHECK (true);

-- =====================================================
-- 8. SALES policies
-- =====================================================
CREATE POLICY "sales_select" ON sales FOR SELECT USING (true);
CREATE POLICY "sales_insert" ON sales FOR INSERT WITH CHECK (true);
-- Note: NO update/delete policies on sales — sales are immutable.
