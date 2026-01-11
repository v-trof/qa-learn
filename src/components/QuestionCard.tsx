import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Question } from '../types';

interface QuestionCardProps {
  question: Question;
  onAnswer: (questionId: string, answer: string) => void;
  onExplain: (questionId: string) => void;
  onGenerateContext: (questionId: string) => void;
  isExplaining: boolean;
  isGeneratingContext: boolean;
  isValidating: boolean;
}

export default function QuestionCard({
  question,
  onAnswer,
  onExplain,
  onGenerateContext,
  isExplaining,
  isGeneratingContext,
  isValidating,
}: QuestionCardProps) {
  const [answer, setAnswer] = useState('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const prevExplanationRef = useRef<string | undefined>(undefined);
  const prevContextRef = useRef<string | undefined>(undefined);
  const wasExplainingRef = useRef(false);
  const wasGeneratingContextRef = useRef(false);

  // Reset state when question changes
  useEffect(() => {
    setShowExplanation(false);
    setShowContext(false);
    prevExplanationRef.current = question.questionExplanation;
    prevContextRef.current = question.contextConversation;
    wasExplainingRef.current = false;
    wasGeneratingContextRef.current = false;
  }, [question.id]);

  // Track when we're generating context
  useEffect(() => {
    if (isGeneratingContext) {
      wasGeneratingContextRef.current = true;
    }
  }, [isGeneratingContext]);

  // Track when we're explaining
  useEffect(() => {
    if (isExplaining) {
      wasExplainingRef.current = true;
    }
  }, [isExplaining]);

  // Auto-show context when it becomes available RIGHT AFTER generating
  useEffect(() => {
    const hadContext = !!prevContextRef.current;
    const hasContext = !!question.contextConversation;

    // Context just appeared (didn't have it, now has it) AND we were generating context
    if (!hadContext && hasContext && wasGeneratingContextRef.current) {
      setShowContext(true);
      wasGeneratingContextRef.current = false;
    }

    prevContextRef.current = question.contextConversation;
  }, [question.contextConversation]);

  // Auto-show explanation only when it becomes available RIGHT AFTER generating
  // AND only if context conversation already exists
  useEffect(() => {
    const hadExplanation = !!prevExplanationRef.current;
    const hasExplanation = !!question.questionExplanation;
    const hasContext = !!question.contextConversation;

    // Explanation just appeared (didn't have it, now has it) AND we were explaining AND context exists
    if (!hadExplanation && hasExplanation && wasExplainingRef.current && hasContext) {
      setShowExplanation(true);
      wasExplainingRef.current = false;
    }

    prevExplanationRef.current = question.questionExplanation;
  }, [question.questionExplanation, question.contextConversation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim()) {
      onAnswer(question.id, answer.trim());
      // Don't clear answer immediately - keep it while validating
    }
  };

  // Clear answer only after validation completes and if there's a correct answer
  useEffect(() => {
    if (!isValidating && question.answers && question.answers.length > 0) {
      const lastAnswer = question.answers[question.answers.length - 1];
      // Only clear if the last answer was correct (user won't need to try again)
      // Check if this answer matches what's currently in the textarea
      if (lastAnswer.isCorrect && answer.trim() === lastAnswer.answer) {
        setAnswer('');
      }
    }
  }, [isValidating, question.answers, answer]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Ensure value is a string for ReactMarkdown
  const ensureString = (value: string | undefined | null): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return (value as string[]).join('\n');
    return String(value);
  };

  return (
    <div className="bg-white rounded-none md:rounded-2xl shadow-sm border-x-0 md:border-x border-t border-b border-gray-100 p-4 md:p-8 mb-6 hover:shadow-md transition-shadow duration-200">
      <div className="mb-6">
        {question.askedAt && (
          <p className="text-xs text-gray-400 mb-3 font-medium tracking-wide uppercase">
            {formatDate(question.askedAt)}
          </p>
        )}
        <div className="text-xl font-semibold text-gray-900 mb-4 prose prose-lg max-w-none leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {ensureString(question.question)}
          </ReactMarkdown>
        </div>

        {/* Show context conversation if it exists */}
        {question.contextConversation && (
          <div className="mb-4">
            <button
              onClick={() => setShowContext(!showContext)}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              {showContext ? 'Hide' : 'Show'} Context
            </button>
            {showContext && (
              <div className="mt-3 p-5 bg-blue-50 rounded-xl border border-blue-100 text-sm text-gray-700 prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {ensureString(question.contextConversation)}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Show explanation if it exists */}
        {question.questionExplanation && (
          <div className="mb-4">
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              {showExplanation ? 'Hide' : 'Show'} Explanation
            </button>
            {showExplanation && (
              <div className="mt-3 p-5 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-700 prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {ensureString(question.questionExplanation)}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Show "Ask in context" button if no context exists */}
        {!question.contextConversation && (
          <button
            onClick={() => onGenerateContext(question.id)}
            disabled={isGeneratingContext}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isGeneratingContext && (
              <svg className="animate-spin h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isGeneratingContext ? 'Generating context...' : '💬 Ask in context'}
          </button>
        )}

        {/* Show "Explain Question" button only after context exists */}
        {!question.questionExplanation && (
          <button
            onClick={() => onExplain(question.id)}
            disabled={isExplaining}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isExplaining && (
              <svg className="animate-spin h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isExplaining ? 'Explaining...' : '💡 Explain Question'}
          </button>
        )}
      </div>

      {/* Show answer form only if no answers yet */}
      {(!question.answers || question.answers.length === 0) && (
        <form onSubmit={handleSubmit} className="mt-6">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer in Dutch..."
            disabled={isValidating}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
            rows={4}
            autoCorrect="off"
            spellCheck="false"
          />
          <button
            type="submit"
            disabled={!answer.trim() || isValidating}
            className="mt-4 w-full bg-amber-400 hover:bg-amber-500 text-gray-900 py-3.5 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-200 shadow-sm hover:shadow-md border border-gray-900/10 flex items-center justify-center gap-2"
          >
            {isValidating && (
              <svg className="animate-spin h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isValidating ? 'Evaluating...' : 'Submit Answer'}
          </button>
        </form>
      )}

      {/* Show all answers if they exist */}
      {question.answers && question.answers.length > 0 && (
        <div className="space-y-4 mt-6">
          {question.answers.map((answerItem, index) => {
            const formatAnswerDate = (dateString: string) => {
              const date = new Date(dateString);
              return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
            };

            return (
              <div key={index} className="space-y-3">
                <div className="pb-3 border-b border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Answer {index + 1}</p>
                    <p className="text-xs text-gray-400">{formatAnswerDate(answerItem.answeredAt)}</p>
                  </div>
                  <p className="text-gray-900 text-base leading-relaxed">{answerItem.answer}</p>
                </div>

                <div className={`p-5 rounded-xl border ${answerItem.isCorrect
                  ? 'bg-emerald-100 border-emerald-300'
                  : 'bg-red-100 border-red-300'
                  }`}>
                  <p className={`font-bold text-base mb-3 ${answerItem.isCorrect ? 'text-emerald-900' : 'text-red-900'
                    }`}>
                    {answerItem.isCorrect ? '🎉 Correct' : '😢 Incorrect'}
                  </p>

                  {answerItem.mistakes && answerItem.mistakes !== 'none' && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Mistakes</p>
                      <div className="text-sm text-gray-700 prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {ensureString(answerItem.mistakes)}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {answerItem.explanation && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Explanation</p>
                      <div className="text-sm text-gray-700 prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {ensureString(answerItem.explanation)}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Allow submitting another answer only if no correct answer exists */}
          {!question.answers.some(a => a.isCorrect) && (
            <form onSubmit={handleSubmit} className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Try Again</p>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type another answer in Dutch..."
                disabled={isValidating}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
                rows={4}
                autoCorrect="off"
                spellCheck="false"
              />
              <button
                type="submit"
                disabled={!answer.trim() || isValidating}
                className="mt-4 w-full bg-amber-400 hover:bg-amber-500 text-gray-900 py-3.5 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-200 shadow-sm hover:shadow-md border border-gray-900/10 flex items-center justify-center gap-2"
              >
                {isValidating && (
                  <svg className="animate-spin h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isValidating ? 'Evaluating...' : 'Submit Another Answer'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
