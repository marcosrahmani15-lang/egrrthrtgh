import React, { useState, useEffect, useRef } from 'react';
import {
  HelpCircle,
  Award,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  LogIn,
  AlertCircle,
  Flame,
  Check,
  Clock,
  Timer,
  Zap,
  Trophy,
} from 'lucide-react';
import { DailyQuiz, QuizAttempt } from '../types/quiz';
import { fetchTodayQuizFromBackend, submitQuizAnswersToBackend } from '../services/loyaltyApi';
import { getActiveCustomer } from '../services/loyalty';
import { LoyaltyCustomer } from '../types/loyalty';
import { CelebratoryConfetti } from './CelebratoryConfetti';

interface DailyQuizSectionProps {
  onOpenCustomerAuth?: (mode: 'login' | 'signup' | 'card') => void;
  onOpenLoyalty?: () => void;
}

const DEFAULT_TIME_LIMIT_SECONDS = 120; // 2-minute window

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

  // 2-Minute Countdown Timer States
  const [isQuizStarted, setIsQuizStarted] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(DEFAULT_TIME_LIMIT_SECONDS);
  const [startedAtTimestamp, setStartedAtTimestamp] = useState<number | null>(null);
  const [isTimedOut, setIsTimedOut] = useState<boolean>(false);
  const timerIntervalRef = useRef<any>(null);

  // Celebratory Confetti Animation State (triggers on perfect score)
  const [showCelebrationConfetti, setShowCelebrationConfetti] = useState<boolean>(false);
  const hasAutoCelebratedRef = useRef<boolean>(false);

  const timeLimitSeconds = quiz?.timeLimitSeconds || DEFAULT_TIME_LIMIT_SECONDS;

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

        // Auto trigger celebratory confetti once on mount if customer has a perfect score attempt
        if (data.userAttempt?.isPerfectScore && !hasAutoCelebratedRef.current) {
          hasAutoCelebratedRef.current = true;
          setShowCelebrationConfetti(true);
        }

        const limit = data.quiz.timeLimitSeconds || DEFAULT_TIME_LIMIT_SECONDS;

        // Check if an existing quiz timer was already started in this browser session
        if (!data.hasAttempted) {
          const sessionKey = `venty_quiz_started_${data.quiz.id}`;
          const savedStartTimeStr = sessionStorage.getItem(sessionKey);
          if (savedStartTimeStr) {
            const savedStartTime = parseInt(savedStartTimeStr, 10);
            if (!isNaN(savedStartTime)) {
              const elapsed = Math.floor((Date.now() - savedStartTime) / 1000);
              const remaining = Math.max(0, limit - elapsed);
              setStartedAtTimestamp(savedStartTime);
              setTimeLeft(remaining);
              setIsQuizStarted(true);

              if (remaining <= 0) {
                setIsTimedOut(true);
              }
            }
          }
        }
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

  // Format seconds into MM:SS
  const formatTime = (seconds: number) => {
    const safeSec = Math.max(0, Math.floor(seconds));
    const m = Math.floor(safeSec / 60);
    const s = safeSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Start the 2-Minute Quiz
  const handleStartQuiz = () => {
    if (!quiz) return;
    const now = Date.now();
    const limit = quiz.timeLimitSeconds || DEFAULT_TIME_LIMIT_SECONDS;
    setStartedAtTimestamp(now);
    setTimeLeft(limit);
    setIsTimedOut(false);
    setIsQuizStarted(true);
    setErrorMessage(null);
    try {
      sessionStorage.setItem(`venty_quiz_started_${quiz.id}`, String(now));
    } catch {
      // Ignore sessionStorage issues
    }
  };

  // Handle auto-submission when timer reaches 00:00
  const handleTimeExpiry = async () => {
    setIsTimedOut(true);
    if (!quiz || hasAttempted || submissionResult || isSubmitting) return;

    if (!activeCustomer) {
      setErrorMessage(
        'Time is up (2:00)! Please log in to submit your completed questions and record your attempt.',
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('Time is up! ⏱️ Auto-submitting your quiz responses...');
    try {
      const res = await submitQuizAnswersToBackend(quiz.id, selectedAnswers, {
        timeTakenSeconds: timeLimitSeconds,
        timedOut: true,
      });
      if (res && res.success) {
        setSubmissionResult(res);
        setHasAttempted(true);
        setUserAttempt(res.attempt);
        if (res.isPerfectScore) {
          setShowCelebrationConfetti(true);
        }
        try {
          sessionStorage.removeItem(`venty_quiz_started_${quiz.id}`);
        } catch {
          // Ignore
        }
        window.dispatchEvent(new CustomEvent('venty:loyalty:updated'));
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Time expired. Quiz submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Main countdown timer interval
  useEffect(() => {
    if (!isQuizStarted || hasAttempted || submissionResult || isTimedOut) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      if (startedAtTimestamp) {
        const elapsed = Math.floor((Date.now() - startedAtTimestamp) / 1000);
        const remaining = Math.max(0, timeLimitSeconds - elapsed);
        setTimeLeft(remaining);

        if (remaining <= 0) {
          clearInterval(timerIntervalRef.current);
          handleTimeExpiry();
        }
      } else {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            handleTimeExpiry();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isQuizStarted, hasAttempted, submissionResult, isTimedOut, startedAtTimestamp, timeLimitSeconds]);

  const handleSelectOption = (questionIdx: number, optionIdx: number) => {
    if (hasAttempted || submissionResult || isTimedOut) return;
    setSelectedAnswers((prev) => {
      const updated = [...prev];
      updated[questionIdx] = optionIdx;
      return updated;
    });
  };

  const handleSubmit = async (isAutoTimeout = false) => {
    if (!quiz) return;
    if (!activeCustomer) {
      if (onOpenCustomerAuth) {
        onOpenCustomerAuth('login');
      } else if (onOpenLoyalty) {
        onOpenLoyalty();
      }
      return;
    }

    // Unless it's an auto-timeout submission, require all questions answered
    if (!isAutoTimeout) {
      const unanswered = selectedAnswers.some((ans) => ans === -1);
      if (unanswered) {
        setErrorMessage(
          'Please select an answer for all questions before submitting, or keep going before time runs out!',
        );
        return;
      }
    }

    const elapsedSeconds = startedAtTimestamp
      ? Math.min(timeLimitSeconds, Math.max(1, Math.floor((Date.now() - startedAtTimestamp) / 1000)))
      : timeLimitSeconds - timeLeft;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await submitQuizAnswersToBackend(quiz.id, selectedAnswers, {
        timeTakenSeconds: elapsedSeconds,
        timedOut: isAutoTimeout,
      });
      if (res && res.success) {
        setSubmissionResult(res);
        setHasAttempted(true);
        setUserAttempt(res.attempt);
        if (res.isPerfectScore) {
          setShowCelebrationConfetti(true);
        }
        try {
          sessionStorage.removeItem(`venty_quiz_started_${quiz.id}`);
        } catch {
          // Ignore
        }
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
  const percentRemaining = Math.max(0, Math.min(100, (timeLeft / timeLimitSeconds) * 100));

  // Question completion metrics
  const totalQuestions = quiz.questions.length;
  const answeredCount = selectedAnswers.filter((a) => a !== -1 && a !== undefined).length;
  const questionsLeft = Math.max(0, totalQuestions - answeredCount);
  const questionProgressPercent =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  // Determine urgency visual stage
  const isCritical = timeLeft <= 15 && isQuizStarted && !hasAttempted && !submissionResult;
  const isWarning = timeLeft <= 45 && !isCritical && isQuizStarted && !hasAttempted && !submissionResult;

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

          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#c9833a]/15 text-[#6b3a1f] text-xs font-semibold border border-[#c9833a]/30">
              <Award className="w-3.5 h-3.5 text-[#c9833a]" />
              <span>Reward: {quiz.rewardDescription || '+1 Bonus Loyalty Stamp'}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#351016]/10 text-[#351016] text-xs font-semibold border border-[#351016]/20">
              <Clock className="w-3.5 h-3.5 text-[#c9833a]" />
              <span>2-Minute Window ({formatTime(timeLimitSeconds)})</span>
            </div>
          </div>
        </div>

        {/* Main Quiz Container */}
        <div className="bg-white rounded-3xl border border-[#ded7c8] shadow-[0_15px_40px_-15px_rgba(53,16,22,0.12)] overflow-hidden relative">
          {/* Celebratory Confetti Animation on Perfect Score */}
          <CelebratoryConfetti
            active={showCelebrationConfetti}
            onComplete={() => setShowCelebrationConfetti(false)}
            particleCount={160}
            durationMs={4800}
          />

          {/* Top Progress & Countdown HUD (Only when quiz is active or in progress) */}
          {(isQuizStarted || hasAttempted || submissionResult) && (
            <div className="bg-[#f7f2e7] border-b border-[#ded7c8] relative">
              <div className="px-5 sm:px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-xs font-semibold text-[#8a7a6f]">
                    Question {activeQuestionIndex + 1} of {totalQuestions}
                  </span>

                  {!hasAttempted && !submissionResult && (
                    <span
                      className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                        questionsLeft === 0
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : questionsLeft === 1
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-[#faf6ef] text-[#614f44] border border-[#ded7c8]'
                      }`}
                    >
                      {questionsLeft === 0
                        ? 'All Answered ✓'
                        : `${questionsLeft} ${questionsLeft === 1 ? 'question' : 'questions'} left`}
                    </span>
                  )}

                  <div className="hidden sm:flex items-center gap-1.5 ml-1">
                    {quiz.questions.map((_, idx) => {
                      const isAnswered =
                        selectedAnswers[idx] !== -1 && selectedAnswers[idx] !== undefined;
                      const isCurrent = idx === activeQuestionIndex;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveQuestionIndex(idx)}
                          className={`h-2 rounded-full transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-[#351016] w-7 ring-2 ring-[#c9833a]/50'
                              : isAnswered
                              ? 'bg-emerald-600 w-5'
                              : 'bg-[#ded7c8] w-5'
                          }`}
                          title={`Go to Question ${idx + 1} (${isAnswered ? 'Answered' : 'Unanswered'})`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Prominent 2-Minute Countdown Timer Pill */}
                {!hasAttempted && !submissionResult && (
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex items-center gap-2 px-3.5 py-1 rounded-full border transition-all ${
                        isCritical
                          ? 'bg-rose-950 text-rose-200 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse'
                          : isWarning
                          ? 'bg-amber-950/90 text-amber-200 border-amber-500/70 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                          : 'bg-[#351016] text-[#f4d19b] border-[#c9833a]/40'
                      }`}
                    >
                      {isCritical ? (
                        <Flame className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                      ) : isWarning ? (
                        <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      ) : (
                        <Timer className="w-3.5 h-3.5 text-[#c9833a]" />
                      )}

                      <div className="flex items-baseline gap-1">
                        <span className="font-mono font-bold text-xs sm:text-sm tracking-wider">
                          {formatTime(timeLeft)}
                        </span>
                        <span className="text-[10px] font-sans opacity-75 hidden sm:inline">
                          left
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Linear Dynamic Time Progress Bar */}
              {!hasAttempted && !submissionResult && (
                <div className="w-full bg-[#ded7c8] h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ease-linear ${
                      isCritical
                        ? 'bg-rose-500'
                        : isWarning
                        ? 'bg-amber-500'
                        : 'bg-gradient-to-r from-[#c9833a] to-[#8a4e1b]'
                    }`}
                    style={{ width: `${percentRemaining}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Critical Timer Warning Notification Banner (< 15 seconds) */}
          {isCritical && (
            <div className="bg-rose-950/90 border-b border-rose-800 text-rose-200 px-4 py-2 text-xs flex items-center justify-between gap-2 animate-pulse">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="font-semibold">
                  Under 15 seconds remaining! Answers will auto-submit at 00:00.
                </span>
              </div>
              <span className="font-mono font-bold text-rose-300">{formatTime(timeLeft)}</span>
            </div>
          )}

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
                    : `Quiz Completed: ${
                        userAttempt?.score ?? submissionResult?.score ?? 0
                      } / ${quiz.questions.length}`}
                </h3>

                {/* Time performance badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f7f2e7] border border-[#ded7c8] text-xs font-mono text-[#614f44]">
                  <Timer className="w-3.5 h-3.5 text-[#c9833a]" />
                  <span>
                    {userAttempt?.timedOut || submissionResult?.attempt?.timedOut
                      ? `Time Expired (${formatTime(timeLimitSeconds)})`
                      : `Finished in ${formatTime(
                          userAttempt?.timeTakenSeconds ??
                            submissionResult?.attempt?.timeTakenSeconds ??
                            (startedAtTimestamp ? timeLimitSeconds - timeLeft : 60),
                        )} (within 2-min limit)`}
                  </span>
                </div>

                <p className="font-sans text-xs sm:text-sm text-[#614f44] max-w-md mx-auto">
                  {userAttempt?.isPerfectScore || submissionResult?.isPerfectScore
                    ? 'Congratulations! You answered all questions correctly within the 2-minute limit. Your reward has been issued directly to your account.'
                    : 'Good effort! One attempt is permitted per customer per day. Come back tomorrow for the next 2-minute daily quiz!'}
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

                <div className="pt-1 flex flex-wrap items-center justify-center gap-2.5">
                  {(userAttempt?.isPerfectScore || submissionResult?.isPerfectScore) && (
                    <button
                      type="button"
                      onClick={() => setShowCelebrationConfetti(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-amber-400/20 via-amber-500/15 to-[#c9833a]/25 border border-amber-400/50 text-[#854d0e] hover:text-[#582a0b] text-xs font-semibold hover:bg-amber-100/60 transition-all cursor-pointer shadow-sm active:scale-95"
                      title="Celebrate again with golden confetti"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                      <span>Replay Confetti Burst 🎉</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('quiz-leaderboard');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#351016] text-[#faf6ee] hover:bg-[#c9833a] hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
                  >
                    <Trophy className="w-3.5 h-3.5 text-[#c9833a]" />
                    <span>View Today&apos;s Leaderboard Standings</span>
                  </button>
                </div>
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
                            Your choice: <strong>{q.options[chosenIdx] || 'None (Unanswered)'}</strong>
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
          ) : !isQuizStarted ? (
            /* Pre-Quiz Briefing & Start Challenge Screen */
            <div className="p-6 sm:p-10 space-y-8 text-center max-w-xl mx-auto">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-[#351016] to-[#20080d] flex items-center justify-center text-[#f4d19b] border border-[#c9833a]/40 shadow-lg">
                <Timer className="w-8 h-8 text-[#c9833a]" />
              </div>

              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#c9833a]/15 text-[#6b3a1f] text-xs font-mono font-bold tracking-wider">
                  <Zap className="w-3.5 h-3.5 text-[#c9833a]" />
                  2-MINUTE PALATE CHALLENGE
                </span>
                <h3 className="font-serif font-bold text-2xl sm:text-3xl text-[#2d1217]">
                  Ready for Today&apos;s Quiz?
                </h3>
                <p className="font-sans text-xs sm:text-sm text-[#614f44] leading-relaxed">
                  Put your coffee palate to the test! Complete the {quiz.questions.length} questions
                  within the 2-minute countdown window to earn exclusive rewards.
                </p>
              </div>

              {/* Challenge Rules Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <div className="p-3.5 rounded-2xl bg-[#faf6ef] border border-[#ded7c8] flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-[#351016] text-[#c9833a] shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-xs text-[#2d1217]">2-Minute Timer</h5>
                    <p className="text-[11px] text-[#614f44] mt-0.5">
                      120 seconds to answer all {quiz.questions.length} multiple-choice questions.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#faf6ef] border border-[#ded7c8] flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-[#351016] text-[#c9833a] shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-xs text-[#2d1217]">Instant Rewards</h5>
                    <p className="text-[11px] text-[#614f44] mt-0.5">
                      {quiz.rewardDescription || '+1 Bonus Loyalty Stamp'} issued on perfect score.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#faf6ef] border border-[#ded7c8] flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-[#351016] text-[#c9833a] shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-xs text-[#2d1217]">1 Daily Attempt</h5>
                    <p className="text-[11px] text-[#614f44] mt-0.5">
                      One official attempt per authenticated customer per day.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#faf6ef] border border-[#ded7c8] flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-[#351016] text-[#c9833a] shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-xs text-[#2d1217]">Barista Insights</h5>
                    <p className="text-[11px] text-[#614f44] mt-0.5">
                      Receive detailed tasting notes and origin explanations after finishing.
                    </p>
                  </div>
                </div>
              </div>

              {/* Start Quiz Action */}
              <div className="pt-2 space-y-3">
                {activeCustomer ? (
                  <button
                    type="button"
                    onClick={handleStartQuiz}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full bg-gradient-to-r from-[#351016] to-[#20080d] hover:from-[#c9833a] hover:to-[#b7742d] text-[#faf6ee] font-serif font-bold text-sm tracking-wide transition-all shadow-lg hover:shadow-xl cursor-pointer active:scale-95 border border-[#c9833a]/30"
                  >
                    <Timer className="w-4 h-4 text-[#c9833a]" />
                    <span>Start 2-Minute Quiz</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenCustomerAuth) {
                          onOpenCustomerAuth('login');
                        } else if (onOpenLoyalty) {
                          onOpenLoyalty();
                        }
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-[#c9833a] to-[#b7742d] hover:brightness-110 text-[#1b0d09] font-serif font-bold text-sm tracking-wide transition-all shadow-md cursor-pointer active:scale-95"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Log In to Start & Earn Rewards</span>
                    </button>

                    <div className="block">
                      <button
                        type="button"
                        onClick={handleStartQuiz}
                        className="text-xs text-[#8a7a6f] hover:text-[#351016] underline underline-offset-4 cursor-pointer"
                      >
                        Or start 2-minute preview as guest
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Active Interactive Question View with Live 2-Minute Countdown */
            <div className="p-6 sm:p-10 space-y-6">
              {/* Question Completion Visual Progress Bar */}
              <div className="bg-[#faf6ef] p-4 sm:p-5 rounded-2xl border border-[#ded7c8] space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-[#2d1217] text-sm sm:text-base">
                      Quiz Progress:
                    </span>
                    <span className="font-sans font-medium text-[#614f44]">
                      {answeredCount} of {totalQuestions} answered
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                        questionsLeft === 0
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : questionsLeft === 1
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-[#eee9de] text-[#614f44] border border-[#ded7c8]'
                      }`}
                    >
                      {questionsLeft === 0
                        ? 'All completed! Ready to submit'
                        : `${questionsLeft} ${questionsLeft === 1 ? 'question' : 'questions'} left`}
                    </span>

                    <span className="font-mono font-bold text-xs text-[#c9833a]">
                      {questionProgressPercent}%
                    </span>
                  </div>
                </div>

                {/* Animated Visual Progress Bar Track & Fill */}
                <div className="w-full h-3 bg-[#e8e0d0] rounded-full overflow-hidden p-0.5 border border-[#ded7c8]/80 shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#c9833a] via-[#b7742d] to-[#351016] transition-all duration-300 ease-out shadow-xs"
                    style={{ width: `${Math.max(4, questionProgressPercent)}%` }}
                  />
                </div>

                {/* Question Step Pill Buttons */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-0.5">
                  {quiz.questions.map((_, idx) => {
                    const isAnswered =
                      selectedAnswers[idx] !== -1 && selectedAnswers[idx] !== undefined;
                    const isCurrent = idx === activeQuestionIndex;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveQuestionIndex(idx)}
                        disabled={isTimedOut || isSubmitting}
                        className={`py-1.5 px-2.5 rounded-xl text-[11px] font-mono font-bold flex items-center justify-between transition-all cursor-pointer border ${
                          isCurrent
                            ? 'bg-[#351016] text-[#faf6ee] border-[#351016] shadow-sm ring-2 ring-[#c9833a]/40'
                            : isAnswered
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-white text-[#8a7a6f] border-[#ded7c8] hover:bg-[#faf6ee]'
                        }`}
                        title={`Go to Question ${idx + 1} (${isAnswered ? 'Answered' : 'Unanswered'})`}
                      >
                        <span>Q{idx + 1}</span>
                        {isAnswered ? (
                          <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#8a7a6f]/60 font-normal">Pending</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {currentQ && (
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-xs uppercase text-[#c9833a] font-bold tracking-wider">
                      Question #{activeQuestionIndex + 1}
                    </span>
                    <span className="font-mono text-xs text-[#8a7a6f]">
                      {activeQuestionIndex + 1} of {quiz.questions.length}
                    </span>
                  </div>

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
                          disabled={isTimedOut || isSubmitting}
                          className={`w-full text-left p-4 rounded-2xl border text-xs sm:text-sm font-medium transition-all flex items-center justify-between gap-3 cursor-pointer disabled:cursor-not-allowed ${
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

              {/* Error or Urgency Notice */}
              {errorMessage && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    isTimedOut
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}
                >
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
                      disabled={isTimedOut || isSubmitting}
                      className="px-4 py-2 rounded-xl border border-[#ded7c8] text-xs font-semibold text-[#614f44] hover:bg-[#faf6ee] transition-all cursor-pointer disabled:opacity-50"
                    >
                      Previous
                    </button>
                  )}

                  {!isLastQuestion ? (
                    <button
                      type="button"
                      onClick={() => setActiveQuestionIndex((prev) => prev + 1)}
                      disabled={isTimedOut || isSubmitting}
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#351016] text-[#faf6ee] text-xs font-semibold hover:bg-[#c9833a] hover:text-white transition-all cursor-pointer ml-auto sm:ml-0 disabled:opacity-50"
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
                        onClick={() => handleSubmit(false)}
                        disabled={isSubmitting || isTimedOut}
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
                            <span>
                              {questionsLeft === 0
                                ? `Submit Answers (${formatTime(timeLeft)} left)`
                                : `Submit Quiz (${questionsLeft} left · ${formatTime(timeLeft)})`}
                            </span>
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
