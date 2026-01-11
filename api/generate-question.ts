import { GoogleGenAI } from '@google/genai';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Question } from '../src/types';

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
    const { answeredQuestions, currentLevel }: { answeredQuestions: Question[]; currentLevel: string } = req.body;

    if (!answeredQuestions || !currentLevel) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Use all answered questions in chronological order
    const conversationHistory = answeredQuestions
      .filter(q => q.status === 'answered')
      .sort((a, b) => {
        const aTime = a.answers[a.answers.length - 1].answeredAt ? new Date(a.answers[a.answers.length - 1].answeredAt).getTime() : 0;
        const bTime = b.answers[b.answers.length - 1].answeredAt ? new Date(b.answers[b.answers.length - 1].answeredAt).getTime() : 0;
        return aTime - bTime;
      })
      .map(q => `Q: ${q.question}\nA: ${q.answers[q.answers.length - 1].answer}`)
      .join('\n\n');

    const prompt = `You are a Dutch language teacher. Assume the student starts at ${currentLevel} level and does not know anything beyond that level.

${conversationHistory ? `Previous conversation:\n${conversationHistory}\n\n` : ''}

Ask them a question in Dutch. They must respond in Dutch. If their response was logical and without errors, ask a question on a teeny tiny bit more advanced topic. If it had errors, ask a question of the same topic/difficulty.

DO NOT ADD ANY TEXT EXCEPT QUESTIONS THEMSELVES. Only output the question, nothing else.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    if (!response.text) {
      throw new Error('No response text from AI');
    }

    const questionText = response.text.trim();

    return res.status(200).json({ question: questionText });
  } catch (error) {
    console.error('Error generating question:', error);
    return res.status(500).json({ error: 'Failed to generate question' });
  }
}
