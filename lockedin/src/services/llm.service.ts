// llm.service.ts
import { GoogleGenerativeAI, GenerateContentRequest } from '@google/generative-ai';
import createServiceLogger from '../core/logger';
import loggerInstance from "../core/logger";
import config from '../core/config';
// TODO: Update the import path below if 'prompt-loader' is located elsewhere
// import { promptLoader } from '../prompt-loader';
import net from 'net';
import https from 'https';


interface LLMResponseMetadata {
  skill: string;
  programmingLanguage?: string | null;
  processingTime: number;
  requestId: number;
  usedFallback: boolean;
  isImageAnalysis?: boolean;
  isTranscriptionResponse?: boolean;
  mimeType?: string;
}

interface LLMResponse {
  response: string;
  metadata: LLMResponseMetadata;
}

interface ConnectivityTest {
  host: string;
  port: number;
  name: string;
}

interface ConnectivityResult extends ConnectivityTest {
  success: boolean;
  error: string | null;
}

class LLMService {
  private client: GoogleGenerativeAI | null = null;
  private model: any = null;
  private isInitialized = false;
  private requestCount = 0;
  private errorCount = 0;
  private logger: Logger;

  constructor() {
    this.logger = loggerInstance.createServiceLogger("LLMService");
    this.initializeClient();
  }

  private initializeClient(): void {
    const apiKey = config.getApiKey('GEMINI');

    if (!apiKey || apiKey === 'your-api-key-here') {
      this.logger.warn('Gemini API key not configured', { 
        keyExists: !!apiKey,
        isPlaceholder: apiKey === 'your-api-key-here'
      });
      return;
    }

    try {
      this.client = new GoogleGenerativeAI(apiKey);
      this.model = this.client.getGenerativeModel({ 
        model: config.get('llm.gemini.model') 
      });
      this.isInitialized = true;
      
      this.logger.info('Gemini AI client initialized successfully', {
        model: config.get('llm.gemini.model')
      });
    } catch (error: any) {
      this.logger.error('Failed to initialize Gemini client', { 
        error: error.message 
      });
    }
  }

  // -------------------------------
  // Public API
  // -------------------------------

  public async processTextWithSkill(
    text: string, 
    activeSkill: string, 
    sessionMemory: string[] = [], 
    programmingLanguage: string | null = null
  ): Promise<LLMResponse> {
    if (!this.isInitialized) {
      throw new Error('LLM service not initialized. Check Gemini API key configuration.');
    }

    const startTime = Date.now();
    this.requestCount++;

    try {
      this.logger.info('Processing text with LLM', {
        activeSkill,
        textLength: text.length,
        hasSessionMemory: sessionMemory.length > 0,
        programmingLanguage: programmingLanguage || 'not specified',
        requestId: this.requestCount
      });

      const geminiRequest = this.buildGeminiRequest(text, activeSkill, sessionMemory, programmingLanguage);

      let response: string;
      try {
        response = await this.executeRequest(geminiRequest);
      } catch (error: any) {
        if (error.message.includes('fetch failed') && config.get('llm.gemini.enableFallbackMethod')) {
          this.logger.warn('Standard request failed, trying alternative method', {
            error: error.message,
            requestId: this.requestCount
          });
          response = await this.executeAlternativeRequest(geminiRequest);
        } else {
          throw error;
        }
      }

      const finalResponse = programmingLanguage
        ? this.enforceProgrammingLanguage(response, programmingLanguage)
        : response;

      this.logger.logPerformance('LLM text processing', startTime, {
        activeSkill,
        textLength: text.length,
        responseLength: finalResponse.length,
        programmingLanguage: programmingLanguage || 'not specified',
        requestId: this.requestCount
      });

      return {
        response: finalResponse,
        metadata: {
          skill: activeSkill,
          programmingLanguage,
          processingTime: Date.now() - startTime,
          requestId: this.requestCount,
          usedFallback: false
        }
      };
    } catch (error: any) {
      this.errorCount++;
      this.logger.error('LLM processing failed', {
        error: error.message,
        activeSkill,
        programmingLanguage: programmingLanguage || 'not specified',
        requestId: this.requestCount
      });

      if (config.get('llm.gemini.fallbackEnabled')) {
        return this.generateFallbackResponse(text, activeSkill);
      }
      
      throw error;
    }
  }

  public updateApiKey(newApiKey: string): void {
    process.env.GEMINI_API_KEY = newApiKey;
    this.isInitialized = false;
    this.initializeClient();
    this.logger.info('API key updated and client reinitialized');
  }

