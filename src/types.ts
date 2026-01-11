export interface Answer {
  answer: string;
  isCorrect: boolean;
  mistakes: string;
  explanation: string;
  answeredAt: string;
}

// Legacy question format (V1)
export interface QuestionV1 {
  id: string;
  status: 'none' | 'asked' | 'answered';
  question: string;
  answer?: string;
  isCorrect?: boolean;
  mistakes?: string;
  explanation?: string;
  questionExplanation?: string;
  contextConversation?: string;
  askedAt?: string;
  answeredAt?: string;
}

// Current question format
export interface Question {
  id: string;
  status: 'none' | 'asked' | 'answered';
  question: string;
  answers: Answer[]; // Array of all answers submitted
  questionExplanation?: string; // Explanation of what the question means
  contextConversation?: string; // Conversation context leading to the question
  askedAt?: string;
}

export interface DailyQuestions {
  [date: string]: {
    askedQuestionIds: string[];
    answeredQuestionIds: string[];
  };
}

export interface UserDocument {
  questions: Question[];
  dailyQuestions: DailyQuestions;
  level: string;
}

export interface ValidationResponse {
  correct: boolean;
  mistakes: string;
  explanation: string;
}
