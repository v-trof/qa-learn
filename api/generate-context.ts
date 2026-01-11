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

    const prompt = `You are a Dutch language teacher. Generate a short conversation (3-5 exchanges) in Dutch that leads up to asking this question: "${question}"

The conversation should:
- Be appropriate for ${level} level
- Be natural and realistic
- End with the question being asked
- NOT include the answer to the question

Format the conversation as following markdown:
Person A: [dialogue]

Person B: [dialogue]

Person A: [dialogue]
etc.

Make it feel like a natural conversation that would lead to asking this question.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    if (!response.text) {
      throw new Error('No response text from AI');
    }

    const conversation = response.text.trim();

    return res.status(200).json({ conversation });
  } catch (error) {
    console.error('Error generating context:', error);
    return res.status(500).json({ error: 'Failed to generate context' });
  }
}
