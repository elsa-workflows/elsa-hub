-- Clean up test data before going live
-- Temporarily disable append-only triggers to allow cleanup

-- Disable triggers
ALTER TABLE credit_ledger_entries DISABLE TRIGGER trg_ledger_immutable;
ALTER TABLE audit_events DISABLE TRIGGER trg_audit_immutable;

-- Delete in order of dependencies (child tables first)

-- 1. Delete lot consumptions (references work_logs and credit_lots)
DELETE FROM lot_consumptions;

-- 2. Delete credit ledger entries
DELETE FROM credit_ledger_entries;

-- 3. Delete work logs
DELETE FROM work_logs;

-- 4. Delete credit lots
DELETE FROM credit_lots;

-- 5. Delete invoices
DELETE FROM invoices;

-- 6. Delete orders
DELETE FROM orders;

-- 7. Delete subscriptions
DELETE FROM subscriptions;

-- 8. Delete audit events
DELETE FROM audit_events;

-- Re-enable triggers for production use
ALTER TABLE credit_ledger_entries ENABLE TRIGGER trg_ledger_immutable;
ALTER TABLE audit_events ENABLE TRIGGER trg_audit_immutable;

-- Note: Keeping profiles (users) and credit_bundles (products) as requested