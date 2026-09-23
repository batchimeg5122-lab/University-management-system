import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Button } from '../../components';
import { BRAND } from '../../constants/env';
import { useSettingsStore } from '../../store/settings.store';
import { radius, spacing, useTheme } from '../../theme';

interface Slide {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  points: { icon: keyof typeof Ionicons.glyphMap; label: string }[];
}

const SLIDES: Slide[] = [
  {
    key: 'study',
    icon: 'school-outline',
    title: 'Сургалт тань гарт тань',
    text: 'Хуваарь, дүн, GPA, ирц, төлбөрөө компьютергүйгээр хаанаас ч харна.',
    points: [
      { icon: 'calendar-outline', label: 'Өдөр, долоо хоногийн хуваарь' },
      { icon: 'ribbon-outline', label: 'Баталгаажсан дүн, GPA' },
      { icon: 'folder-open-outline', label: 'Хичээлийн материал татах' },
    ],
  },
  {
    key: 'notify',
    icon: 'notifications-outline',
    title: 'Юуг ч бүү мартаарай',
    text: 'Хичээл эхлэхээс өмнө сануулга ирнэ. Дүн, хуваарь өөрчлөгдөхөд шууд мэдэгдэнэ.',
    points: [
      { icon: 'alarm-outline', label: 'Хичээлийн өмнөх сануулга' },
      { icon: 'flash-outline', label: 'Шууд (realtime) мэдэгдэл' },
      { icon: 'hourglass-outline', label: 'Шалгалт, улирлын тоолуур' },
    ],
  },
  {
    key: 'secure',
    icon: 'shield-checkmark-outline',
    title: 'Аюулгүй бөгөөд хялбар',
    text: 'Face ID / хурууны хээгээр түгжинэ. Багш ирц, дүнгээ утаснаасаа оруулна.',
    points: [
      { icon: 'scan-outline', label: 'Биометр түгжээ' },
      { icon: 'checkmark-done-outline', label: 'Багш: ирц, дүн, материал' },
      { icon: 'cloud-offline-outline', label: 'Интернетгүй үед ч харах' },
    ],
  },
];

/** Апп-ыг анх нээхэд харагдах 3 слайд */
export function OnboardingScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const update = useSettingsStore((s) => s.update);
  const list = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  const finish = () => update({ onboarded: true });
  const next = () => (last ? finish() : list.current?.scrollToIndex({ index: index + 1, animated: true }));
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={styles.top}>
        <View style={styles.brand}>
          <Image source={require('../../../assets/logo.png')} style={styles.logo} />
          <AppText weight="700">{BRAND.shortName}</AppText>
        </View>
        {!last ? (
          <Pressable onPress={finish} hitSlop={12} accessibilityRole="button" style={styles.skip}>
            <AppText tone="muted" weight="600">
              Алгасах
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        ref={list}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.hero, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name={item.icon} size={72} color={colors.accent} />
            </View>
            <AppText variant="display" center>
              {item.title}
            </AppText>
            <AppText tone="muted" center style={styles.text}>
              {item.text}
            </AppText>
            <View style={styles.points}>
              {item.points.map((p) => (
                <View key={p.label} style={[styles.point, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name={p.icon} size={20} color={colors.accent} />
                  <AppText weight="500">{p.label}</AppText>
                </View>
              ))}
            </View>
          </View>
        )}
      />

      <View style={styles.bottom}>
        <View style={styles.dots} accessibilityLabel={`${index + 1}/${SLIDES.length}`}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[styles.dot, { backgroundColor: i === index ? colors.accent : colors.borderStrong, width: i === index ? 22 : 8 }]} />
          ))}
        </View>
        <Button title={last ? 'Эхлэх' : 'Дараах'} icon={last ? 'rocket-outline' : 'arrow-forward'} onPress={next} fullWidth />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing.sm, minHeight: 48 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: { width: 32, height: 32, borderRadius: 8 },
  skip: { minHeight: 44, justifyContent: 'center' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.md },
  hero: { width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  text: { maxWidth: 340 },
  points: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.md },
  point: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  bottom: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
});
