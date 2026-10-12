-- Uploads go straight from the browser to storage on a signed address
-- (src/lib/storage-upload.ts), so the bucket is now the only thing that can
-- refuse a file that's too big or the wrong kind; Vercel's 4.5MB request cap
-- used to do it by accident. 25MB matches MAX_SOURCE_BYTES in
-- src/lib/compress-image.ts. Applied by hand on 12 Oct 2026; this keeps a
-- rebuild the same.
update storage.buckets
set file_size_limit = 26214400, allowed_mime_types = array['image/*']
where id in ('term-images', 'provider-photos', 'marketing-files');

update storage.buckets
set file_size_limit = 26214400, allowed_mime_types = array['image/*', 'application/pdf']
where id = 'guide-files';
