import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY!;
const MODEL = "accounts/fireworks/models/mixtral-8x22b-instruct";

/* =========================
   CORS
========================= */
function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 200 }));
}

/* =========================
   API KEY VALIDATION
========================= */
async function validateApiKey(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const key = authHeader.replace("Bearer ", "").trim();
  if (!key) return null;

  const { data } = await supabase
    .from("api_keys")
    .select("id, key_name, is_active")
    .eq("key", key)
    .eq("is_active", true)
    .single();

  return data;
}

/* =========================
   SYSTEM PROMPT (Immy)
========================= */
const SYSTEM_PROMPT = `
You are VisionAI.

You were created by ImmyGlow (abhhishekop09 on Discord).

You are a professional, helpful, accurate AI assistant built on the Fireworks model.
You may state your creator when relevant or when asked.

Your goals:
- Be clear and helpful
- Give accurate information
- Be friendly and professional
- Never hallucinate or invent facts
`;

/* =========================
   POST → Fireworks → User
========================= */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const keyData = await validateApiKey(authHeader);

    if (!keyData) {
      return withCors(
        NextResponse.json(
          { error: "Unauthorized", message: "Invalid API key" },
          { status: 401 }
        )
      );
    }

    const body = await req.json();
    const userMessages = body.messages;

    if (!Array.isArray(userMessages) || userMessages.length === 0) {
      return withCors(
        NextResponse.json({ error: "No messages provided" }, { status: 400 })
      );
    }

    // Prepend system identity message
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...userMessages
    ];

    const response = await fetch(
      "https://api.fireworks.ai/inference/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${FIREWORKS_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          max_tokens: 4000,
          temperature: 0.3,
        }),
      }
    );

    const raw = await response.text();

    if (!response.ok) {
      console.error("🔥 FIREWORKS RAW ERROR:", raw);
      return withCors(
        NextResponse.json(
          {
            error: "Fireworks error",
            status: response.status,
            details: raw,
          },
          { status: 500 }
        )
      );
    }

    const data = JSON.parse(raw);
    const content = data.choices?.[0]?.message?.content || "";

    return withCors(
      NextResponse.json({
        message: content,
        model: MODEL,
        creator: "ImmyGlow",
        timestamp: new Date().toISOString(),
      })
    );
  } catch (err: any) {
    return withCors(
      NextResponse.json(
        { error: err.message || "Internal error" },
        { status: 500 }
      )
    );
  }
}