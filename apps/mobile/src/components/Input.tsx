import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { font, radius, spacing, useTheme } from '../theme';
import { AppText } from './AppText';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Нууц үг харах/нуух товчтой */
  password?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(function Input({ label, error, hint, icon, password, style, multiline, ...rest }, ref) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText variant="label" tone="textSoft" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.field,
          multiline && styles.multiline,
          { backgroundColor: colors.surface, borderColor: error ? colors.danger : focused ? colors.accent : colors.borderStrong },
        ]}
      >
        {icon ? <Ionicons name={icon} size={18} color={colors.faint} style={styles.icon} /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.faint}
          secureTextEntry={password ? hidden : rest.secureTextEntry}
          multiline={multiline}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[styles.input, { color: colors.text }, multiline && styles.inputMultiline, style]}
          {...rest}
        />
        {password ? (
          <Pressable
            onPress={() => setHidden((v) => !v)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Нууц үг харах' : 'Нууц үг нуух'}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" tone="danger" style={styles.helper}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="faint" style={styles.helper}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { marginLeft: 2 },
  field: { flexDirection: 'row', alignItems: 'center', minHeight: 50, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md },
  multiline: { alignItems: 'flex-start', paddingVertical: spacing.sm },
  icon: { marginRight: spacing.sm },
  input: { flex: 1, fontSize: font.md, paddingVertical: 10 },
  inputMultiline: { minHeight: 90, textAlignVertical: 'top' },
  helper: { marginLeft: 2 },
});
