import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import { initials } from '../utils/format';
import { AppText } from './AppText';

export function Avatar({ name, uri, size = 44 }: { name?: string | null; uri?: string | null; size?: number }) {
  const { colors } = useTheme();
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={[box, { backgroundColor: colors.surfaceAlt }]} accessibilityLabel={name ?? 'Профайл зураг'} />;
  return (
    <View style={[styles.fallback, box, { backgroundColor: colors.accentSoft }]}>
      <AppText weight="700" style={{ color: colors.accent, fontSize: size * 0.36 }}>
        {initials(name).toUpperCase()}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({ fallback: { alignItems: 'center', justifyContent: 'center' } });
