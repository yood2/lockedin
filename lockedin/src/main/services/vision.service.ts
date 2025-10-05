import { GoogleGenerativeAI } from '@google/generative-ai'

const focusPrompt = `
Is this person focused on studying? They should be looking at their screen, preferably at the center.
If their eyes are closed, they are not studying. If they are looking away from the screen, they are not studying.
If they are on their phone, they are not studying. The user's camera may be mirrored.

Respond with only the word "true" or "false".
`

let genAI: GoogleGenerativeAI | null = null

const initialize = () => {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in the environment variables.')
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
}

function dataUrlToGcsPart(dataUrl: string): { inlineData: { mimeType: string; data: string } } {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/)
  if (!match) {
    throw new Error('Invalid data URL format')
  }
  return {
    inlineData: {
      mimeType: match[1],
      data: match[2]
    }
  }
}

export const checkFocusWithVision = async (imageDataUrl: string): Promise<boolean> => {
  initialize()
  if (!genAI) {
    throw new Error('Generative AI SDK not initialized.')
  }

  try {
    // Switch to a supported multimodal model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const imagePart = dataUrlToGcsPart(imageDataUrl)

    const result = await model.generateContent([focusPrompt, imagePart])
    const response = await result.response
    const text = response.text().trim().toLowerCase()

    return text === 'true'
  } catch (error) {
    console.error('Error checking focus with Vision API:', error)
    // In case of an error, default to assuming the user is focused
    // to avoid penalizing them for API or network issues.
    return true
  }
}
