const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

async function uploadFile(bucket, filename, buffer, mimetype) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filename, buffer, { contentType: mimetype, upsert: true });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
  return data.publicUrl;
}

module.exports = { supabase, uploadFile };
