import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { env } from './src/config/env';

async function testGenAI() {
  try {
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: 'Respond with OK',
    });
    console.log(response.text);
  } catch (err: any) {
    console.error(err);
  }
}

testGenAI();
