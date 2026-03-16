-- Migration 003: Update sales table shop_id to be a proper foreign key
-- Run this in your Supabase SQL Editor

-- First, update any existing sales to point to the default shop for their org
UPDATE sales 
SET shop_id = shops.id::text
FROM shops
WHERE sales.shop_id = 'Main Shop' 
  AND sales.org_id = shops.org_id;

-- If there are any sales without a valid shop_id, set them to the first shop for their org
UPDATE sales 
SET shop_id = (
    SELECT id::text 
    FROM shops 
    WHERE shops.org_id = sales.org_id 
    LIMIT 1
)
WHERE shop_id IS NULL OR shop_id NOT IN (SELECT id::text FROM shops);

-- Note: We're keeping shop_id as TEXT for now to avoid breaking existing queries
-- The foreign key constraint will be enforced at the application level
