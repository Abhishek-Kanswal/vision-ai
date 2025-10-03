// app/api/chat/route.ts
import type { NextRequest } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { messages, data } = await req.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response("Error: No messages provided", { status: 400 })
    }

    const userGoal = messages[messages.length - 1]?.content || "Default goal"

    const API_KEY = process.env.FIREWORKS_API_KEY
    if (!API_KEY) {
      return new Response("Error: Missing Fireworks API key", { status: 500 })
    }

    // --- Helper: Stream Fireworks output ---
    const streamFireworks = async (preparedMessages: any[]) => {
      const response = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: data?.model || "accounts/sentientfoundation/models/dobby-unhinged-llama-3-3-70b-new",
          messages: preparedMessages,
          max_tokens: data?.max_tokens ?? 1000,
          temperature: data?.temperature ?? 0.7,
          top_p: data?.top_p ?? 0.9,
          presence_penalty: data?.presence_penalty ?? 0,
          frequency_penalty: data?.frequency_penalty ?? 0,
          stream: true,
        }),
      })

      const encoder = new TextEncoder()
      const decoder = new TextDecoder()

      return new ReadableStream({
        async start(controller) {
          const reader = response.body?.getReader()
          if (!reader) {
            controller.close()
            return
          }

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              const chunk = decoder.decode(value, { stream: true })
              const lines = chunk.split("\n")

              for (const line of lines) {
                if (!line.startsWith("data: ")) continue
                const dataLine = line.slice(6).trim()
                if (dataLine === "[DONE]") {
                  controller.close()
                  return
                }
                try {
                  const parsed = JSON.parse(dataLine)
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) controller.enqueue(encoder.encode(content))
                } catch {
                  // ignore malformed chunks
                }
              }
            }
          } catch (err) {
            controller.error(err)
          } finally {
            reader.releaseLock()
          }
        },
      })
    }

    // --- Skip ROMA if message too short ---
    if (userGoal.trim().length < 6) {
      console.log("Skipping ROMA: message too short")
      const stream = await streamFireworks(messages)
      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      })
    }

    // --- Step 1: Create ROMA project ---
    const romaResponse = await fetch(
      "https://roma-app-latest.onrender.com/api/projects/configured",
      {
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
            execution: {
              max_execution_steps: 3,
              max_concurrent_nodes: 1,
              enable_hitl: false,
            },
            cache: { type: "memory" },
          },
          max_steps: 3,
        }),
      }
    )

    if (!romaResponse.ok) {
      const errorText = await romaResponse.text()
      return new Response(`ROMA Error: ${errorText}`, { status: romaResponse.status })
    }

    const romaData = await romaResponse.json()
    console.log("ROMA raw response:", romaData)

    const projectId = romaData.project?.id
    if (!projectId) {
      return new Response(
        `ROMA Error: No project_id returned. Raw: ${JSON.stringify(romaData)}`,
        { status: 500 }
      )
    }
    console.log("Created ROMA project:", projectId)

    // --- Step 2: Poll ROMA project until completed or timeout ---
    const maxWait = 10000 // 10 seconds
    const pollInterval = 2000 // 2 seconds
    const start = Date.now()

    let projectStatus: any = null
    while (Date.now() - start < maxWait) {
      const statusRes = await fetch(
        `https://roma-app-latest.onrender.com/api/projects/${projectId}`
      )
      if (statusRes.ok) {
        projectStatus = await statusRes.json()
        if (projectStatus?.metadata?.completion_status === "COMPLETED") break
      }
      await new Promise((r) => setTimeout(r, pollInterval))
    }

    // --- Step 3: Get final results (nodes) ---
    const resultsRes = await fetch(
      `https://roma-app-latest.onrender.com/api/projects/${projectId}/load-results`
    )
    let resultsData: any = {}
    if (resultsRes.ok) {
      resultsData = await resultsRes.json()
    }

    const romaSummary = JSON.stringify(resultsData, null, 2)

    // --- Step 4: Forward to Fireworks with ROMA context ---
    const preparedMessages = [
  {
    role: "system",
    content: `You are a helpful coding assistant. 

🔑 Rules:
- ALWAYS format your responses in **valid Markdown**.
- Use proper fenced code blocks (\`\`\`js, \`\`\`tsx, \`\`\`bash, etc).
- Do NOT leave code blocks open.
- Clean up responses so they run correctly (especially React code).
- Present answers like tutorials: headings, bold, steps, and working code.

⚠️ Important:
Here is ROMA's raw reasoning (context only, DO NOT show this to the user):
${romaSummary}
`
  },
  ...messages,
]
    const stream = await streamFireworks(preparedMessages)
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    })
  } catch (err: any) {
    return new Response(`Error: ${err.message || "Unknown error"}`, { status: 500 })
  }
}