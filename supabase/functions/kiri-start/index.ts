import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(supabaseUrl, serviceRoleKey);
const kiriApiKey = Deno.env.get("KIRI_API_KEY");
const kiriUploadUrl = Deno.env.get("KIRI_UPLOAD_URL") ?? "https://api.kiriengine.com/v1/image-upload";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Supabase env not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const { projectId } = await req.json();
  if (!projectId) {
    return new Response(JSON.stringify({ error: "projectId required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const assets = await supabase
    .from("scan_assets")
    .select("id, storage_path, step")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (assets.error || !assets.data) {
    console.error("Failed to load assets", assets.error);
    return new Response(JSON.stringify({ error: "Unable to load assets" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (assets.data.length < 20) {
    return new Response(JSON.stringify({ error: "At least 20 photos are required before submitting to Kiri." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const jobInsert = await supabase
    .from("recon_jobs")
    .insert({ project_id: projectId, status: "uploading", provider: "kiri" })
    .select()
    .single();

  if (jobInsert.error || !jobInsert.data) {
    console.error("Failed to create recon job", jobInsert.error);
    return new Response(JSON.stringify({ error: "Could not start job" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const jobId = jobInsert.data.id as string;

  if (!kiriApiKey) {
    await supabase
      .from("recon_jobs")
      .update({ status: "queued" })
      .eq("id", jobId);

    return new Response(JSON.stringify({ jobId, note: "KIRI_API_KEY not set; job queued as placeholder." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const formData = new FormData();
  formData.append("isMesh", "1");
  formData.append("isMask", "0");
  formData.append("fileFormat", "glb");

  for (const asset of assets.data) {
    const signed = await supabase.storage
      .from("scan-photos")
      .createSignedUrl(asset.storage_path, 60 * 60);

    if (signed.error || !signed.data?.signedUrl) {
      console.error("Failed to sign asset", asset.id, signed.error);
      continue;
    }

    const imageResp = await fetch(signed.data.signedUrl);
    if (!imageResp.ok) {
      console.error("Failed to download asset", asset.id, await imageResp.text());
      continue;
    }

    const blob = await imageResp.blob();
    formData.append("imagesFiles", blob, `${asset.id}.jpg`);
  }

  let providerJobId: string | null = null;

  try {
    const kiriResp = await fetch(kiriUploadUrl, {
      method: "POST",
      headers: {
        // TODO: verify correct auth header for Kiri (documentation varies by account)
        "Authorization": `Bearer ${kiriApiKey}`
      },
      body: formData
    });

    if (!kiriResp.ok) {
      console.error("Kiri upload failed", kiriResp.status, await kiriResp.text());
      await supabase.from("recon_jobs").update({ status: "failed" }).eq("id", jobId);
    } else {
      const body = await kiriResp.json();
      providerJobId = body?.jobId ?? body?.id ?? null;
      await supabase
        .from("recon_jobs")
        .update({
          status: "processing",
          provider_job_id: providerJobId ?? jobId
        })
        .eq("id", jobId);
    }
  } catch (error) {
    console.error("Kiri upload exception", error);
    await supabase.from("recon_jobs").update({ status: "failed" }).eq("id", jobId);
  }

  return new Response(JSON.stringify({ jobId, providerJobId }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
