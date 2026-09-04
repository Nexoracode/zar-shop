-- The seed categories used human-readable ids ('seed-ticket-cat-order', ...), which fail the
-- app's z.string().cuid() validation used for every other id field in the project (ticket
-- creation was rejected with a generic "invalid data" error). SupportTicket_categoryId_fkey is
-- ON UPDATE CASCADE, so renaming the primary key here also updates any ticket already
-- referencing it.
UPDATE `SupportTicketCategory` SET `id` = 'ctcatorderpayment000001' WHERE `id` = 'seed-ticket-cat-order';
UPDATE `SupportTicketCategory` SET `id` = 'ctcatreturnwarranty0001' WHERE `id` = 'seed-ticket-cat-return';
UPDATE `SupportTicketCategory` SET `id` = 'ctcataccountissue00001' WHERE `id` = 'seed-ticket-cat-account';
UPDATE `SupportTicketCategory` SET `id` = 'ctcatothertopic000001' WHERE `id` = 'seed-ticket-cat-other';
