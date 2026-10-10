import React, { useState } from 'react';
import {
  HelpCircle,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  AlertCircle,
  X,
  Search,
} from 'lucide-react';
import { DailyQuiz, QuizQuestion } from '../../types/quiz';

interface QuizManagementViewProps {
  quizzes: DailyQuiz[];
  isAdmin: boolean;
  onRefresh: () => void;
  onCreateQuiz: (payload: Partial<DailyQuiz>) => Promise<void>;
  onUpdateQuiz: (id: string, payload: Partial<DailyQuiz>) => Promise<void>;
  onDeleteQuiz: (id: string) => Promise<void>;
}

export const QuizManagementView: React.FC<QuizManagementViewProps> = ({
  quizzes,
  isAdmin,
  onRefresh,
  onCreateQuiz,
  onUpdateQuiz,
  onDeleteQuiz,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<DailyQuiz | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDateKey, setFormDateKey] = useState('');
  const [formRewardType, setFormRewardType] = useState<'STAMPS' | 'POINTS' | 'DISCOUNT_COUPON'>('STAMPS');
  const [formRewardValue, setFormRewardValue] = useState<number>(1);
  const [formRewardDescription, setFormRewardDescription] = useState('+1 Bonus Loyalty Stamp');
  const [formQuestions, setFormQuestions] = useState<
    Array<{
      id: string;
      question: string;
      options: string[];
      correctOptionIndex: number;
      explanation: string;
    }>
  >([
    {
      id: 'q1',
      question: '',
      options: ['', '', '', ''],
      correctOptionIndex: 0,
      explanation: '',
    },
  ]);

  const openCreateModal = () => {
    setModalMode('create');
    setEditingQuiz(null);
    setFormTitle('');
    setFormDescription('Test your palate and coffee knowledge with our daily palate challenge.');
    setFormDateKey(new Date().toLocaleDateString('en-CA'));
    setFormRewardType('STAMPS');
    setFormRewardValue(1);
    setFormRewardDescription('+1 Bonus Loyalty Stamp');
    setFormQuestions([
      {
        id: 'q1',
        question: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        explanation: '',
      },
    ]);
    setFormError(null);
  };

  const openEditModal = (q: DailyQuiz) => {
    setModalMode('edit');
    setEditingQuiz(q);
    setFormTitle(q.title);
    setFormDescription(q.description || '');
    setFormDateKey(q.dateKey);
    setFormRewardType((q.rewardType as any) || 'STAMPS');
    setFormRewardValue(q.rewardValue || 1);
    setFormRewardDescription(q.rewardDescription || '+1 Bonus Loyalty Stamp');
    setFormQuestions(
      q.questions.map((item, i) => ({
        id: item.id || `q-${i + 1}`,
        question: item.question,
        options: [...item.options],
        correctOptionIndex: item.correctOptionIndex,
        explanation: item.explanation || '',
      })),
    );
    setFormError(null);
  };

  const handleAddQuestion = () => {
    if (formQuestions.length >= 5) return;
    setFormQuestions((prev) => [
      ...prev,
      {
        id: `q-${prev.length + 1}`,
        question: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        explanation: '',
      },
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (formQuestions.length <= 1) return;
    setFormQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Quiz title is required.');
      return;
    }

    // Validate questions
    for (let i = 0; i < formQuestions.length; i++) {
      const q = formQuestions[i];
      if (!q.question.trim()) {
        setFormError(`Question #${i + 1} text cannot be empty.`);
        return;
      }
      const validOptions = q.options.filter((o) => o.trim().length > 0);
      if (validOptions.length < 3) {
        setFormError(`Question #${i + 1} must have at least 3 answer choices.`);
        return;
      }
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const payload: Partial<DailyQuiz> = {
        title: formTitle.trim(),
        description: formDescription.trim(),
        dateKey: formDateKey,
        rewardType: formRewardType,
        rewardValue: Number(formRewardValue) || 1,
        rewardDescription: formRewardDescription.trim(),
        questions: formQuestions.map((q) => ({
          ...q,
          options: q.options.filter((o) => o.trim().length > 0),
        })),
        isActive: true,
      };

      if (modalMode === 'create') {
        await onCreateQuiz(payload);
      } else if (modalMode === 'edit' && editingQuiz) {
        await onUpdateQuiz(editingQuiz.id, payload);
      }
      setModalMode(null);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save quiz.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredQuizzes = quizzes.filter((q) => {
    if (!searchQuery.trim()) return true;
    return (
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.dateKey.includes(searchQuery)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-[#20080d] to-[#14080a] text-[#faf6ee] border border-[#c9833a]/30">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#351016] text-[#f4d19b] text-[10px] font-mono uppercase tracking-wider mb-2 border border-[#c9833a]/30">
            <HelpCircle className="w-3.5 h-3.5 text-[#c9833a]" />
            <span>DAILY CUSTOMER ENGAGEMENT</span>
          </div>
          <h2 className="font-serif font-bold text-2xl text-white">Daily Palate Quiz Manager</h2>
          <p className="font-sans text-xs text-[#e8dcc8]/80 max-w-xl mt-1">
            Create and schedule 3–4 choice coffee & beverage quizzes. Customer answers and one attempt per day are strictly validated on the backend with automatic loyalty rewards.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#c9833a] hover:bg-[#b7742d] text-[#14080a] font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Quiz</span>
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-2 bg-[#1b0c0e] p-2 rounded-2xl border border-[#c9833a]/25 max-w-md">
        <Search className="w-4 h-4 text-[#c9833a] ml-2 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search quizzes by title or date (YYYY-MM-DD)..."
          className="bg-transparent text-xs text-[#faf6ee] placeholder:text-[#e8dcc8]/40 focus:outline-none w-full"
        />
      </div>

      {/* Quizzes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredQuizzes.map((q) => (
          <div
            key={q.id}
            className="bg-[#17080a] rounded-2xl border border-[#c9833a]/25 p-5 flex flex-col justify-between space-y-4 shadow-sm"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <span className="font-mono text-[10px] text-[#c9833a] block mb-1">
                    Date: {q.dateKey}
                  </span>
                  <h3 className="font-serif font-bold text-lg text-white leading-snug">{q.title}</h3>
                </div>

                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold shrink-0">
                  {q.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <p className="font-sans text-xs text-[#e8dcc8]/70 line-clamp-2 mb-3">{q.description}</p>

              <div className="flex items-center gap-2 text-xs font-mono text-[#f4d19b] bg-[#351016]/40 p-2 rounded-xl border border-[#c9833a]/20">
                <Award className="w-3.5 h-3.5 text-[#c9833a]" />
                <span>{q.rewardDescription || `+${q.rewardValue} ${q.rewardType}`}</span>
                <span className="text-[#e8dcc8]/40">·</span>
                <span>{q.questions.length} Questions</span>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-[#c9833a]/15">
              <span className="text-[10px] font-mono text-[#e8dcc8]/50">ID: {q.id}</span>

              {isAdmin && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(q)}
                    className="p-1.5 rounded-lg text-[#c9833a] hover:bg-[#c9833a]/20 cursor-pointer"
                    title="Edit Quiz"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingId(q.id)}
                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/50 cursor-pointer"
                    title="Delete Quiz"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1b0c0e] border border-rose-500/40 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-serif font-bold text-lg text-white">Delete Daily Quiz?</h3>
            <p className="text-xs text-[#e8dcc8]/80">
              Are you sure you want to delete this quiz? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#e8dcc8]/80 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onDeleteQuiz(deletingId);
                  setDeletingId(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#1b0c0e] border border-[#c9833a]/30 rounded-3xl p-6 sm:p-8 max-w-2xl w-full my-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#c9833a]/20 pb-4">
              <h3 className="font-serif font-bold text-xl text-white">
                {modalMode === 'create' ? 'Create Daily Quiz' : 'Edit Daily Quiz'}
              </h3>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="text-[#e8dcc8]/60 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#f4d19b] mb-1">Quiz Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Specialty Coffee & Terroir Mastery"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#14080a] border border-[#c9833a]/30 text-white text-xs focus:outline-none focus:border-[#c9833a]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#f4d19b] mb-1">
                    Scheduled Date (YYYY-MM-DD)
                  </label>
                  <input
                    type="date"
                    value={formDateKey}
                    onChange={(e) => setFormDateKey(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#14080a] border border-[#c9833a]/30 text-white text-xs focus:outline-none focus:border-[#c9833a]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#f4d19b] mb-1">
                    Reward Benefit
                  </label>
                  <input
                    type="text"
                    value={formRewardDescription}
                    onChange={(e) => setFormRewardDescription(e.target.value)}
                    placeholder="+1 Bonus Loyalty Stamp"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#14080a] border border-[#c9833a]/30 text-white text-xs focus:outline-none focus:border-[#c9833a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#f4d19b] mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#14080a] border border-[#c9833a]/30 text-white text-xs focus:outline-none focus:border-[#c9833a]"
                />
              </div>

              {/* Questions Section */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-t border-[#c9833a]/20 pt-4">
                  <h4 className="font-serif font-bold text-base text-[#f4d19b]">
                    Questions & 3–4 Choices
                  </h4>
                  {formQuestions.length < 5 && (
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#c9833a]/20 text-[#f4d19b] hover:bg-[#c9833a]/30 text-xs font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Question</span>
                    </button>
                  )}
                </div>

                {formQuestions.map((q, qIdx) => (
                  <div
                    key={qIdx}
                    className="p-4 rounded-2xl bg-[#14080a] border border-[#c9833a]/20 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-[#c9833a] font-bold">
                        Question #{qIdx + 1}
                      </span>
                      {formQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(qIdx)}
                          className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => {
                        const updated = [...formQuestions];
                        updated[qIdx].question = e.target.value;
                        setFormQuestions(updated);
                      }}
                      placeholder="Enter question text..."
                      className="w-full px-3 py-2 rounded-lg bg-[#1e0c0f] border border-[#c9833a]/25 text-white text-xs"
                      required
                    />

                    {/* Answer Options */}
                    <div className="space-y-2">
                      <label className="block text-[11px] font-mono text-[#e8dcc8]/70">
                        Answer Choices (Select radio button for the correct answer):
                      </label>
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-opt-${qIdx}`}
                            checked={q.correctOptionIndex === optIdx}
                            onChange={() => {
                              const updated = [...formQuestions];
                              updated[qIdx].correctOptionIndex = optIdx;
                              setFormQuestions(updated);
                            }}
                            className="text-[#c9833a] focus:ring-[#c9833a]"
                            title="Mark as correct answer"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const updated = [...formQuestions];
                              updated[qIdx].options[optIdx] = e.target.value;
                              setFormQuestions(updated);
                            }}
                            placeholder={`Choice ${String.fromCharCode(65 + optIdx)}`}
                            className="flex-1 px-3 py-1.5 rounded-lg bg-[#1e0c0f] border border-[#c9833a]/20 text-white text-xs"
                          />
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-[#e8dcc8]/70 mb-1">
                        Barista Explanation (Shown after completion):
                      </label>
                      <input
                        type="text"
                        value={q.explanation}
                        onChange={(e) => {
                          const updated = [...formQuestions];
                          updated[qIdx].explanation = e.target.value;
                          setFormQuestions(updated);
                        }}
                        placeholder="Why is this answer correct?"
                        className="w-full px-3 py-1.5 rounded-lg bg-[#1e0c0f] border border-[#c9833a]/20 text-white text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#c9833a]/20">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#e8dcc8]/70 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-full bg-[#c9833a] hover:bg-[#b7742d] text-[#14080a] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
