import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const kiriApiKey = Deno.env.get("KIRI_API_KEY");
const kiriStatusUrl = Deno.env.get("KIRI_STATUS_URL") ?? "https://api.kiriengine.com/v1/model-status";

const supabase = createClient(supabaseUrl, serviceRoleKey);

interface KiriJobStatus {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  previewUrl?: string;
  glbUrl?: string;
  errorMessage?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Supabase env not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const url = new URL(req.url);
  const jobId = url.searchParams.get("jobId");
  const projectId = url.searchParams.get("projectId");

  let reconJobId = jobId;

  if (!reconJobId && projectId) {
    const latest = await supabase
      .from("recon_jobs")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest.data) {
      reconJobId = latest.data.id as string;
    }
  }

  if (!reconJobId) {
    return new Response(JSON.stringify({ error: "jobId or projectId required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const job = await supabase
    .from("recon_jobs")
    .select("*")
    .eq("id", reconJobId)
    .maybeSingle();

  if (job.error || !job.data) {
    return new Response(JSON.stringify({ error: "Job not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const normalizeStatus = (value: string | null): KiriJobStatus["status"] => {
    if (value === "complete") return "completed";
    if (value === "processing" || value === "queued" || value === "failed" || value === "completed") {
      return value as KiriJobStatus["status"];
    }
    return "queued";
  };

  const responseBody: KiriJobStatus = {
    status: normalizeStatus(job.data.status),
    progress: job.data.status === "complete" || job.data.status === "completed" ? 100 : 30
  };

  if (!kiriApiKey || !job.data.provider_job_id) {
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const statusCall = await fetch(`${kiriStatusUrl}?jobId=${job.data.provider_job_id}`, {
      headers: { "Authorization": `Bearer ${kiriApiKey}` }
    });

    if (!statusCall.ok) {
      console.error("Kiri status failed", statusCall.status, await statusCall.text());
    } else {
      const body = await statusCall.json();
      const state = normalizeStatus(body?.status ?? body?.state ?? job.data.status);
      responseBody.status = state;
      responseBody.progress = typeof body?.progress === "number" ? body.progress : responseBody.progress;
      const glbUrl = body?.glbUrl ?? body?.modelUrl ?? body?.url;
      if (glbUrl) {
        responseBody.glbUrl = glbUrl;
      }

      await supabase
        .from("recon_jobs")
        .update({
          status: state,
          provider_job_id: job.data.provider_job_id
        })
        .eq("id", reconJobId);

      if (glbUrl) {
        await supabase.from("models").upsert(
          { project_id: job.data.project_id, glb_url: glbUrl },
          { onConflict: "project_id" }
        );
      }
    }
  } catch (error) {
    console.error("Kiri status exception", error);
    responseBody.errorMessage = "Status check failed";
  }

  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
