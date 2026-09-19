-- Automated SMS can now go out through a registered Faraz pattern per event, and four more order stages
-- (preparing, delivered, cancelled, refunded) can send. New stages start switched off.
ALTER TABLE `CommunicationSetting`
  ADD COLUMN `orderProcessingSms` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `orderDeliveredSms` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `orderCancelledSms` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `orderRefundedSms` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `eventRules` JSON NULL;
