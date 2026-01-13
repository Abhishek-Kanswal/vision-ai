import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.fireworks.ai/inference/v1/completions";
const MODEL = "accounts/fireworks/models/mixtral-8x22b-instruct";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userMessage = body?.userMessage;

    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json({ error: "Invalid user message" }, { status: 400 });
    }

    const apiKey = process.env.FIREWORKS_API_KEY;
    if (!apiKey) {
      console.error("Missing FIREWORKS_API_KEY");
      return NextResponse.json({ error: "Server config error" }, { status: 500 });
    }

    const truncatedMessage =
      userMessage.length > 500 ? userMessage.substring(0, 500) + "..." : userMessage;

    const prompt = `
You are a helpful AI that creates chat titles ONLY.
Generate a short title based on this message:
"${truncatedMessage}"

RULES:
- Exactly **2 to 3 words** folow strictly 
- No punctuation (no . , ! ?)
- No quotes
- No emojis
- No prefix text or explanation
Just output the title ONLY.
    `;

    const payload = {
      model: MODEL,
      prompt,
      max_tokens: 12,
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

    if (!title) title = "New Chat";

    title = title.replace(/[.,!?;:"'(){}[\]-]/g, "").trim();

    const words = title.split(/\s+/).filter(Boolean);
    if (words.length < 2) {
      const fallbackWords = truncatedMessage.split(/\s+/).slice(0, 3);
      title = fallbackWords.join(" ") || "New Chat";
    } else if (words.length > 3) {
      title = words.slice(0, 3).join(" ");
    }

    return NextResponse.json({ title });
  } catch (error) {
    console.error("Chat title generation failed:", error);
    return NextResponse.json({ title: "New Chat" }, { status: 200 });
  }
}