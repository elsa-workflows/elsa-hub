-- Fix existing intro_call_submitted notifications with incorrect action_url
UPDATE notifications 
SET action_url = '/dashboard/provider/skywalker-digital/customers' 
WHERE type = 'intro_call_submitted' 
  AND action_url = '/dashboard/provider/customers';