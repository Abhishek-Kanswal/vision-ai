import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messages, data } = await req.json();
    const API_KEY = process.env.FIREWORKS_API_KEY;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages provided" }), { status: 400 });
    }
    if (!API_KEY) {
      return new Response(JSON.stringify({ error: "Missing Fireworks API key" }), { status: 500 });
    }

    const preparedMessages = [
      {
        role: "system",
        content: `
# PROFESSIONAL AI ASSISTANT

You are an expert AI assistant. Provide precise, professional, and well-structured responses. 
Always answer clearly and concisely, formatted for Markdown if applicable.
`
      },
      ...messages
    ];

    // Call Fireworks AI API
    const finalResponse = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: data?.model || "accounts/sentientfoundation/models/dobby-unhinged-llama-3-3-70b-new",
        messages: preparedMessages.map(msg => ({ role: msg.role, content: msg.content })),
        max_tokens: data?.max_tokens || 4000,
        temperature: data?.temperature ?? 0.7,
        stream: false,
      }),
    });

    if (!finalResponse.ok) {
      const errorText = await finalResponse.text();
      console.error("❌ Fireworks API error:", finalResponse.status, errorText);
      throw new Error(`Fireworks API error: ${finalResponse.status}`);
    }

    const finalData = await finalResponse.json();
    const aiContent = finalData.choices?.[0]?.message?.content || "No response generated";

    return new Response(JSON.stringify({
      message: aiContent,
      timestamp: new Date().toISOString()
    }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      }
    });

  } catch (err: any) {
    console.error("❌ API Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}