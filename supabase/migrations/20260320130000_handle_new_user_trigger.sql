-- Create or replace the function that runs on new auth.users INSERT
-- Copies first_name, last_name, display_name from raw_user_meta_data into profiles.
-- The profiles row is created by an existing trigger; this migration ensures names are copied.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      NEW.raw_user_meta_data ->> 'first_name',
      NEW.raw_user_meta_data ->> 'full_name',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name   = COALESCE(EXCLUDED.first_name,   profiles.first_name),
    last_name    = COALESCE(EXCLUDED.last_name,    profiles.last_name),
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    email        = EXCLUDED.email;

  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'on_auth_user_created'
      AND event_object_schema = 'auth'
      AND event_object_table = 'users'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END;
$$;
