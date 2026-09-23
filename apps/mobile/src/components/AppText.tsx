import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import { font, useTheme, type ThemeColors } from '../theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption' | 'small';
type Tone = keyof Pick<ThemeColors, 'text' | 'textSoft' | 'muted' | 'faint' | 'accent' | 'success' | 'danger' | 'warn' | 'gold' | 'onAccent'>;

export interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
  weight?: TextStyle['fontWeight'];
  center?: boolean;
  mono?: boolean;
}

const VARIANTS: Record<Variant, TextStyle> = {
  display: { fontSize: font.xxl, fontWeight: '700', letterSpacing: -0.3 },
  title: { fontSize: font.xl, fontWeight: '700' },
  heading: { fontSize: font.lg, fontWeight: '600' },
  body: { fontSize: font.md, lineHeight: 21 },
  label: { fontSize: font.sm, fontWeight: '600' },
  caption: { fontSize: font.sm, lineHeight: 18 },
  small: { fontSize: font.xs },
};

export function AppText({ variant = 'body', tone = 'text', weight, center, mono, style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  return (
    <Text
      {...rest}
      style={[
        VARIANTS[variant],
        { color: colors[tone] },
        weight ? { fontWeight: weight } : null,
        center ? styles.center : null,
        mono ? styles.mono : null,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  mono: { fontVariant: ['tabular-nums'] },
});
