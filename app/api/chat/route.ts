import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ulid } from "ulid";
import { createClient } from '@supabase/supabase-js';

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

export interface ROMAResponse {
  content: string;
  projectId: string;
  status: "success" | "error";
  error?: string;
  metadata?: {
    responseTime?: number;
    attempts?: number;
  };
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function withCors(response: Response) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return response;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 200 }));
}

async function validateApiKey(authHeader: string | null): Promise<{ isValid: boolean; keyData?: any }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('❌ No or invalid Authorization header');
    return { isValid: false };
  }

  const apiKey = authHeader.replace('Bearer ', '').trim();
  
  if (!apiKey) {
    console.error('❌ Empty API key');
    return { isValid: false };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .select('id, key_name, is_active, created_at, user_id')
      .eq('key', apiKey)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('❌ Supabase query error:', error);
      return { isValid: false };
    }

    if (!data) {
      console.error('❌ API key not found or inactive');
      return { isValid: false };
    }

    console.log('✅ API key validated for:', data.key_name);
    return { isValid: true, keyData: data };
  } catch (error) {
    console.error('❌ API key validation error:', error);
    return { isValid: false };
  }
}

const MODEL = "accounts/sentientfoundation/models/dobby-unhinged-llama-3-3-70b-new";

const ROMA_CONFIG = {
  TIMEOUT_MS: 5000,
  ENABLED: true,
};

function shouldSkipROMA(query: string): boolean {
  const skipPatterns = [
    /what'?s up/i,
    /hello/i,
    /hi\b/i,
    /hey\b/i,
    /how are you/i,
    /good morning/i,
    /good afternoon/i,
    /good evening/i,
    /\bhey\b/i,
    /greetings/i,
    /how's it going/i,
    /what's new/i
  ];
  
  return skipPatterns.some(pattern => pattern.test(query));
}

async function callROMA(userGoal: string): Promise<ROMAResponse> {
  const startTime = Date.now();

  try {
    console.log("🚀 Starting ROMA project for:", userGoal);

    const createRes = await fetch("http://4.188.80.253:5000/api/projects/configured", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal: userGoal,
        config: {
          profile: { name: "general_agent", displayName: "General Agent" },
          llm: {
            provider: "litellm",
            model: "openrouter/deepseek/deepseek-chat-v3.1:free",
            temperature: 0.0,
            timeout: 30,
            max_retries: 3,
          },
          execution: { max_execution_steps: 3, max_concurrent_nodes: 1, enable_hitl: false },
          cache: { type: "memory" },
        },
        max_steps: 3,
      }),
    });

    if (!createRes.ok) {
      throw new Error(`ROMA create failed with status: ${createRes.status}`);
    }

    const project = await createRes.json();
    const id = project?.project?.id;
    if (!id) throw new Error("ROMA did not return a project ID");

    console.log(`📋 ROMA Project created: ${id}`);

    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      attempts++;
      const res = await fetch(`http://4.188.80.253:5000/api/projects/${id}/load-results`);
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      const results = await res.json();
      const nodes = results?.basic_state?.all_nodes || {};
      const writeTasks = Object.keys(nodes).filter(
        (key) =>
          nodes[key]?.task_type === "WRITE" &&
          nodes[key]?.status === "DONE" &&
          nodes[key]?.full_result?.output_text
      );

      if (writeTasks.length > 0) {
        const finalTask = writeTasks[0];
        const finalText = nodes[finalTask].full_result.output_text;

        const responseTime = Date.now() - startTime;
        return {
          content: finalText,
          projectId: id,
          status: "success",
          metadata: { responseTime, attempts },
        };
      }

      await new Promise((r) => setTimeout(r, 1000));
    }

    throw new Error(`ROMA timeout after ${maxAttempts} attempts`);
  } catch (error: any) {
    console.error("❌ ROMA Error:", error.message);
    return {
      content: "",
      projectId: "",
      status: "error",
      error: error.message,
      metadata: { responseTime: Date.now() - startTime },
    };
  }
}

