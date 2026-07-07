-- Add "Email gần nhất" system field definition for candidates grid
-- Uses ON CONFLICT DO NOTHING so it's safe to run multiple times
INSERT INTO field_definitions (
  id,
  table_key,
  field_key,
  label,
  field_type,
  width,
  sort_order,
  is_frozen,
  is_hidden,
  is_system,
  is_required,
  options,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'candidates',
  'lastEmailLog',
  'Email gần nhất',
  'TEXT',
  260,
  999,
  false,
  false,
  true,
  false,
  '{}',
  NOW(),
  NOW()
)
ON CONFLICT (table_key, field_key) DO NOTHING;
