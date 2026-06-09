import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

async function listModels() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY || "");
    // List models is not directly available in the client SDK easily without the right call
    // But we can try to hit the endpoint or use the correct method if available.
    // Actually, in @google/generative-ai, listModels is not a method on genAI.

    // Let's try to just use "gemini-1.5-flash" but check if there is an issue with the API key
    console.log("API Key exists:", !!process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY);
  } catch (e) {
    console.error(e);
  }
}

listModels();
