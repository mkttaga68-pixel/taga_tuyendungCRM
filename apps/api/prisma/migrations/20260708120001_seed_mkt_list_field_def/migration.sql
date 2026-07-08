-- Seed "Danh bạ" system field definition for candidates grid
-- ON CONFLICT DO NOTHING = safe to re-run
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
  'mktListIds',
  'Danh bạ',
  'MKT_LIST',
  180,
  998,
  false,
  false,
  true,
  false,
  '{}',
  NOW(),
  NOW()
)
ON CONFLICT (table_key, field_key) DO NOTHING;
