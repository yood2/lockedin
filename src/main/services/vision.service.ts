import { GoogleGenerativeAI } from '@google/generative-ai'

const focusPrompt = `
You are classifying webcam images for study focus.

Rules:
- If eyes are closed, or looking away from the screen, or looking at a phone, then not focused.
- The camera may be mirrored.
- "user_activity" must summarize the main activity (≤ 3 words), lowercase, no punctuation. Examples: "watch phone", "look away", "eyes closed", "study screen".

Output STRICT JSON only, no prose:
{"focused": <true|false>, "user_activity": "<≤3 words>"}
Give the app that I am currently using as the "current_app" and the activity I'm interacting with the app as the "current_activity".
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

export const checkFocusWithVision = async (
  imageDataUrl: string
): Promise<{ focused: boolean; user_activity: string }> => {
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
    const text = response.text().trim()

    // Try to parse strict JSON first
    try {
      const parsed = JSON.parse(text)
      const focused = Boolean(parsed?.focused)
      let userActivity = typeof parsed?.user_activity === 'string' ? parsed.user_activity : ''
      
      // If not focused but no activity provided, use a default
      if (!focused && !userActivity) {
        userActivity = 'other activity'
      }
      
      return { focused, user_activity: userActivity }
    } catch (_) {
      // Fallback: accept plain true/false responses
      const lowered = text.toLowerCase()
      const focused = lowered === 'true'
      return { focused, user_activity: focused ? 'study screen' : 'other activity' }
    }
  } catch (error) {
    console.error('Error checking focus with Vision API:', error)
    // Default to focused on error to avoid unnecessary interruption
    return { focused: true, user_activity: 'study screen' }
  }
}
