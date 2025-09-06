import { type NextRequest, NextResponse } from "next/server"
import { imageStore } from "../../upload/route"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const imageData = imageStore.get(params.id)

    if (!imageData) {
      return new NextResponse("Image not found", { status: 404 })
    }

    // Convert base64 back to buffer
    const buffer = Buffer.from(imageData.data, "base64")

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": imageData.type,
        "Content-Length": buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("Error serving image:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
