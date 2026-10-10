import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  Award,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  LogIn,
  AlertCircle,
  Flame,
  Check,
} from 'lucide-react';
import { DailyQuiz, QuizAttempt } from '../types/quiz';
import { fetchTodayQuizFromBackend, submitQuizAnswersToBackend } from '../services/loyaltyApi';
import { getActiveCustomer } from '../services/loyalty';
import { LoyaltyCustomer } from '../types/loyalty';

interface DailyQuizSectionProps {
  onOpenCustomerAuth?: (mode: 'login' | 'signup' | 'card') => void;
  onOpenLoyalty?: () => void;
}

export const DailyQuizSection: React.FC<DailyQuizSectionProps> = ({
  onOpenCustomerAuth,
  onOpenLoyalty,
}) => {
  const [quiz, setQuiz] = useState<DailyQuiz | null>(null);
  const [hasAttempted, setHasAttempted] = useState<boolean>(false);
  const [userAttempt, setUserAttempt] = useState<QuizAttempt | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeCustomer, setActiveCustomerState] = useState<LoyaltyCustomer | null>(() =>
    getActiveCustomer(),
  );

  const loadQuiz = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchTodayQuizFromBackend();
      if (data && data.quiz) {
        setQuiz(data.quiz);
        setHasAttempted(data.hasAttempted);
        setUserAttempt(data.userAttempt || null);
        setSelectedAnswers(new Array(data.quiz.questions.length).fill(-1));
      } else {
        setQuiz(null);
      }
    } catch {
      // Fallback: quiz loading error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuiz();

    const handleAuthChange = () => {
      setActiveCustomerState(getActiveCustomer());
      loadQuiz();
    };

    window.addEventListener('venty:loyalty:updated', handleAuthChange);
    window.addEventListener('venty-loyalty-updated', handleAuthChange);
    return () => {
      window.removeEventListener('venty:loyalty:updated', handleAuthChange);
      window.removeEventListener('venty-loyalty-updated', handleAuthChange);
    };
  }, []);

  const handleSelectOption = (questionIdx: number, optionIdx: number) => {
    if (hasAttempted || submissionResult) return;
    setSelectedAnswers((prev) => {
      const updated = [...prev];
      updated[questionIdx] = optionIdx;
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    if (!activeCustomer) {
      if (onOpenCustomerAuth) {
        onOpenCustomerAuth('login');
      } else if (onOpenLoyalty) {
        onOpenLoyalty();
      }
      return;
    }

    // Check that all questions have an answer
    const unanswered = selectedAnswers.some((ans) => ans === -1);
    if (unanswered) {
      setErrorMessage('Please answer all quiz questions before submitting.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await submitQuizAnswersToBackend(quiz.id, selectedAnswers);
      if (res && res.success) {
        setSubmissionResult(res);
        setHasAttempted(true);
        setUserAttempt(res.attempt);
        // Trigger customer reload
        window.dispatchEvent(new CustomEvent('venty:loyalty:updated'));
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="py-12 bg-[#faf6ef]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-block w-8 h-8 border-3 border-[#c9833a] border-t-transparent rounded-full animate-spin" />
        </div>
      </section>
    );
  }

  if (!quiz) {
    return null; // No quiz scheduled
  }

  const currentQ = quiz.questions[activeQuestionIndex];
  const isLastQuestion = activeQuestionIndex === quiz.questions.length - 1;
  const isFirstQuestion = activeQuestionIndex === 0;

  return (
    <section id="daily-quiz" className="py-14 sm:py-20 bg-[#faf6ef] relative overflow-hidden">
      {/* Decorative ambient coffee background accents */}
      <div className="absolute top-1/2 left-0 w-72 h-72 bg-[#c9833a]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#351016]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Header Ribbon */}
        <div className="text-center max-w-xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#351016] text-[#faf6ee] text-[10px] font-sans font-bold uppercase tracking-[0.2em] mb-3 border border-[#c9833a]/30">
            <HelpCircle className="w-3.5 h-3.5 text-[#c9833a]" />
            <span>VENTY DAILY PALATE QUIZ</span>
          </div>

          <h2 className="font-serif italic font-bold text-3xl sm:text-4xl text-[#2d1217] tracking-tight">
            {quiz.title}
          </h2>

          <p className="font-sans text-xs sm:text-sm text-[#614f44] mt-2 leading-relaxed">
            {quiz.description}
          </p>

          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-[#c9833a]/15 text-[#6b3a1f] text-xs font-semibold border border-[#c9833a]/30">
            <Award className="w-3.5 h-3.5 text-[#c9833a]" />
            <span>Reward: {quiz.rewardDescription || '+1 Bonus Loyalty Stamp'}</span>
          </div>
        </div>

        {/* Main Quiz Container */}
        <div className="bg-white rounded-3xl border border-[#ded7c8] shadow-[0_15px_40px_-15px_rgba(53,16,22,0.12)] overflow-hidden">
          {/* Top Progress Bar */}
          <div className="bg-[#f7f2e7] px-6 py-3 border-b border-[#ded7c8] flex items-center justify-between">
            <span className="font-mono text-xs text-[#8a7a6f]">
              Question {activeQuestionIndex + 1} of {quiz.questions.length}
            </span>

            <div className="flex items-center gap-1.5">
              {quiz.questions.map((_, idx) => {
                const isAnswered = selectedAnswers[idx] !== -1 && selectedAnswers[idx] !== undefined;
                const isCurrent = idx === activeQuestionIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveQuestionIndex(idx)}
                    className={`w-7 h-2 rounded-full transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[#351016] w-9'
                        : isAnswered
                        ? 'bg-[#c9833a]'
                        : 'bg-[#ded7c8]'
                    }`}
                    title={`Go to Question ${idx + 1}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Submission Result State */}
          {submissionResult || hasAttempted ? (
            <div className="p-6 sm:p-10 space-y-6">
              <div className="text-center space-y-3">
                {userAttempt?.isPerfectScore || submissionResult?.isPerfectScore ? (
                  <div className="inline-flex p-3 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                ) : (
                  <div className="inline-flex p-3 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    <Award className="w-8 h-8" />
                  </div>
                )}

                <h3 className="font-serif font-bold text-2xl text-[#2d1217]">
                  {userAttempt?.isPerfectScore || submissionResult?.isPerfectScore
                    ? 'Perfect Score! Coffee Connoisseur!'
                    : `Quiz Completed: ${userAttempt?.score ?? submissionResult?.score ?? 0} / ${quiz.questions.length}`}
                </h3>

                <p className="font-sans text-xs sm:text-sm text-[#614f44] max-w-md mx-auto">
                  {userAttempt?.isPerfectScore || submissionResult?.isPerfectScore
                    ? 'Congratulations! You answered all questions correctly. Your reward has been issued directly to your account.'
                    : 'Good effort! One attempt is permitted per customer per day. Come back tomorrow for the next daily quiz!'}
                </p>

                {(userAttempt?.rewardIssued || submissionResult?.rewardIssued) && (
                  <div className="inline-flex items-center gap-2 p-3.5 rounded-2xl bg-gradient-to-r from-[#351016] to-[#250a0f] text-[#f4d19b] border border-[#c9833a]/40 text-xs sm:text-sm font-semibold shadow-md">
                    <Sparkles className="w-4 h-4 text-[#c9833a]" />
                    <span>
                      {userAttempt?.rewardIssued?.description ||
                        submissionResult?.rewardIssued?.description ||
                        'Bonus reward awarded!'}
                    </span>
                  </div>
                )}
              </div>

              {/* Review Question Results & Explanations */}
              <div className="space-y-4 pt-4 border-t border-[#ded7c8]">
                <h4 className="font-serif font-bold text-base text-[#2d1217]">
                  Question Answers & Barista Explanations:
                </h4>

                <div className="space-y-3">
                  {(submissionResult?.questionResults || quiz.questions).map((q: any, idx: number) => {
                    const chosenIdx = userAttempt ? userAttempt.answers[idx] : selectedAnswers[idx];
                    const isCorrect = chosenIdx === q.correctOptionIndex;

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-2xl border text-xs sm:text-sm ${
                          isCorrect
                            ? 'bg-emerald-50/70 border-emerald-200 text-[#1b4332]'
                            : 'bg-rose-50/70 border-rose-200 text-[#5c1d24]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="font-semibold text-[#2d1217]">
                            Q{idx + 1}: {q.question}
                          </span>
                          {isCorrect ? (
                            <span className="inline-flex items-center gap-1 font-mono text-emerald-700 font-bold text-xs shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-mono text-rose-700 font-bold text-xs shrink-0">
                              <XCircle className="w-3.5 h-3.5" /> Missed
                            </span>
                          )}
                        </div>

                        <div className="text-xs space-y-1 mb-2">
                          <div>
                            Your choice: <strong>{q.options[chosenIdx] || 'None'}</strong>
                          </div>
                          {!isCorrect && (
                            <div className="text-emerald-800 font-medium">
                              Correct answer: <strong>{q.options[q.correctOptionIndex]}</strong>
                            </div>
                          )}
                        </div>

                        {q.explanation && (
                          <div className="pt-2 border-t border-black/10 text-[11px] text-[#55463c] italic leading-relaxed">
                            💡 {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Active Interactive Question View */
            <div className="p-6 sm:p-10 space-y-6">
              {currentQ && (
                <div>
                  <h3 className="font-serif font-bold text-lg sm:text-xl text-[#2d1217] leading-snug mb-5">
                    {currentQ.question}
                  </h3>

                  {/* 3 to 4 Choice Options */}
                  <div className="space-y-3">
                    {currentQ.options.map((optionText, optIdx) => {
                      const isSelected = selectedAnswers[activeQuestionIndex] === optIdx;

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectOption(activeQuestionIndex, optIdx)}
                          className={`w-full text-left p-4 rounded-2xl border text-xs sm:text-sm font-medium transition-all flex items-center justify-between gap-3 cursor-pointer ${
                            isSelected
                              ? 'bg-[#351016] text-[#faf6ee] border-[#351016] shadow-sm'
                              : 'bg-white hover:bg-[#faf6ee] text-[#2d1217] border-[#ded7c8]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                                isSelected
                                  ? 'bg-[#c9833a] text-white'
                                  : 'bg-[#eee9de] text-[#614f44]'
                              }`}
                            >
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span>{optionText}</span>
                          </div>

                          {isSelected && <Check className="w-4 h-4 text-[#c9833a] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Question Navigation & Submit Footer */}
              <div className="pt-4 border-t border-[#ded7c8] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {!isFirstQuestion && (
                    <button
                      type="button"
                      onClick={() => setActiveQuestionIndex((prev) => prev - 1)}
                      className="px-4 py-2 rounded-xl border border-[#ded7c8] text-xs font-semibold text-[#614f44] hover:bg-[#faf6ee] transition-all cursor-pointer"
                    >
                      Previous
                    </button>
                  )}

                  {!isLastQuestion ? (
                    <button
                      type="button"
                      onClick={() => setActiveQuestionIndex((prev) => prev + 1)}
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#351016] text-[#faf6ee] text-xs font-semibold hover:bg-[#c9833a] hover:text-white transition-all cursor-pointer ml-auto sm:ml-0"
                    >
                      <span>Next Question</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>

                {/* Final Submit Button */}
                {isLastQuestion && (
                  <div className="w-full sm:w-auto">
                    {activeCustomer ? (
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#c9833a] to-[#b7742d] hover:brightness-110 text-[#1b0d09] font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-[#1b0d09] border-t-transparent rounded-full animate-spin" />
                            <span>Submitting Answers...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Submit Quiz & Check Results</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenCustomerAuth) {
                            onOpenCustomerAuth('login');
                          } else if (onOpenLoyalty) {
                            onOpenLoyalty();
                          }
                        }}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#351016] text-[#f4d19b] font-semibold text-xs tracking-wide hover:bg-[#c9833a] hover:text-white transition-all cursor-pointer"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Log In to Record Attempt</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
