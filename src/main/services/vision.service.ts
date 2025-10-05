import { GoogleGenerativeAI } from '@google/generative-ai'

const focusPrompt = `
You are classifying webcam images for study focus.

Rules:
- If eyes are closed, or looking away from the screen, or looking at a phone, then not focused.
- The camera may be mirrored.
- "user_activity" must summarize the main activity (≤ 3 words), lowercase, no punctuation. Examples: "watch phone", "look away", "eyes closed", "study screen".

Output STRICT JSON only, no prose:
{"focused": <true|false>, "user_activity": "<≤3 words>", "current_app": "<app name>", "current_activity": "<activity description>"}
- "current_app" should be the name of the application currently in focus (e.g., "Chrome Browser", "Visual Studio Code", "Terminal", "Other")
- "current_activity" should describe what the user is doing with that app (e.g., "browsing social media", "coding", "reading", "watching video")
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
): Promise<{ 
  focused: boolean; 
  user_activity: string; 
  current_app?: string; 
  current_activity?: string;
}> => {
  console.log('🔍 [VISION SERVICE] Starting focus check...')
  console.log('📷 [VISION SERVICE] Image data URL length:', imageDataUrl.length)
  
  initialize()
  if (!genAI) {
    throw new Error('Generative AI SDK not initialized.')
  }

  try {
    console.log('🤖 [VISION SERVICE] Using model: gemini-2.5-flash')
    // Switch to a supported multimodal model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const imagePart = dataUrlToGcsPart(imageDataUrl)
    console.log('📤 [VISION SERVICE] Sending request to Gemini API...')

    const result = await model.generateContent([focusPrompt, imagePart])
    const response = await result.response
    const text = response.text().trim()
    
    console.log('📥 [VISION SERVICE] Raw AI response:', text)

    // Clean the response text by removing markdown code blocks if present
    let cleanedText = text.trim()
    if (cleanedText.startsWith('```json') && cleanedText.endsWith('```')) {
      cleanedText = cleanedText.slice(7, -3).trim() // Remove ```json and ```
      console.log('🧹 [VISION SERVICE] Cleaned response (removed markdown):', cleanedText)
    } else if (cleanedText.startsWith('```') && cleanedText.endsWith('```')) {
      cleanedText = cleanedText.slice(3, -3).trim() // Remove ``` and ```
      console.log('🧹 [VISION SERVICE] Cleaned response (removed markdown):', cleanedText)
    }

    // Try to parse strict JSON first
    try {
      const parsed = JSON.parse(cleanedText)
      console.log('✅ [VISION SERVICE] Successfully parsed JSON:', parsed)
      
      const focused = Boolean(parsed?.focused)
      let userActivity = typeof parsed?.user_activity === 'string' ? parsed.user_activity : ''
      const currentApp = typeof parsed?.current_app === 'string' ? parsed.current_app : undefined
      const currentActivity = typeof parsed?.current_activity === 'string' ? parsed.current_activity : undefined

      // Debug logging for AI response fields
      console.log('🔍 [VISION SERVICE] Parsed fields:', {
        focused: parsed?.focused,
        user_activity: parsed?.user_activity,
        current_app: parsed?.current_app,
        current_activity: parsed?.current_activity
      })
      
      // If not focused but no activity provided, use a default
      if (!focused && !userActivity) {
        userActivity = 'other activity'
        console.log('⚠️ [VISION SERVICE] No activity provided for unfocused state, using default')
      }
      
      const finalResult = { 
        focused, 
        user_activity: userActivity,
        current_app: currentApp,
        current_activity: currentActivity
      }
      
      console.log('🎯 [VISION SERVICE] Final result:', finalResult)
      console.log('📱 [VISION SERVICE] Current App:', currentApp || 'Not detected')
      console.log('🎮 [VISION SERVICE] Current Activity:', currentActivity || 'Not detected')
      
      return finalResult
    } catch (parseError) {
      console.log('❌ [VISION SERVICE] JSON parse failed, trying fallback parsing')
      console.log('🔧 [VISION SERVICE] Parse error:', parseError)
      
      // Fallback: accept plain true/false responses
      const lowered = text.toLowerCase()
      const focused = lowered === 'true'
      const fallbackResult = { 
        focused, 
        user_activity: focused ? 'study screen' : 'other activity',
        current_app: undefined,
        current_activity: undefined
      }
      
      console.log('🔄 [VISION SERVICE] Fallback result:', fallbackResult)
      return fallbackResult
    }
  } catch (error) {
    console.error('💥 [VISION SERVICE] Error checking focus with Vision API:', error)
    console.error('📋 [VISION SERVICE] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
    // Default to focused on error to avoid unnecessary interruption
    const errorResult = { 
      focused: true, 
      user_activity: 'study screen',
      current_app: undefined,
      current_activity: undefined
    }
    console.log('🛡️ [VISION SERVICE] Returning safe default due to error:', errorResult)
    return errorResult
  }
}