function startROMABackground(userGoal: string): void {
  if (!ROMA_CONFIG.ENABLED) {
    console.log('⏩ ROMA disabled by configuration');
    return;
  }

  if (shouldSkipROMA(userGoal)) {
    console.log('⏩ Skipping ROMA for casual conversation query');
    return;
  }

  console.log('🎯 Starting ROMA in background (non-blocking)...');
  
  callROMA(userGoal)
    .then(romaData => {
      if (romaData.status === 'success' && romaData.content) {
        console.log('✅ ROMA background completion successful');
        console.log(`📊 ROMA content length: ${romaData.content.length}`);
      } else {
        console.log('❌ ROMA background completed with error:', romaData.error);
      }
    })
    .catch(error => {
      console.log('🔇 ROMA background error (non-blocking):', error.message);
    });
}

function containsContractAddress(text: string): boolean {
  const contractRegex = /0x[a-fA-F0-9]{40}/;
  return contractRegex.test(text);
}

function extractContractAddresses(text: string): string[] {
  const contractRegex = /0x[a-fA-F0-9]{40}/g;
  const matches = text.match(contractRegex);
  return matches || [];
}

function parseCryptoDetailAgentData(rawStreamData: string): string {
  try {
    const lines = rawStreamData.split('\n');
    let analysisContent = '';
    let fullAnalysisFound = false;

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));

          if (data.event_name === 'FULL_ANALYSIS' && data.content_type === 'atomic.json') {
            if (data.content && data.content.analysis) {
              analysisContent = data.content.analysis;
              fullAnalysisFound = true;
              break;
            }
          }

          if (data.content_type === 'chunked.text' && data.content) {
            analysisContent += data.content;
          }
        } catch {
        }
      }
    }

    if (fullAnalysisFound) {
      return analysisContent;
    }

    if (!analysisContent) {
      const analysisMatch = rawStreamData.match(/"analysis":"([^"]+)"/);
      if (analysisMatch) {
        analysisContent = analysisMatch[1].replace(/\\n/g, '\n');
      }
    }

    return analysisContent || 'No analysis content could be extracted from the response.';
  } catch (error) {
    console.error('Error parsing crypto_detail_agent data:', error);
    return 'Error parsing token analysis data.';
  }
}

function parseWebSearchData(rawStreamData: string): { content: string; sources: string[] } {
  try {
    const lines = rawStreamData.split('\n');
    let finalResponse = '';
    let sources: string[] = [];
    let inFinalResponse = false;

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));

          if (data.event_name === 'SOURCES' && data.content_type === 'atomic.json') {
            if (data.content && data.content.results) {
              sources = data.content.results.map((result: any) => result.url);
            }
          }

          if (data.event_name === 'FINAL_RESPONSE' && data.content_type === 'chunked.text' && data.content) {
            finalResponse += data.content;
            inFinalResponse = true;
          }
        } catch {
        }
      }
    }

    return {
      content: finalResponse.trim(),
      sources: sources
    };
  } catch (error) {
    console.error('Error parsing web_search data:', error);
    return { content: '', sources: [] };
  }
}

function parseCryptoAgentData(rawStreamData: string): string {
  try {
    const lines = rawStreamData.split('\n');
    let content = '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.event_name === 'STREAM_RESPONSE' && data.content_type === 'chunked.text' && data.content) {
            content += data.content;
          }
        } catch {
        }
      }
    }

    return content.trim();
  } catch (error) {
    console.error('Error parsing crypto_agent data:', error);
    return '';
  }
}

