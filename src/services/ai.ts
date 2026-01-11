import { Question, ValidationResponse } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';

export async function generateQuestion(
    answeredQuestions: Question[],
    currentLevel: string
): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/generate-question`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            answeredQuestions,
            currentLevel,
        }),
    });

    if (!response.ok) {
        let errorMessage = 'Failed to generate question';
        try {
            const error = await response.json();
            errorMessage = error.error || errorMessage;
        } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.question;
}

export async function validateAnswer(
    question: string,
    answer: string
): Promise<ValidationResponse> {
    const response = await fetch(`${API_BASE_URL}/validate-answer`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            question,
            answer,
        }),
    });

    if (!response.ok) {
        let errorMessage = 'Failed to validate answer';
        try {
            const error = await response.json();
            errorMessage = error.error || errorMessage;
        } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
    }

    const data = await response.json();
    return {
        correct: data.correct,
        mistakes: data.mistakes || 'none',
        explanation: data.explanation,
    };
}

export async function generateContext(
    question: string,
    level: string
): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/generate-context`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            question,
            level,
        }),
    });

    if (!response.ok) {
        let errorMessage = 'Failed to generate context';
        try {
            const error = await response.json();
            errorMessage = error.error || errorMessage;
        } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.conversation;
}

export async function explainQuestion(
    question: string,
    level: string
): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/explain-question`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            question,
            level,
        }),
    });

    if (!response.ok) {
        let errorMessage = 'Failed to explain question';
        try {
            const error = await response.json();
            errorMessage = error.error || errorMessage;
        } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.explanation;
}
