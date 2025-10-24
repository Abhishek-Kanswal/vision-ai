import type { NextRequest } from "next/server";
import { ulid } from "ulid";

export interface AgentResponse {
  name: string;
  content: string;
  sources?: string[];
  rawData: string;
  error?: string;
  status: "success" | "error";
  metadata?: {
    responseTime?: number;
    dataPoints?: number;
    currency?: string;
    sourceCount?: number;
  };
}

export async function POST(req: NextRequest) {
  try {
    const { messages, data } = await req.json();
    const API_KEY = process.env.FIREWORKS_API_KEY;

    if (!Array.isArray(messages) || messages.length === 0)
      return new Response("Error: No messages provided", { status: 400 });
    if (!API_KEY)
      return new Response("Error: Missing Fireworks API key", { status: 500 });

    const userGoal = messages[messages.length - 1]?.content?.trim() || "Default goal";
    console.log("📝 User goal:", userGoal);

    // Router AI
    const routePrompt = [
      {
        role: "system",
        content: `
You are a JSON router for AI assistants.
Agents available:
1. "crypto_agent" → cryptocurrency prices
2. "web_search" → factual lookup
3. "NONE" → answer directly

Always return **ONLY** valid JSON like:
{"agents":["crypto_agent"]}
Never include any text before or after JSON.
`,
      },
      { role: "user", content: userGoal },
    ];

    const routeRes = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: "accounts/fireworks/models/mixtral-8x22b-instruct",
        messages: routePrompt,
        max_tokens: 100,
        temperature: 0,
      }),
    });

    const routeData = await routeRes.json();
    let routerText = routeData?.choices?.[0]?.message?.content || "";
    let selectedAgents: string[] = ["NONE"];
    try {
      const jsonMatch = routerText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        selectedAgents = parsed.agents || ["NONE"];
      }
    } catch (e) {
      console.warn("🧭 Router parse failed:", e, "\nRouter raw output:", routerText);
    }
    console.log("🧭 Router decision:", selectedAgents);

    // Call SAF agents
    const agentResults: AgentResponse[] = await Promise.all(
      selectedAgents.map(async (agentName): Promise<AgentResponse> => {
        if (agentName === "NONE") {
          return { 
            name: "NONE", 
            content: "", 
            rawData: "", 
            status: "success",
            metadata: {}
          };
        }

        const agentUrl = agentName === "crypto_agent"
          ? "http://localhost:8001/assist"
          : "http://localhost:8000/assist";

        const startTime = Date.now();

        try {
          const safRequest = {
            query: { id: ulid(), prompt: userGoal },
            session: {
              processor_id: ulid(),
              activity_id: ulid(),
              request_id: ulid(),
              interactions: [],
            },
          };

          const agentRes = await fetch(agentUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(safRequest),
          });

          let fullContent = "";
          let rawStreamData = "";
          const sources: string[] = [];
          
          if (agentRes.body) {
            const reader = agentRes.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = decoder.decode(value);
              rawStreamData += chunk;
              const lines = chunk.split('\n');
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    if (data.content_type === 'chunked.text' && data.content) {
                      fullContent += data.content;
                      
                      if (agentName === "web_search") {
                        const urlMatches = data.content.match(/https?:\/\/[^\s]+/g);
                        if (urlMatches) {
                          sources.push(...urlMatches);
                        }
                      }
                    }
                  } catch (e) {
                  }
                }
              }
            }
          }

          const responseTime = Date.now() - startTime;

          let metadata: any = { responseTime };
          
          if (agentName === "crypto_agent") {
            const priceMatches = fullContent.match(/\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g);
            if (priceMatches) {
              metadata.dataPoints = priceMatches.length;
              metadata.currency = "USD";
            }
          } else if (agentName === "web_search") {
            metadata.sourceCount = sources.length;
          }

          return {
            name: agentName,
            content: fullContent.trim(),
            sources: sources.length > 0 ? sources : undefined,
            rawData: rawStreamData,
            status: "success",
            metadata
          };
        } catch (err: any) {
          console.error(`❌ Error calling ${agentName}:`, err.message);
          return {
            name: agentName,
            content: "",
            rawData: "",
            error: err.message,
            status: "error",
            metadata: { responseTime: Date.now() - startTime }
          };
        }
      })
    );

    const activeAgents = agentResults.filter(agent => agent.name !== "NONE");
    console.log("🗂 Full Agent results:", JSON.stringify(activeAgents, null, 2));

    const contextData = activeAgents.map(agent => 
      `[${agent.name}]: ${agent.content}`
    ).join("\n");


    // System prompt
    const preparedMessages = [
      {
        role: "system",
        content: `
# PROFESSIONAL AI ASSISTANT PROTOCOL

## IDENTITY & BEHAVIOR
You are an expert AI assistant that provides precise, well-structured, and professional responses.

## CRITICAL RESPONSE STANDARDS
- Always maintain formal, respectful, and professional tone
- Format currency correctly: **$3,767.75** (commas for thousands, two decimal places)
- Present data in clear, organized structures
- Never mention agent sources or technical details

## AVAILABLE CONTEXT DATA
${contextData || "No additional context data available"}

**Remember:** Accuracy, professionalism, and clarity are paramount.
`
      },
      ...messages,
    ];

    const cleanMessages = preparedMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    console.log("🚀 Sending to Fireworks API:", {
      model: data?.model || "accounts/sentientfoundation/models/dobby-unhinged-llama-3-3-70b-new",
      messageCount: cleanMessages.length,
      temperature: data?.temperature ?? 0.7
    });

    // Final AI response
    const finalResponse = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${API_KEY}` 
      },
      body: JSON.stringify({
        model: data?.model || "accounts/sentientfoundation/models/dobby-unhinged-llama-3-3-70b-new",
        messages: cleanMessages,
        max_tokens: 4000,
        temperature: data?.temperature ?? 0.7,
        stream: false, // No streaming
      }),
    });

    if (!finalResponse.ok) {
      const errorText = await finalResponse.text();
      console.error("❌ Fireworks API error details:", {
        status: finalResponse.status,
        statusText: finalResponse.statusText,
        error: errorText
      });
      throw new Error(`Fireworks API error: ${finalResponse.status} - ${finalResponse.statusText}`);
    }

    const finalData = await finalResponse.json();
    console.log("✅ Fireworks API response:", finalData);
    
    const aiContent = finalData.choices?.[0]?.message?.content || "No response generated";

    // Return JSON response
    const responseData = {
      message: aiContent,
      agents: activeAgents,
      timestamp: new Date().toISOString()
    };

    console.log("✅ Final response with agents:", responseData);

    return new Response(JSON.stringify(responseData), {
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      },
    });

  } catch (err: any) {
    console.error("❌ API Error:", err);
    return new Response(
      JSON.stringify({ 
        error: err.message || "Unknown error",
        agents: []
      }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}