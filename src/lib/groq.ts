import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(apiKey: string): GoogleGenerativeAI {
  if (!genAI || genAI['apiKey'] !== apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export async function groqChat(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  apiKey: string,
  model = 'gemini-2.0-flash'
): Promise<string> {
  const gen = getGenAI(apiKey);
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: 'user',
      parts: [{ text: m.content }],
    }));

  // Prepend system prompt as a user message if present
  const systemMsg = messages.find(m => m.role === 'system');
  if (systemMsg) {
    contents.unshift({
      role: 'user',
      parts: [{ text: `SYSTEM INSTRUCTIONS: ${systemMsg.content}` }],
    });
  }

  const generation = await gen.getGenerativeModel({ model }).generateContent({
    contents,
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 512,
    },
  });

  const response = generation.response;
  return response.text();
}
