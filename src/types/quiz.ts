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
  rewardIssued?: {
    type: string;
    stampsAwarded?: number;
    rewardId?: string;
    description: string;
  } | null;
  completedAt: string;
}

export type QuizStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'INACTIVE';
