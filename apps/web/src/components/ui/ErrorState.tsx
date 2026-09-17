import { AlertCircle } from 'lucide-react';
import { errorMessage } from '@/lib/api';
import { Button } from './Button';

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <AlertCircle className="mb-3 h-6 w-6 text-danger" />
      <p className="font-medium text-ink">Мэдээлэл ачаалж чадсангүй</p>
      <p className="mt-1 max-w-sm text-[13px] text-muted">{errorMessage(error)}</p>
      {onRetry && (
        <Button className="mt-4" size="sm" onClick={onRetry}>
          Дахин оролдох
        </Button>
      )}
    </div>
  );
}
