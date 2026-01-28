-- Reset all order-related data for clean testing
-- Temporarily disable append-only triggers for reset

-- Disable the append-only triggers
ALTER TABLE credit_ledger_entries DISABLE TRIGGER trg_ledger_immutable;
ALTER TABLE audit_events DISABLE TRIGGER trg_audit_immutable;

-- Delete in correct order due to foreign key constraints
DELETE FROM lot_consumptions;
DELETE FROM work_logs;
DELETE FROM credit_ledger_entries;
DELETE FROM credit_lots;
DELETE FROM invoices;
DELETE FROM subscriptions;
DELETE FROM orders;
DELETE FROM provider_customers;
DELETE FROM audit_events WHERE entity_type IN ('order', 'credit_lot', 'work_log', 'credit_adjustment');

-- Re-enable the append-only triggers
ALTER TABLE credit_ledger_entries ENABLE TRIGGER trg_ledger_immutable;
ALTER TABLE audit_events ENABLE TRIGGER trg_audit_immutable;