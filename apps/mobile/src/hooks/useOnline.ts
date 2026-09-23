import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

/** Интернет холболттой эсэх (NetInfo → onlineManager) */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
    () => true,
  );
}
