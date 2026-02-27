CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
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
    'deal_rejected'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = false;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users delete own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- Enable Realtime on this table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
