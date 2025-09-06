import { type NextRequest, NextResponse } from "next/server"

const imageStore = new Map<string, { data: string; type: string; filename: string }>()

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")
    const dataUrl = `data:${file.type};base64,${base64}`

    // Generate a unique ID for this image
    const imageId = Math.random().toString(36).substring(2, 15)

    // Store the image data
    imageStore.set(imageId, {
      data: base64,
      type: file.type,
      filename: file.name,
    })

    // Return a URL that points to our image serving endpoint
    const imageUrl = `/api/image/${imageId}`

    return NextResponse.json({
      url: imageUrl,
      dataUrl: dataUrl, // Also return data URL for immediate display
      filename: file.name,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}

export { imageStore }
