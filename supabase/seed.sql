-- Optional seed: a few example WFPB recipes so the app isn't empty on first run.
-- Replace these with your real Well Your World favorites (or just add them in the
-- app's Recipes tab). Run in the Supabase SQL Editor after schema.sql.

insert into public.recipes (name, source_url, base, main_ingredients, effort, notes)
values
  ('Smoky Black Bean Bowl', null, 'rice',
   array['black beans','sweet potato','corn','lime'], 'quick',
   'Great for leftovers — double the sauce.'),
  ('Creamy Mushroom Pasta', null, 'pasta',
   array['mushroom','cashew','spinach','garlic'], 'medium', null),
  ('Loaded Baked Potatoes', null, 'potato',
   array['potato','broccoli','cheese sauce'], 'quick', null),
  ('Chickpea Shawarma Wraps', null, 'wrap',
   array['chickpeas','cucumber','tomato','tahini'], 'medium', null),
  ('Big Green Buddha Bowl', null, 'rice',
   array['kale','edamame','avocado','brown rice'], 'quick', null),
  ('Lentil Bolognese', null, 'pasta',
   array['lentils','tomato','carrot','onion'], 'project',
   'Worth the simmer; freezes well.');
