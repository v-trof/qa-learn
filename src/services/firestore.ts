import {
  doc,
  getDoc,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserDocument, Question, QuestionV1, Answer } from '../types';

// Remove undefined values from object (Firestore doesn't accept undefined)
function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key as keyof T] = value;
    }
  }
  return cleaned;
}

// Type guard to check if question is in old format (QuestionV1)
function isQuestionV1(question: Question | QuestionV1): question is QuestionV1 {
  // New format has answers as a required array property
  // Old format doesn't have answers or has it as undefined
  return !('answers' in question) || (question as any).answers === undefined || !Array.isArray((question as any).answers);
}

// Migration: Convert old format (QuestionV1) to new format (Question)
function migrateQuestion(question: Question | QuestionV1): Question {
  // Check if already in new format (has answers array)
  if (!isQuestionV1(question)) {
    return question;
  }

  // It's in old format (QuestionV1), migrate it
  const oldQuestion = question;

  // If has old format answer fields, migrate them
  if (oldQuestion.answer && oldQuestion.answeredAt) {
    const migratedAnswer: Answer = {
      answer: oldQuestion.answer,
      isCorrect: oldQuestion.isCorrect ?? false,
      mistakes: oldQuestion.mistakes || 'none',
      explanation: oldQuestion.explanation || '',
      answeredAt: oldQuestion.answeredAt,
    };

    // Remove undefined values to avoid Firestore errors
    const migrated: Question = {
      id: oldQuestion.id,
      status: oldQuestion.status,
      question: oldQuestion.question,
      answers: [migratedAnswer],
    };

    if (oldQuestion.questionExplanation) {
      migrated.questionExplanation = oldQuestion.questionExplanation;
    }
    if (oldQuestion.contextConversation) {
      migrated.contextConversation = oldQuestion.contextConversation;
    }
    if (oldQuestion.askedAt) {
      migrated.askedAt = oldQuestion.askedAt;
    }

    return migrated;
  }

  // No answer yet, create new format with empty answers array
  // Remove undefined values to avoid Firestore errors
  const migrated: Question = {
    id: oldQuestion.id,
    status: oldQuestion.status,
    question: oldQuestion.question,
    answers: [],
  };

  if (oldQuestion.questionExplanation) {
    migrated.questionExplanation = oldQuestion.questionExplanation;
  }
  if (oldQuestion.contextConversation) {
    migrated.contextConversation = oldQuestion.contextConversation;
  }
  if (oldQuestion.askedAt) {
    migrated.askedAt = oldQuestion.askedAt;
  }

  return migrated;
}

function migrateUserDocument(doc: { questions: (Question | QuestionV1)[]; dailyQuestions: any; level: string }): UserDocument {
  return {
    questions: doc.questions.map(migrateQuestion),
    dailyQuestions: doc.dailyQuestions,
    level: doc.level,
  };
}

export async function getUserDocument(uid: string): Promise<UserDocument | null> {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const rawDoc = docSnap.data() as { questions: (Question | QuestionV1)[]; dailyQuestions: any; level: string };
    // Run migration
    const migratedDoc = migrateUserDocument(rawDoc);

    // Check if any questions need migration
    const needsUpdate = rawDoc.questions.some(q => isQuestionV1(q));
    if (needsUpdate) {
      await updateDoc(docRef, { questions: migratedDoc.questions });
    }

    return migratedDoc;
  }

  // Create initial document if it doesn't exist
  const initialDoc: UserDocument = {
    questions: [],
    dailyQuestions: {},
    level: 'a0',
  };

  await setDoc(docRef, initialDoc);
  return initialDoc;
}

export async function updateUserDocument(
  uid: string,
  updates: Partial<UserDocument>
): Promise<void> {
  const docRef = doc(db, 'users', uid);
  // Remove undefined values before updating Firestore
  const cleanedUpdates = removeUndefined(updates);
  await updateDoc(docRef, cleanedUpdates);
}

export async function addQuestion(uid: string, question: Question): Promise<void> {
  const userDoc = await getUserDocument(uid);
  if (!userDoc) return;

  const updatedQuestions = [...userDoc.questions, question];
  await updateUserDocument(uid, { questions: updatedQuestions });
}

export async function updateQuestion(
  uid: string,
  questionId: string,
  updates: Partial<Question>
): Promise<void> {
  const userDoc = await getUserDocument(uid);
  if (!userDoc) return;

  // Remove undefined values before updating
  const cleanedUpdates = removeUndefined(updates);

  const updatedQuestions = userDoc.questions.map(q => {
    if (q.id === questionId) {
      const updated = { ...q, ...cleanedUpdates };
      // Clean the updated question to remove any undefined values
      return removeUndefined(updated) as Question;
    }
    return q;
  });

  await updateUserDocument(uid, { questions: updatedQuestions });
}

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export async function markQuestionAsked(uid: string, questionId: string): Promise<void> {
  const userDoc = await getUserDocument(uid);
  if (!userDoc) return;

  const today = getTodayDate();
  const dailyQuestions = userDoc.dailyQuestions || {};
  const todayQuestions = dailyQuestions[today] || { askedQuestionIds: [], answeredQuestionIds: [] };

  if (!todayQuestions.askedQuestionIds.includes(questionId)) {
    todayQuestions.askedQuestionIds.push(questionId);
  }

  await updateUserDocument(uid, {
    dailyQuestions: {
      ...dailyQuestions,
      [today]: todayQuestions,
    },
  });
}

export async function markQuestionAnswered(uid: string, questionId: string): Promise<void> {
  const userDoc = await getUserDocument(uid);
  if (!userDoc) return;

  const today = getTodayDate();
  const dailyQuestions = userDoc.dailyQuestions || {};
  const todayQuestions = dailyQuestions[today] || { askedQuestionIds: [], answeredQuestionIds: [] };

  if (!todayQuestions.answeredQuestionIds.includes(questionId)) {
    todayQuestions.answeredQuestionIds.push(questionId);
  }

  await updateUserDocument(uid, {
    dailyQuestions: {
      ...dailyQuestions,
      [today]: todayQuestions,
    },
  });
}
