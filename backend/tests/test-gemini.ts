import 'dotenv/config';
import { env } from './src/config/env';
import axios from 'axios';

async function testGemini(modelName: string) {
  const model = encodeURIComponent(modelName);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
  try {
    const response = await axios.post(
      url,
      { contents: [{ role: 'user', parts: [{ text: 'Hi' }] }] },
      { timeout: 10000 }
    );
    console.log(modelName, 'Success');
  } catch (error: any) {
    if (error.response) {
      console.error(modelName, error.response.status, error.response.data?.error?.message || error.message);
    } else {
      console.error(modelName, error.message);
    }
  }
}

async function run() {
  await testGemini('gemini-1.5-flash');
  await testGemini('gemini-1.5-flash-latest');
  await testGemini('gemini-pro');
  await testGemini('gemini-1.5-pro');
}
run();
