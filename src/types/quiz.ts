export interface QuizQuestion {
  id: string;
  question: string;
  options: string[]; // 3-4 answer choices
  correctOptionIndex: number; // 0-based index of correct option
  explanation?: string; // Informative note explaining the specialty coffee answer
}

export interface DailyQuiz {
  id: string;
  title: string;
  description: string;
  dateKey: string; // 'YYYY-MM-DD'
  scheduledStartDate?: string | null;
  scheduledEndDate?: string | null;
  isActive: boolean;
  rewardType: 'STAMPS' | 'POINTS' | 'DISCOUNT_COUPON' | 'NONE';
  rewardValue: number; // e.g. 1 stamp or 10% coupon
  rewardDescription?: string;
  timeLimitSeconds?: number; // 2-minute window (default: 120 seconds)
  questions: QuizQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  answers: number[]; // chosen indices
  score: number; // number of correct answers
  totalQuestions: number;
  isPerfectScore: boolean;
  timeTakenSeconds?: number; // Time in seconds taken to complete the quiz
  timedOut?: boolean; // True if quiz was auto-submitted due to 2-minute timer expiry
  rewardIssued?: {
    type: string;
    stampsAwarded?: number;
    rewardId?: string;
    description: string;
  } | null;
  completedAt: string;
}

export type QuizStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'INACTIVE';

export interface QuizLeaderboardEntry {
  rank: number;
  customerId: string;
  customerDisplayName: string;
  score: number;
  totalQuestions: number;
  accuracyPercent: number;
  timeTakenSeconds: number;
  speedFormatted: string;
  isPerfectScore: boolean;
  completedAt: string;
  isCurrentUser?: boolean;
}

export interface QuizLeaderboardData {
  quizId: string;
  quizTitle: string;
  dateKey: string;
  timeLimitSeconds: number;
  totalParticipants: number;
  entries: QuizLeaderboardEntry[];
  currentUserEntry?: QuizLeaderboardEntry | null;
}
