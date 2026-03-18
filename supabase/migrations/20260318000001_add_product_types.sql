-- Add missing product_type enum values
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New query → paste & run

ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'food';
ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'subscription';
