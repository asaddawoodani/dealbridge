-- 011_investor_profile_system.sql
-- Adds investor profile system: intro accept/reject flow, profile fields, RLS

-- 1. Add status column to deal_interests
ALTER TABLE deal_interests
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'accepted', 'rejected'));

-- 2. Add bio and headline to investor_profiles
ALTER TABLE investor_profiles
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- 3. Add intro_accepted to notifications type constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'deal_match',
  'commitment_update',
  'payment_success',
  'payment_failed',
  'payment_refunded',
  'message_received',
  'verification_approved',
  'verification_rejected',
  'kyc_approved',
  'kyc_rejected',
  'admin_new_user',
  'admin_new_deal',
  'admin_new_application',
  'admin_new_commitment',
  'admin_verification_request',
  'admin_kyc_submission',
  'deal_approved',
  'deal_rejected',
  'intro_accepted'
));

-- 4. Backfill: set existing deal_interests rows to 'accepted' where a conversation already exists
UPDATE deal_interests di
SET status = 'accepted'
WHERE EXISTS (
  SELECT 1 FROM conversations c
  WHERE c.deal_id = di.deal_id
    AND c.investor_id = di.user_id
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_deal_interests_deal_user_status
  ON deal_interests(deal_id, user_id, status);
CREATE INDEX IF NOT EXISTS idx_deal_interests_user_status
  ON deal_interests(user_id, status);

-- 6. RLS policies for deal_interests: operators can read/update interests on their own deals
-- Allow operators to read interests on deals they own
CREATE POLICY "Operators read interests on own deals"
  ON deal_interests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_interests.deal_id
        AND deals.operator_id = auth.uid()
    )
  );

-- Allow operators to update interests on deals they own
CREATE POLICY "Operators update interests on own deals"
  ON deal_interests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_interests.deal_id
        AND deals.operator_id = auth.uid()
    )
  );

-- Investors can read their own interests
CREATE POLICY "Investors read own interests"
  ON deal_interests FOR SELECT
  USING (user_id = auth.uid());
