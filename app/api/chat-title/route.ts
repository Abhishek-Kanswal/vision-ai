import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.fireworks.ai/inference/v1/completions";
const MODEL = "accounts/sentientfoundation/models/dobby-unhinged-llama-3-3-70b-new";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userMessage = body?.userMessage;

    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json({ error: "Invalid user message" }, { status: 400 });
    }

    const apiKey = process.env.FIREWORKS_API_KEY;
    if (!apiKey) {
      console.error("FIREWORKS_API_KEY is not configured");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const truncatedMessage =
      userMessage.length > 500 ? userMessage.substring(0, 500) + "..." : userMessage;

    const prompt = `
Generate a short, catchy chat title (2-5 words) based on this user message:
"${truncatedMessage}"
Do NOT reply to the user. ONLY return the title, no punctuation, no quotes, no explanation.
    `;

    const payload = {
      model: MODEL,
      prompt,
      max_tokens: 20,
      temperature: 0.6,
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Fireworks API error:", response.status, errorText);
      return NextResponse.json({ error: "AI service unavailable" }, { status: 502 });
    }

    const data = await response.json();

    let title = data?.choices?.[0]?.text?.trim();

    if (title) {
      title = title.replace(/^["']|["']$/g, "").trim();
      if (title.length > 30) title = title.substring(0, 30).trim() + "...";
    }

    if (!title || title.length < 2) {
      const words = truncatedMessage.split(/\s+/).slice(0, 3);
      title = words.join(" ") || "New Chat";
    }

    return NextResponse.json({ title });
  } catch (error) {
    console.error("Error generating chat title:", error);
    return NextResponse.json({ title: "New Chat", error: "Internal server error" }, { status: 500 });
  }
}
