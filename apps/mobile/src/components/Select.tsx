import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { radius, spacing, useTheme } from '../theme';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

/** Dropdown (§48, §50) — Bottom sheet-ээр сонгоно */
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Сонгох',
}: {
  label?: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (v: T) => void;
  placeholder?: string;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText variant="label" tone="textSoft">
          {label}
        </AppText>
      ) : null}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}
      >
        <AppText tone={current ? 'text' : 'faint'} numberOfLines={1} style={styles.flex}>
          {current?.label ?? placeholder}
        </AppText>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label ?? placeholder}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
              style={[styles.option, { backgroundColor: active ? colors.accentSoft : 'transparent' }]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <View style={styles.flex}>
                <AppText weight={active ? '700' : '500'} tone={active ? 'accent' : 'text'}>
                  {o.label}
                </AppText>
                {o.hint ? (
                  <AppText variant="caption" tone="muted">
                    {o.hint}
                  </AppText>
                ) : null}
              </View>
              {active ? <Ionicons name="checkmark" size={20} color={colors.accent} /> : null}
            </Pressable>
          );
        })}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  field: { flexDirection: 'row', alignItems: 'center', minHeight: 50, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, gap: spacing.sm },
  option: { flexDirection: 'row', alignItems: 'center', minHeight: 50, paddingHorizontal: spacing.md, borderRadius: radius.md, gap: spacing.sm },
  flex: { flex: 1 },
});
