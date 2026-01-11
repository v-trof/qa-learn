import { GoogleGenAI } from '@google/genai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY || '',
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { question, level }: { question: string; level: string } = req.body;

    if (!question || !level) {
      return res.status(400).json({ error: 'Missing question or level' });
    }

    const prompt = `Explain this Dutch language question to a person with level ${level}. If possible, do it in Dutch. If their level is too low to explain this question in Dutch, use English instead.

Question: ${question}

Provide a clear explanation that helps them understand what is being asked.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    if (!response.text) {
      throw new Error('No response text from AI');
    }

    const explanation = response.text.trim();

    return res.status(200).json({ explanation });
  } catch (error) {
    console.error('Error explaining question:', error);
    return res.status(500).json({ error: 'Failed to explain question' });
  }
}
