-- Add "archived" to the allowed status values for intro_call_requests
-- The status column is TEXT without a constraint, so we just need to ensure 
-- the application handles "archived" as a valid status value.
-- No constraint modification needed since the column is TEXT type without CHECK constraint.

-- This migration serves as documentation that "archived" is now a valid status
COMMENT ON COLUMN intro_call_requests.status IS 'Valid statuses: pending, scheduled, completed, declined, archived';