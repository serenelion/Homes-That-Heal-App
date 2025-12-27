import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type ScanPhase =
  | 'CORNER_1'
  | 'CORNER_2'
  | 'CORNER_3'
  | 'CORNER_4'
  | 'PERIMETER'
  | 'REVIEW';

interface Photo {
  id: string;
  phase: ScanPhase;
}

interface ScanState {
  currentPhase: ScanPhase;
  photos: Photo[];
  totalPhotos: number;
  lastAction: 'PHOTO_TAKEN' | 'PHASE_CHANGED' | 'IDLE';
}

interface AgentResponse {
  assistantText: string;
  warnings: string[];
  nextAction?: 'STAY' | 'ADVANCE_PHASE';
  shouldSpeak: boolean;
}

const MIN_TOTAL = 20;
const MAX_TOTAL = 300;
const TARGET_MIN = 80;
const TARGET_MAX = 150;
const CORNER_MIN = 8;
const WARN_AT = 250;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

const buildRuleBasedResponse = (state: ScanState): AgentResponse => {
  const warnings: string[] = [];
  const total = state.totalPhotos ?? state.photos.length;

  if (total >= MAX_TOTAL) {
    return {
      assistantText: "Hard stop. You've reached 300 photos. Proceed to review and generate the model.",
      warnings: ["Max limit reached (300)"],
      shouldSpeak: true,
      nextAction: 'ADVANCE_PHASE'
    };
  }

  if (total >= WARN_AT) {
    warnings.push("Approaching hard stop at 300 photos.");
  } else if (total >= TARGET_MAX) {
    warnings.push("Above the recommended 80-150 photos. Stop at 300.");
  } else if (total >= MIN_TOTAL) {
    warnings.push("Minimum met. Aim for 80-150 photos for best balance.");
  }

  const phasePhotos = state.photos.filter(p => p.phase === state.currentPhase).length;

  if (state.currentPhase.startsWith("CORNER") && phasePhotos < CORNER_MIN) {
    warnings.push(`Corner photos low (${phasePhotos}/${CORNER_MIN}). Capture more before moving.`);
  }

  if (state.currentPhase === "PERIMETER") {
    const cornerCounts = ['CORNER_1', 'CORNER_2', 'CORNER_3', 'CORNER_4'].map(
      corner => state.photos.filter(p => p.phase === corner).length
    );
    if (cornerCounts.some(count => count < CORNER_MIN)) {
      warnings.push("All four corners must reach minimum coverage before perimeter.");
    }
  }

  let assistantText = "";
  let shouldSpeak = false;

  if (state.lastAction === "PHASE_CHANGED") {
    shouldSpeak = true;
    switch (state.currentPhase) {
      case "CORNER_1":
        assistantText = "Corner one: lock your stance, rotate slowly, overlap at least 60 percent.";
        break;
      case "CORNER_2":
        assistantText = "Corner two: stay steady and keep the device level.";
        break;
      case "CORNER_3":
        assistantText = "Corner three: match your previous height. Smooth rotations only.";
        break;
      case "CORNER_4":
        assistantText = "Corner four: final corner. Keep the rhythm and avoid motion blur.";
        break;
      case "PERIMETER":
        assistantText = "Perimeter walk: face the room center, sidestep, and maintain overlap.";
        break;
      case "REVIEW":
        assistantText = "Capture complete. Review coverage before you submit to Kiri.";
        break;
    }
  } else if (state.lastAction === "PHOTO_TAKEN") {
    if (state.currentPhase.startsWith("CORNER")) {
      if (phasePhotos === CORNER_MIN) {
        assistantText = "Minimum met. Two to three more shots will strengthen this corner.";
        shouldSpeak = true;
      } else if (phasePhotos === CORNER_MIN + 3) {
        assistantText = "Solid coverage. Prepare to move to the next corner.";
        shouldSpeak = true;
      }
    } else if (state.currentPhase === "PERIMETER" && phasePhotos % 10 === 0) {
      assistantText = `${phasePhotos} perimeter photos captured. Keep your path smooth.`;
      shouldSpeak = true;
    }
  }

  return {
    assistantText,
    warnings,
    shouldSpeak
  };
};

const runGemini = async (state: ScanState): Promise<string | null> => {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return null;

  const prompt = `
You are the scanning consultant for Homes That Heal. 
Rules:
- Corners 1-4 must be satisfied before perimeter.
- Require at least ${MIN_TOTAL} photos; warn at ${WARN_AT}; hard stop at ${MAX_TOTAL}.
- Recommend ${TARGET_MIN}-${TARGET_MAX} photos.
- Corners need at least ${CORNER_MIN} photos each.

Current phase: ${state.currentPhase}
Total photos: ${state.totalPhotos}
Phase photos: ${state.photos.filter(p => p.phase === state.currentPhase).length}

Provide one or two short TTS friendly sentences guiding the user.
`;

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  if (!response.ok) {
    console.error("Gemini call failed", await response.text());
    return null;
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof text === "string" ? text : null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  const payload = await req.json();
  const scanState = payload?.scanState as ScanState | undefined;

  if (!scanState) {
    return new Response(JSON.stringify({ error: "Missing scanState" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const base = buildRuleBasedResponse(scanState);
  const llmText = await runGemini(scanState);

  const body: AgentResponse = {
    assistantText: llmText ?? base.assistantText,
    warnings: base.warnings,
    nextAction: base.nextAction,
    shouldSpeak: llmText ? true : base.shouldSpeak
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
