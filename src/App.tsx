import { useEffect, useState, useRef } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from './firebase/config';
import Auth from './components/Auth';
import QuestionCard from './components/QuestionCard';
import {
  getUserDocument,
  updateQuestion,
  markQuestionAsked,
  markQuestionAnswered,
  addQuestion,
  updateUserDocument,
} from './services/firestore';
import { generateQuestion, validateAnswer, explainQuestion, generateContext } from './services/ai';
import { Question, UserDocument } from './types';
import './index.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingQuestion, setGeneratingQuestion] = useState(false);
  const [explainingQuestionId, setExplainingQuestionId] = useState<string | null>(null);
  const [generatingContextId, setGeneratingContextId] = useState<string | null>(null);
  const [validatingQuestionId, setValidatingQuestionId] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<string | null>(null);
  const questionsEndRef = useRef<HTMLDivElement>(null);

  const checkApi = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setApiStatus(data.message);
    } catch (error) {
      setApiStatus('API Unreachable');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const doc = await getUserDocument(currentUser.uid);
        setUserDoc(doc);
      } else {
        setUserDoc(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleLevelChange = async (newLevel: string) => {
    if (!user) return;
    await updateUserDocument(user.uid, { level: newLevel });
    const updatedDoc = await getUserDocument(user.uid);
    setUserDoc(updatedDoc);
  };

  const hasUnansweredQuestions = () => {
    if (!userDoc) return false;

    // Check if there are any questions with status 'asked' that haven't been answered at least once
    const hasAskedQuestions = userDoc.questions.some(
      q => q.status === 'asked' && (!q.answers || q.answers.length === 0)
    );

    return hasAskedQuestions;
  };

  const handleNewQuestion = async () => {
    if (!user || !userDoc || generatingQuestion) return;

    setGeneratingQuestion(true);
    try {
      const answeredQuestions = userDoc.questions.filter(q => q.status === 'answered');
      const questionText = await generateQuestion(answeredQuestions, userDoc.level);

      const newQuestion: Question = {
        id: Date.now().toString(),
        status: 'asked',
        question: questionText,
        answers: [],
        askedAt: new Date().toISOString(),
      };

      await addQuestion(user.uid, newQuestion);
      await markQuestionAsked(user.uid, newQuestion.id);

      const updatedDoc = await getUserDocument(user.uid);
      setUserDoc(updatedDoc);
    } catch (error) {
      console.error('Error generating question:', error);
    } finally {
      setGeneratingQuestion(false);
    }
  };

  const handleAnswer = async (questionId: string, answerText: string) => {
    if (!user || !userDoc || validatingQuestionId) return;

    setValidatingQuestionId(questionId);
    try {
      const question = userDoc.questions.find(q => q.id === questionId);
      if (!question) return;

      const validation = await validateAnswer(question.question, answerText);

      const newAnswer = {
        answer: answerText,
        isCorrect: validation.correct,
        mistakes: validation.mistakes,
        explanation: validation.explanation,
        answeredAt: new Date().toISOString(),
      };

      // Get existing answers array or initialize it
      const existingAnswers = question.answers || [];
      const updatedAnswers = [...existingAnswers, newAnswer];

      // Update question with new answer
      await updateQuestion(user.uid, questionId, {
        answers: updatedAnswers,
        // Set status to answered if this is the first answer
        status: existingAnswers.length === 0 ? 'answered' : question.status,
      });

      // Mark as answered in daily questions if first answer
      if (existingAnswers.length === 0) {
        await markQuestionAnswered(user.uid, questionId);
      }

      const updatedDoc = await getUserDocument(user.uid);
      setUserDoc(updatedDoc);
    } catch (error) {
      console.error('Error validating answer:', error);
    } finally {
      setValidatingQuestionId(null);
    }
  };

  const handleGenerateContext = async (questionId: string) => {
    if (!user || !userDoc || generatingContextId) return;

    setGeneratingContextId(questionId);
    try {
      const question = userDoc.questions.find(q => q.id === questionId);
      if (!question) return;

      // Check if already generated (cached)
      if (question.contextConversation) {
        return;
      }

      const contextConversation = await generateContext(question.question, userDoc.level);

      await updateQuestion(user.uid, questionId, {
        contextConversation,
      });

      const updatedDoc = await getUserDocument(user.uid);
      setUserDoc(updatedDoc);
    } catch (error) {
      console.error('Error generating context:', error);
    } finally {
      setGeneratingContextId(null);
    }
  };

  const handleExplain = async (questionId: string) => {
    if (!user || !userDoc || explainingQuestionId) return;

    setExplainingQuestionId(questionId);
    try {
      const question = userDoc.questions.find(q => q.id === questionId);
      if (!question) return;

      // Check if already explained (cached)
      if (question.questionExplanation) {
        return;
      }

      const questionExplanation = await explainQuestion(question.question, userDoc.level);

      await updateQuestion(user.uid, questionId, {
        questionExplanation,
      });

      const updatedDoc = await getUserDocument(user.uid);
      setUserDoc(updatedDoc);
    } catch (error) {
      console.error('Error explaining question:', error);
    } finally {
      setExplainingQuestionId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const unansweredQuestions = hasUnansweredQuestions();

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-5 flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dutch Learning</h1>
          <div className="flex items-center gap-3">
            {apiStatus && (
              <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${apiStatus === 'API is reachable' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {apiStatus}
              </span>
            )}
            <button
              onClick={checkApi}
              className="text-xs text-gray-500 hover:text-gray-900 transition-colors font-medium"
            >
              Check API
            </button>
            <select
              value={userDoc?.level || 'a0'}
              onChange={(e) => handleLevelChange(e.target.value)}
              className="text-sm text-gray-900 border border-gray-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all cursor-pointer font-medium"
            >
              <option value="a0">A0</option>
              <option value="a1-early">A1-Early</option>
              <option value="a1-mid">A1-Mid</option>
              <option value="a1-goed">A1-Goed</option>
            </select>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-0 md:px-6 py-10">
        {unansweredQuestions ? (
          <div className="mb-8 p-5 bg-amber-50/50 border border-amber-200/50 rounded-xl">
            <p className="text-amber-900 font-medium">
              👇 Answer the question below
            </p>
          </div>
        ) : (
          <div className="px-4">
            <button
              onClick={handleNewQuestion}
              disabled={generatingQuestion}
              className="mb-8 w-full bg-amber-400 hover:bg-amber-500 text-gray-900 py-4 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-base transition-all duration-200 shadow-sm hover:shadow-md border border-gray-900/10 flex items-center justify-center gap-2"
            >
              {generatingQuestion && (
                <svg className="animate-spin h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {generatingQuestion ? 'Generating Question...' : 'New Question'}
            </button>
          </div>
        )}

        <div className="space-y-4">
          {userDoc?.questions
            .slice()
            .reverse()
            .map((question, index, reversedQuestions) => {
              const questionDate = question.askedAt ? new Date(question.askedAt) : null;
              const prevQuestion = index > 0 ? reversedQuestions[index - 1] : null;
              const prevQuestionDate = prevQuestion?.askedAt ? new Date(prevQuestion.askedAt) : null;
              const now = new Date();

              // Check if more than 48 hours between current question and now (for the first/latest question)
              const hoursSinceLatest = index === 0 && questionDate
                ? (now.getTime() - questionDate.getTime()) / (1000 * 60 * 60)
                : null;

              // Check if more than 48 hours between two questions
              const hoursBetween = questionDate && prevQuestionDate
                ? (questionDate.getTime() - prevQuestionDate.getTime()) / (1000 * 60 * 60)
                : null;

              const formatDate = (date: Date) => {
                return date.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
              };

              return (
                <div key={question.id}>
                  {/* Divider between current question and now (if > 48hrs) */}
                  {hoursSinceLatest !== null && hoursSinceLatest > 48 && (
                    <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl text-center">
                      <p className="text-sm text-gray-500 font-medium">
                        😢 No questions between {formatDate(questionDate!)} and {formatDate(now)}
                      </p>
                    </div>
                  )}

                  {/* Divider between two questions (if > 48hrs) */}
                  {hoursBetween !== null && hoursBetween > 48 && (
                    <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl text-center">
                      <p className="text-sm text-gray-500 font-medium">
                        😢 No questions between {formatDate(prevQuestionDate!)} and {formatDate(questionDate!)}
                      </p>
                    </div>
                  )}

                  <QuestionCard
                    question={question}
                    onAnswer={handleAnswer}
                    onExplain={handleExplain}
                    onGenerateContext={handleGenerateContext}
                    isExplaining={explainingQuestionId === question.id}
                    isGeneratingContext={generatingContextId === question.id}
                    isValidating={validatingQuestionId === question.id}
                  />
                </div>
              );
            })}
          <div ref={questionsEndRef} />
        </div>

        {userDoc?.questions.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-base font-medium">No questions yet. Click "New Question" to get started!</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
