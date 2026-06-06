import 'dotenv/config';
import { env } from './src/config/env';
import axios from 'axios';

async function testGemini(modelName: string) {
  const model = encodeURIComponent(modelName);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
  try {
    const response = await axios.post(
      url,
      { contents: [{ role: 'user', parts: [{ text: 'Respond with OK' }] }] },
      { timeout: 10000 }
    );
    console.log(modelName, 'Success');
  } catch (error: any) {
    if (error.response) {
      console.error(modelName, error.response.status, error.response.data?.error?.message || error.response.data);
    } else {
      console.error(modelName, error.message);
    }
  }
}

async function run() {
  await testGemini('gemini-2.5-flash');
}
run();
