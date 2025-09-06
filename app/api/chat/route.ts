// app/api/chat/route.ts
import type { NextRequest } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { messages, data } = await req.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response("Error: No messages provided", { status: 400 })
    }

    // Model selection
    const MODEL = "accounts/sentientfoundation/models/dobby-unhinged-llama-3-3-70b-new"
    const deepSearch = !!data?.deepSearch
    const attachmentsText = data?.attachmentsText
    const imageData = data?.image
    const model = MODEL // Declare the model variable

    const prepared = messages.map((message) => ({
      role: message.role,
      content: message.content,
      // Remove image property to prevent API error
    }))

    if (imageData?.url && prepared.length > 0) {
      const lastMessage = prepared[prepared.length - 1]
      if (lastMessage?.role === "user") {
        lastMessage.content = `${lastMessage.content}\n\n[Image: ${imageData.url}]\nPlease analyze this image and respond accordingly.`
      }
    }

    if (attachmentsText?.trim() && prepared.length > 0) {
      const lastMessage = prepared[prepared.length - 1]
      if (lastMessage?.role === "user") {
        lastMessage.content = `${lastMessage.content}\n\n[Attachment: ${attachmentsText}]`
      }
    }

    // API key check
    const API_KEY = process.env.FIREWORKS_API_KEY
    if (!API_KEY) {
      return new Response("Error: Missing Fireworks API key", { status: 500 })
    }

    const response = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: prepared,
        max_tokens: data?.max_tokens ?? 1000,
        temperature: data?.temperature ?? 0.7,
        top_p: data?.top_p ?? 0.9,
        presence_penalty: data?.presence_penalty ?? 0,
        frequency_penalty: data?.frequency_penalty ?? 0,
        stream: true,
      }),
    })

    // Unauthorized / API errors
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      if (response.status === 401) {
        return new Response("Error: Unauthorized — check your FIREWORKS_API_KEY", { status: 401 })
      }
      return new Response(`Error: ${errorText || response.statusText}`, { status: response.status })
    }

    // Stream response
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const stream = new ReadableStream({
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
              const data = line.slice(6).trim()
              if (data === "[DONE]") {
                controller.close()
                return
              }
              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content
                if (content) controller.enqueue(encoder.encode(content))
              } catch {
                // skip malformed lines
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
