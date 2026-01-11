import { GoogleGenAI } from '@google/genai';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY || '',
});

const validationSchema = z.object({
  correct: z.boolean().describe('Whether the answer is correct'),
  mistakes: z.string().describe('List of mistakes found in the answer, or "none" if correct'),
  explanation: z.string().describe('Explanation of the mistakes or why the answer is correct'),
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { question, answer }: { question: string; answer: string } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: 'Missing question or answer' });
    }

    const prompt = `You are a Dutch language teacher evaluating a student's answer. You only see the question and the student's answer.

Question: ${question}
Student's Answer: ${answer}

Evaluate the answer carefully:
- If the answer is logical and correct in meaning AND grammar, mark correct: true
- If there are only minor typos (spelling mistakes that don't change meaning, like "goed" vs "gooed"), mark correct: true BUT mention the typo in the explanation
- If there are meaning errors, grammar errors, or significant mistakes, mark correct: false

Respond with:
- correct: true if the answer is logical and without meaning/grammar errors (minor typos are acceptable), false otherwise
- mistakes: list of specific mistakes found (including typos if any), or "none" if completely correct
- explanation: detailed explanation. If there are only minor typos, mention them but confirm the answer is correct overall`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: validationSchema.toJSONSchema(),
      },
    });

    if (!response.text) {
      throw new Error('No response text from AI');
    }

    const result = JSON.parse(response.text);

    return res.status(200).json({
      correct: result.correct,
      mistakes: result.mistakes || 'none',
      explanation: result.explanation,
    });
  } catch (error) {
    console.error('Error validating answer:', error);
    return res.status(500).json({ error: 'Failed to validate answer' });
  }
}
