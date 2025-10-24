import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.fireworks.ai/inference/v1/chat/completions";
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

    const truncatedMessage = userMessage.length > 500 
      ? userMessage.substring(0, 500) + "..." 
      : userMessage;

    const payload = {
      model: MODEL,
      max_tokens: 25,
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content: "You are an AI that generates short, catchy chat titles (2-5 words) based on the user's first message. Respond only with the title, no punctuation, quotes, or explanations.",
        },
        {
          role: "user",
          content: truncatedMessage,
        },
      ],
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Fireworks API error:", response.status, errorText);
      return NextResponse.json({ error: "AI service unavailable" }, { status: 502 });
    }

    const data = await response.json();

    let title = data?.choices?.[0]?.message?.content?.trim() ||
                data?.choices?.[0]?.text?.trim();

    if (title) {
      title = title.replace(/^["']|["']$/g, '').trim();
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