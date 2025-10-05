import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import * as fs from 'fs'
import * as path from 'path'

// Load API key from environment variables for security.
// Ensure you have a .env file with GEMINI_API_KEY="your_api_key"
// and are using a library like 'dotenv' (e.g., `require('dotenv').config()`) in your app's entry point.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

/**
 * A service to analyze screenshots using the Gemini API based on a given prompt and user intention.
 */
class GeminiAnalysisService {
  private model: any // Using 'any' for simplicity, replace with specific Gemini model type if available
  public isInitialized = false

  constructor() {
    if (!GEMINI_API_KEY) {
      console.error('Gemini API key is not set in environment variables.')
      return
    }

    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
      this.model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash', // Use a model that supports multimodal input (text and image)
        // Safety settings can be adjusted to be less restrictive if needed
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE
          }
        ]
      })
      this.isInitialized = true
      console.log('Gemini Analysis Service initialized successfully.')
    } catch (error) {
      console.error('Failed to initialize Gemini client:', error)
    }
  }

  /**
   * Analyzes a screenshot to determine if the user is on task.
   *
   * @param agentPrompt The system prompt that defines the AI's behavior and response rules.
   * @param userIntention The specific task the user is supposed to be focusing on.
   * @param screenshotBuffer A Buffer containing the image data of the screenshot (e.g., from a PNG file).
   * @returns A promise that resolves to the AI's text response.
   */
  public async analyzeScreenshot(
    agentPrompt: string,
    userIntention: string,
    screenshotBuffer: Buffer
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Gemini service is not initialized. Check your API key.')
    }
    if (!screenshotBuffer || screenshotBuffer.length === 0) {
      throw new Error('Screenshot buffer is empty or invalid.')
    }

    // 1. Prepare the image data for the API call.
    const imageParts = [
      {
        inlineData: {
          data: screenshotBuffer.toString('base64'),
          mimeType: 'image/png'
        }
      }
    ]

    // 2. Create the explicit instruction for the model.
    // This tells the model to perform OCR and then use the user's intention.
    const instructionText = `The user's current task is: "${userIntention}". First, perform OCR on the following image to extract all of its text. Then, using that extracted text, follow your system prompt's rules to determine if the user is on task.`

    // 3. Construct the full request with all three components.
    const request = {
      // The first part: The agent's core behavior prompt
      systemInstruction: {
        parts: [{ text: agentPrompt }]
      },
      contents: [
        {
          role: 'user',
          parts: [
            // The second part: The user's intention (as text)
            { text: instructionText },
            // The third part: The screenshot (as an image)
            ...imageParts
          ]
        }
      ]
    }

    try {
      console.log('Sending request to Gemini API...')
      const result = await this.model.generateContent(request)
      const response = result.response
      const textResponse = response.text()
      console.log('Gemini API response received:', textResponse)
      return textResponse
    } catch (error) {
      console.error('Error calling Gemini API:', error)
      throw new Error('Failed to get a response from the Gemini API.')
    }
  }
}


// Exportable function for use in index.ts
const agentPrompt = fs.readFileSync(
  path.join(__dirname, '../../prompts/study-helper.md'),
  'utf-8'
);

const analyzer = new GeminiAnalysisService();

/**
 * Analyze a screenshot using Gemini API and return the response.
 * @param screenshotBuffer Buffer containing the screenshot image (PNG)
 * @param sessionIntention The user's current intention/task
 * @returns Promise<string> Gemini API response
 */
export async function analyzeScreenshotWithGemini(screenshotBuffer: Buffer, sessionIntention: string): Promise<string> {
  if (!analyzer.isInitialized) {
    throw new Error('Gemini service is not initialized. Check your API key.');
  }
  return analyzer.analyzeScreenshot(agentPrompt, sessionIntention, screenshotBuffer);
}