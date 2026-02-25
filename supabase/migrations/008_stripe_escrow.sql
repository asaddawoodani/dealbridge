-- ============================================================
-- 008_stripe_escrow.sql
-- Add Stripe payment fields to escrow and commitment tables
-- Run this in the Supabase SQL editor
-- ============================================================

-- 1. Add Stripe fields to escrow_transactions
ALTER TABLE escrow_transactions
  ADD COLUMN IF NOT EXISTS stripe_client_secret TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'partially_refunded')),
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS stripe_receipt_url TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12,2) DEFAULT 0;

-- Note: stripe_payment_intent_id column already exists from 007 migration
-- Make it unique if not already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'escrow_transactions_stripe_payment_intent_id_key'
  ) THEN
    ALTER TABLE escrow_transactions
      ADD CONSTRAINT escrow_transactions_stripe_payment_intent_id_key
      UNIQUE (stripe_payment_intent_id);
  END IF;
END $$;

-- 2. Add payment reference to investment_commitments
ALTER TABLE investment_commitments
  ADD COLUMN IF NOT EXISTS escrow_transaction_id UUID REFERENCES escrow_transactions(id),
  ADD COLUMN IF NOT EXISTS funding_status TEXT DEFAULT 'unfunded'
    CHECK (funding_status IN ('unfunded', 'pending_payment', 'funded', 'released', 'refunded'));

-- 3. Indexes for webhook and status lookups
CREATE INDEX IF NOT EXISTS idx_escrow_stripe_pi ON escrow_transactions(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_escrow_payment_status ON escrow_transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_commitments_funding_status ON investment_commitments(funding_status);

-- 4. RLS policies for escrow_transactions (extend existing)
-- Investors can SELECT their own escrow transactions
DROP POLICY IF EXISTS "Investors read own escrow via commitment" ON escrow_transactions;
CREATE POLICY "Investors read own escrow via commitment"
  ON escrow_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM investment_commitments ic
      WHERE ic.escrow_transaction_id = escrow_transactions.id
        AND ic.investor_id = auth.uid()
    )
  );

-- Admins can SELECT all escrow transactions (already have full access from 007)
