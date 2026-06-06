import 'dotenv/config';
import { env } from './src/config/env';
import axios from 'axios';

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${env.GEMINI_API_KEY}`;
  try {
    const response = await axios.get(url, { timeout: 10000 });
    console.log('Success:', response.data.models?.map((m: any) => m.name));
  } catch (error: any) {
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

listModels();
