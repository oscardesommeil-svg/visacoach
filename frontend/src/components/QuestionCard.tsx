import type { Question } from "../lib/api";

interface QuestionCardProps {
  question: Question;
  index: number;
  total: number;
  selected?: string;
  onSelect: (value: string) => void;
}

/**
 * Carte affichant une question du diagnostic et ses options sélectionnables.
 */
export default function QuestionCard({
  question,
  index,
  total,
  selected,
  onSelect,
}: QuestionCardProps) {
  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          Question {index + 1} / {total}
        </span>
      </div>

      <h2 className="mb-6 text-xl font-bold text-slate-800">{question.label}</h2>

      <div className="space-y-3">
        {question.options.map((option) => {
          const isSelected = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                isSelected
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50"
              }`}
            >
              <span
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                  isSelected ? "border-brand-600" : "border-slate-300"
                }`}
              >
                {isSelected && (
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />
                )}
              </span>
              <span className="font-medium">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
