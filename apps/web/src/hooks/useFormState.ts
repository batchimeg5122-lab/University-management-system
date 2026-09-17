import { useCallback, useState, type ChangeEvent } from 'react';

/** Жижиг формуудад зориулсан энгийн state helper */
export function useFormState<T extends Record<string, string | number | boolean | null | undefined>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const bind = useCallback(
    (key: keyof T) => ({
      value: (values[key] ?? '') as string | number,
      onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setValues((v) => ({ ...v, [key]: e.target.value })),
    }),
    [values],
  );
  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => setValues((v) => ({ ...v, [key]: value })), []);
  const reset = useCallback((next: T) => setValues(next), []);
  return { values, bind, set, reset };
}
