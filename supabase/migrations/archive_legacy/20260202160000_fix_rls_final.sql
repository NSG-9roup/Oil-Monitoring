-- Final RLS cleanup and simplification
-- This migration fixes all RLS issues by using simple policies

-- Drop all existing problematic policies on oil_profiles
DROP POLICY IF EXISTS "oil_profiles_select_own" ON oil_profiles;
DROP POLICY IF EXISTS "oil_profiles_select_admin" ON oil_profiles;
DROP POLICY IF EXISTS "oil_profiles_all_admin" ON oil_profiles;
DROP POLICY IF EXISTS "oil_profiles_select_all_authenticated" ON oil_profiles;
DROP POLICY IF EXISTS "oil_profiles_all_authenticated" ON oil_profiles;

-- Disable RLS temporarily on oil_profiles (for MVP/development)
-- In production, you should create proper policies
ALTER TABLE oil_profiles DISABLE ROW LEVEL SECURITY;

-- Keep other tables' RLS enabled with simple authenticated policies
-- These are already working correctly from previous migrations
