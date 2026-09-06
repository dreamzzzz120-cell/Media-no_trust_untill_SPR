DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'media_verifications'::regclass AND conname = 'media_verifications_kind_check') THEN
    ALTER TABLE media_verifications DROP CONSTRAINT media_verifications_kind_check;
  END IF;
  ALTER TABLE media_verifications ADD CONSTRAINT media_verifications_kind_check CHECK (kind IN ('image','video','audio','article','text','podcast','livestream','document','social_post','news_report','advertisement'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