  public getStats() {
    return {
      isInitialized: this.isInitialized,
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      successRate: this.requestCount > 0 ? ((this.requestCount - this.errorCount) / this.requestCount) * 100 : 0,
      config: config.get('llm.gemini')
    };
  }

  // -------------------------------
  // Private Helpers
  // -------------------------------

  private buildGeminiRequest(
    text: string, 
    activeSkill: string, 
    sessionMemory: string[], 
    programmingLanguage: string | null
  ): GenerateContentRequest {
    const requestComponents = promptLoader.getRequestComponents(
      activeSkill, 
      text, 
      sessionMemory,
      programmingLanguage
    );

    const request: GenerateContentRequest = {
      contents: [{
        role: 'user',
        parts: [{ text: this.formatUserMessage(text, activeSkill) }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        topK: 40,
        topP: 0.95
      }
    };

    if (requestComponents.shouldUseModelMemory && requestComponents.skillPrompt) {
      request.systemInstruction = { parts: [{ text: requestComponents.skillPrompt }] };
    }

    return request;
  }

  private formatUserMessage(text: string, activeSkill: string): string {
    return `Context: ${activeSkill.toUpperCase()} analysis request\n\nText to analyze:\n${text}`;
  }

  private enforceProgrammingLanguage(text: string, programmingLanguage: string): string {
    if (!text || !programmingLanguage) return text;

    const fenceTagMap: Record<string, string> = { cpp: 'cpp', c: 'c', python: 'python', java: 'java', javascript: 'javascript', js: 'javascript' };
    const fenceTag = fenceTagMap[programmingLanguage.toLowerCase()] || programmingLanguage.toLowerCase();

    let normalized = text.replace(/```([^\n]*)\n/g, () => '```' + fenceTag + '\n');
    normalized = normalized.replace(/~~~([^\n]*)\n/g, () => '```' + fenceTag + '\n');

    return normalized;
  }

  private async executeRequest(request: GenerateContentRequest): Promise<string> {
    if (!this.model) throw new Error('Gemini model is not initialized');

    const maxRetries = config.get('llm.gemini.maxRetries');
    const timeout = config.get('llm.gemini.timeout');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.performPreflightCheck();

        const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timeout')), timeout));
        const requestPromise = this.model.generateContent(request);
        const result = await Promise.race([requestPromise, timeoutPromise]);

        if (!result.response) throw new Error('Empty response from Gemini API');
        const responseText = result.response.text();
        if (!responseText || responseText.trim().length === 0) throw new Error('Empty text content in Gemini response');

        return responseText.trim();
      } catch (error: any) {
        if (attempt === maxRetries) throw error;
        const delayMs = 1000 * attempt + Math.random() * 1000;
        await new Promise(res => setTimeout(res, delayMs));
      }
    }

    throw new Error('Failed to execute Gemini request after retries');
  }

  private async performPreflightCheck(): Promise<void> {
    try {
      await this.testNetworkConnection({ host: 'generativelanguage.googleapis.com', port: 443, name: 'Gemini API Endpoint' });
    } catch {
      // Preflight check failure is non-blocking
    }
  }

  private async testNetworkConnection({ host, port }: ConnectivityTest): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error(`Connection timeout to ${host}:${port}`));
      }, 5000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(true);
      });

      socket.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`Connection failed to ${host}:${port}: ${err.message}`));
      });

      socket.connect(port, host);
    });
  }

  private generateFallbackResponse(text: string, activeSkill: string): LLMResponse {
    const fallbackResponses: Record<string, string> = {
      'study-helper': 'I was unable to analyze the content. Please try again or ensure your API key is configured correctly.',
      'default': 'I can help analyze this content. Please ensure your Gemini API key is properly configured for detailed analysis.'
    };

    const response = fallbackResponses[activeSkill] || fallbackResponses.default;

    return {
      response,
      metadata: {
        skill: activeSkill,
        processingTime: 0,
        requestId: this.requestCount,
        usedFallback: true
      }
    };
  }

  private async executeAlternativeRequest(request: GenerateContentRequest): Promise<string> {
    const apiKey = config.getApiKey('GEMINI');
    const model = config.get('llm.gemini.model');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const postData = JSON.stringify(request);

    return new Promise((resolve, reject) => {
      const req = https.request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
        timeout: config.get('llm.gemini.timeout')
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            const response = JSON.parse(data);
            const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) return reject(new Error('Empty response text'));
            resolve(text.trim());
          } catch (err: any) {
            reject(err);
          }
        });
      });

      req.on('error', err => reject(err));
      req.write(postData);
      req.end();
    });
  }
}

export default new LLMService();
