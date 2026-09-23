import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { errorMessage } from '../api/client';
import { SkeletonList } from './Skeleton';
import { EmptyState, ErrorState } from './States';

interface Props<T> {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
  /** Хоосон эсэхийг шалгах — жишээ нь (d) => d.length === 0 */
  isEmpty?: (data: T) => boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: Parameters<typeof EmptyState>[0]['icon'];
  skeleton?: ReactNode;
}

/**
 * Loading → Skeleton, Error → ErrorState(retry), Empty → EmptyState (§45, §46)
 * Offline үед cache-д өгөгдөл байвал түүнийг харуулна.
 */
export function QueryView<T>({ query, children, isEmpty, emptyTitle = 'Мэдээлэл алга', emptyMessage, emptyIcon, skeleton }: Props<T>) {
  if (query.data !== undefined) {
    if (isEmpty?.(query.data)) return <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} />;
    return <>{children(query.data)}</>;
  }
  if (query.isError) return <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />;
  return <>{skeleton ?? <SkeletonList />}</>;
}
