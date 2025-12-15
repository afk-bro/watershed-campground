-- ============================================
-- Add Image Support to Campsites
-- Migration: Add image_url column to campsites table
-- ============================================

-- Add image_url column to campsites
ALTER TABLE public.campsites
ADD COLUMN image_url text;

-- Add comment to describe the field
COMMENT ON COLUMN public.campsites.image_url IS 'URL to the campsite thumbnail image stored in Supabase Storage';
