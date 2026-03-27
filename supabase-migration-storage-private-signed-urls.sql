-- Make event-documents private: reads use signed URLs or authenticated API.
-- RLS on storage.objects (org-scoped paths) still applies when minting signed URLs.
UPDATE storage.buckets
SET public = false
WHERE id = 'event-documents';
