import type { LetterBucket } from '@/types/reports';

const ORDER: LetterBucket[] = ['A', 'B', 'C', 'D', 'F'];

export function GradeDistributionChart({ distribution }: { distribution: Record<LetterBucket, number> }) {
  const max = Math.max(1, ...ORDER.map((k) => distribution[k]));
  const total = ORDER.reduce((s, k) => s + distribution[k], 0);
  return (
    <div className="flex h-48 items-end gap-3 sm:gap-5" role="img" aria-label="Үнэлгээний тархалт">
      {ORDER.map((k) => {
        const v = distribution[k];
        const h = (v / max) * 100;
        return (
          <div key={k} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <span className="num text-[13px] font-medium text-ink">{v}</span>
            <div
              className={k === 'F' ? 'w-full rounded-t-md bg-danger/70' : 'w-full rounded-t-md bg-accent'}
              style={{ height: `${Math.max(h, v ? 4 : 1)}%`, opacity: v ? 1 : 0.15 }}
            />
            <div className="flex flex-col items-center">
              <span className="text-sm font-semibold text-ink">{k}</span>
              <span className="num text-xs text-faint">{total ? Math.round((v / total) * 100) : 0}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
