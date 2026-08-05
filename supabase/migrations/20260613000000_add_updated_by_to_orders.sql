-- Migration: Add updated_by column to oil_orders table
ALTER TABLE public.oil_orders 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