function parseFormatAgentData(rawStreamData: string): string {
  try {
    const lines = rawStreamData.split('\n');
    let templateContent = '';
    let inTemplateStream = false;

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));

          if (data.event_name === 'TEMPLATE_STREAM' && data.content_type === 'chunked.text' && data.content) {
            templateContent += data.content;
            inTemplateStream = true;
          }

          if (data.event_name === 'COMPLETE_TEMPLATE' && data.content_type === 'atomic.json') {
            if (data.content && data.content.template) {
              templateContent = data.content.template;
              break;
            }
          }
        } catch {
        }
      }
    }

    return templateContent.trim();
  } catch (error) {
    console.error('Error parsing format_agent data:', error);
    return '';
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const authHeader = req.headers.get('Authorization');
    const { isValid, keyData } = await validateApiKey(authHeader);
    
    if (!isValid) {
      return withCors(
        new Response(
          JSON.stringify({
            error: "Unauthorized",
            message: "Invalid or missing API key",
          }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        )
      );
    }

    console.log('🔑 Authenticated request with API key:', keyData?.key_name);

    const body = await req.json();
    const { messages, data } = body;
    const API_KEY = process.env.FIREWORKS_API_KEY;

    console.log("🔍 INCOMING MESSAGES ARRAY:", JSON.stringify(messages, null, 2));
    console.log("📦 INCOMING DATA:", JSON.stringify(data, null, 2));

    if (!Array.isArray(messages) || messages.length === 0)
      return new Response("Error: No messages provided", { status: 400 });
    if (!API_KEY)
      return new Response("Error: Missing Fireworks API key", { status: 500 });

    const lastUserMessage = messages[messages.length - 1];
    const userGoal = lastUserMessage?.content?.trim() || "Default goal";

    console.log("📝 User goal:", userGoal);

    const hasContractAddress = containsContractAddress(userGoal);
    const contractAddresses = extractContractAddresses(userGoal);
    console.log("📄 Contract address detected:", hasContractAddress);
    if (hasContractAddress) console.log("📍 Contract addresses found:", contractAddresses);

    console.log("⚡ Starting Router...");

    const routerRes = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: "accounts/fireworks/models/mixtral-8x22b-instruct",
        messages: [
          {
            role: "system",
            content: `
You are a JSON router for AI assistants.
Agents available:
1. "crypto_agent" → cryptocurrency prices and general crypto info
2. "crypto_detail_agent" → detailed crypto token analysis from contract addresses ${hasContractAddress ? '(ENABLED - contract address detected)' : '(DISABLED - no contract address provided)'}
3. "web_search" → factual lookup ${data?.deepSearch ? '(ENABLED)' : '(DISABLED - deepSearch not true)'}
4. "format_agent" → response formatting and structure
5. "NONE" → answer directly

RULES:
- Use crypto_agent for price queries (BTC, ETH, etc.)
- Use crypto_detail_agent ONLY when contract addresses are detected
- Use web_search ONLY when deepSearch is true AND for factual questions
- Use format_agent for complex responses that need structure

Always return ONLY valid JSON like:
{"agents":["crypto_agent"]}
or {"agents":["crypto_detail_agent"]}
or {"agents":["crypto_agent", "crypto_detail_agent"]}
or {"agents":["format_agent"]}
`,
          },
          { role: "user", content: userGoal },
        ],
        max_tokens: 100,
        temperature: 0,
      }),
    });

    if (!routerRes.ok) {
      throw new Error(`Router API failed with status: ${routerRes.status}`);
    }

    const routerData = await routerRes.json();
    console.log("📡 Router response:", JSON.stringify(routerData, null, 2));

    let routerText = routerData?.choices?.[0]?.message?.content || "";
    let selectedAgents: string[] = ["NONE"];

    try {
      const jsonMatch = routerText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        selectedAgents = parsed.agents || ["NONE"];
      }
    } catch {
      console.warn("Router parse failed, using default NONE");
    }

    if (data?.deepSearch !== true) {
      selectedAgents = selectedAgents.filter((agent) => agent !== "web_search");
    }
    if (!hasContractAddress) {
      selectedAgents = selectedAgents.filter((agent) => agent !== "crypto_detail_agent");
    }

    console.log("🧭 Router decision:", selectedAgents);

    startROMABackground(userGoal);

    const safAgentsPromise = Promise.all(
      selectedAgents.map(async (agentName): Promise<AgentResponse> => {
        if (agentName === "NONE") {
          return { name: "NONE", content: "", rawData: "", status: "success" };
        }

        const agentUrls: { [key: string]: string } = {
          crypto_agent: "http://4.188.80.253:8001/assist",
          web_search: "http://4.188.80.253:8000/assist",
          crypto_detail_agent: "http://4.188.80.253:8003/assist",
          format_agent: "http://4.188.80.253:8002/assist"
        };

        const agentUrl = agentUrls[agentName];
        if (!agentUrl) {
          throw new Error(`Unknown agent: ${agentName}`);
        }

        const startTime = Date.now();

        try {
          let safPrompt = userGoal;

          if (agentName === "crypto_detail_agent") {
            safPrompt = contractAddresses[0] || "No contract address provided";
          }

          console.log(`🧠 ${agentName} prompt:`, safPrompt);

          const safRequest = {
            query: {
              id: ulid(),
              prompt: safPrompt,
            },
            session: {
              processor_id: "Example processor ID",
              activity_id: ulid(),
              request_id: ulid(),
              interactions: [],
            },
          };

          console.log(`🔗 Calling ${agentName} at ${agentUrl}`);
          const agentRes = await fetch(agentUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(safRequest),
          });

          if (!agentRes.ok) {
            throw new Error(`Agent ${agentName} returned status: ${agentRes.status}`);
          }

          let fullContent = "";
          let rawStreamData = "";
          let sources: string[] = [];

          if (agentRes.body) {
            const reader = agentRes.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value);
              rawStreamData += chunk;
            }
          }

          switch (agentName) {
            case "crypto_detail_agent":
              fullContent = parseCryptoDetailAgentData(rawStreamData);
              break;
            case "web_search":
              const webSearchData = parseWebSearchData(rawStreamData);
              fullContent = webSearchData.content;
              sources = webSearchData.sources;
              break;
            case "crypto_agent":
              fullContent = parseCryptoAgentData(rawStreamData);
              break;
            case "format_agent":
              fullContent = parseFormatAgentData(rawStreamData);
              break;
            default:
              fullContent = "No parser available for this agent";
          }

          console.log(`✅ ${agentName} completed with content length: ${fullContent.length}`);
          return {
            name: agentName,
            content: fullContent.trim(),
            sources: sources.length > 0 ? sources : undefined,
            rawData: rawStreamData.substring(0, 500) + '...',
            status: "success",
            metadata: {
              responseTime: Date.now() - startTime,
              sourceCount: sources.length
            },
          };
        } catch (err: any) {
          console.error(`❌ Error calling ${agentName}:`, err.message);
          return {
            name: agentName,
            content: "",
            rawData: "",
            error: err.message,
            status: "error",
            metadata: { responseTime: Date.now() - startTime },
          };
        }
      })
    );

    const agentResults = await safAgentsPromise;
    const activeAgents = agentResults.filter((a) => a.name !== "NONE");

    console.log(`✅ SAF agents completed: ${activeAgents.map((a) => a.name).join(", ")}`);

    const formatAgent = agentResults.find((a) => a.name === "format_agent");
    const formatTemplate = formatAgent?.content?.trim() || "";
    console.log("📋 Format template content length:", formatTemplate.length);

    const contextData = [
      ...activeAgents
        .filter((a) => a.name !== "format_agent")
        .map((a) => `## ${a.name.toUpperCase()} RESULTS\n${a.content}`),
    ]
      .filter(Boolean)
      .join("\n\n");

    const systemContent = `
# PROFESSIONAL AI ASSISTANT

${formatTemplate ? `STRICTLY follow this response template:\n${formatTemplate}` : "Provide a helpful and professional response."}

## AVAILABLE CONTEXT DATA
${contextData || "No specific context available."}

##OWNER
You are VisionAI.

You were created by ImmyGlow (abhhishekop09 on Discord). 

You operate using multiple internal agents and components:
- Dobby AI model
- ROMA
- crypto_agent built on the Sentient Agent Framework

You may publicly state this information when introducing yourself or when relevant to the conversation.

## INSTRUCTIONS
- Synthesize information from all available sources
- Provide accurate, helpful responses
- If using crypto data, ensure accuracy
- Cite sources when appropriate
`.trim();

    const finalMessages = [
      { role: "system", content: systemContent },
      { role: "user", content: userGoal },
    ];

    console.log("🚀 Sending to Fireworks API...");

    const finalResponse = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: finalMessages,
        max_tokens: 4000,
        temperature: 0.3,
        stream: false,
      }),
    });

    if (!finalResponse.ok) {
      throw new Error(`Final API call failed: ${finalResponse.status}`);
    }

    const finalData = await finalResponse.json();
    const aiContent = finalData.choices?.[0]?.message?.content || "No AI response generated.";

    const totalTime = Date.now() - startTime;
    console.log(`✅ Request completed in ${totalTime}ms`);

    const successResponse = new Response(
      JSON.stringify({
        message: aiContent,
        agents: activeAgents,
        roma: { status: "processing_in_background" },
        deepSearch: data?.deepSearch === true,
        contractAddressDetected: hasContractAddress,
        contractAddresses,
        processingTime: totalTime,
        timestamp: new Date().toISOString(),
      }),
      { headers: { "Content-Type": "application/json" } }
    );

    return withCors(successResponse);

  } catch (error: any) {
    console.error("❌ Main POST error:", error);
    const errorResponse = new Response(
      JSON.stringify({
        error: error.message,
        message: "An error occurred while processing your request.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );

    return withCors(errorResponse);
  }
}