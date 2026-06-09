import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the root directory
dotenv.config({ path: path.join(process.cwd(), '.env') });

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY || '';

async function listModels() {
    if (!API_KEY) {
        console.error('API KEY MISSING');
        return;
    }
    const genAI = new GoogleGenerativeAI(API_KEY);
    try {
        // The SDK doesn't have a direct listModels in the main export for generated content
        // usually we'd use the admin API or just try a few names.
        // But we can try a fetch to the REST endpoint directly.
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error listing models:', e);
    }
}

listModels();
