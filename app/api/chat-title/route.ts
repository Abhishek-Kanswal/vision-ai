import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.fireworks.ai/inference/v1/chat/completions";
const MODEL = "accounts/sentientfoundation/models/dobby-unhinged-llama-3-3-70b-new";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const userMessage = body?.userMessage;

    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json({ error: "Invalid user message" }, { status: 400 });
    }

    const apiKey = process.env.FIREWORKS_API_KEY;
    if (!apiKey) {
      console.error("FIREWORK_API_KEY missing");
      return NextResponse.json({ error: "Missing API key" }, { status: 500 });
    }

    const payload = {
      model: MODEL,
      max_tokens: 10, // short, 2-3 words
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content: `Based on this user message, generate a concise 2-3 word chat title:\n"${userMessage}"\nOnly respond with the title, no extra text.`,
        },
      ],
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
      return NextResponse.json({ error: "Fireworks API error" }, { status: response.status });
    }

    const data = await response.json();
    console.log("Fireworks response:", data);

    const title =
      data?.choices?.[0]?.message?.content?.trim() ||
      data?.choices?.[0]?.text?.trim() ||
      "New Chat";

    return NextResponse.json({ title });
  } catch (error) {
    console.error("Error generating chat title:", error);
    return NextResponse.json({ title: "New Chat", error: error.message }, { status: 500 });
  }
}
