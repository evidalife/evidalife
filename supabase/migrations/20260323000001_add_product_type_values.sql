-- Add new product_type enum values
ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'supplement';
ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'functional_food';
ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'ready_meal';
ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'device';
ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'program';
ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'bundle';
ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'digital_product';
ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'merch';
