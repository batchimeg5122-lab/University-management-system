import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { AppText, Button, Card, QueryView, Screen, Skeleton } from '../../components';
import { BRAND, env } from '../../constants/env';
import { useStudentCard } from '../../hooks/queries';
import { useOnline } from '../../hooks/useOnline';
import type { AppScreenProps } from '../../navigation/types';
import { radius, spacing, useTheme } from '../../theme';
import type { StudentCardData } from '../../types/models';
import { STUDENT_STATUS_LABEL } from '../../utils/constants';
import { date, initials } from '../../utils/format';

const pad = (n: number) => String(n).padStart(2, '0');

/** Секунд бүр шинэчлэгдэх цаг — screenshot биш гэдгийг шалгагч харна */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function LiveDot() {
  const { colors } = useTheme();
  const v = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View style={[styles.liveDot, { backgroundColor: colors.success, opacity: v }]} />;
}

function Front({ data, now }: { data: StudentCardData; now: Date }) {
  const { colors } = useTheme();
  const c = data.card;
  return (
    <View style={styles.face}>
      <View style={[styles.band, { backgroundColor: '#1E4B8F' }]}>
        <Image source={require('../../../assets/logo.png')} style={styles.bandLogo} />
        <View style={styles.flex}>
          <AppText weight="700" style={styles.onBand} numberOfLines={1}>
            {BRAND.name.toUpperCase()}
          </AppText>
          <AppText variant="small" weight="600" style={styles.onBandSoft}>
            ОЮУТНЫ ҮНЭМЛЭХ · STUDENT ID
          </AppText>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.photoRow}>
          {c.avatar_url ? (
            <Image source={{ uri: c.avatar_url }} style={[styles.photo, { borderColor: colors.border }]} accessibilityLabel="Оюутны зураг" />
          ) : (
            <View style={[styles.photo, styles.photoEmpty, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}>
              <AppText variant="display" tone="accent">
                {initials(c.full_name).toUpperCase()}
              </AppText>
            </View>
          )}
          <View style={styles.nameCol}>
            <AppText variant="caption" tone="muted">
              {c.last_name}
            </AppText>
            <AppText variant="title" numberOfLines={2}>
              {c.first_name}
            </AppText>
            <AppText variant="heading" tone="accent" mono style={styles.code}>
              {c.student_code}
            </AppText>
          </View>
        </View>

        <View style={styles.fields}>
          <Field label="Хөтөлбөр" value={c.program_name} />
          <Field label="Тэнхим" value={c.department_name} />
          <View style={styles.twoCol}>
            <Field label="Анги" value={c.class_name} half />
            <Field label="Курс" value={c.year_level ? `${c.year_level}-р курс` : null} half />
          </View>
          <View style={styles.twoCol}>
            <Field label="Элссэн он" value={c.enrollment_year ? String(c.enrollment_year) : null} half />
            <Field label="Хүчинтэй" value={c.valid_until ? date(c.valid_until) : null} half />
          </View>
        </View>
      </View>

      <View style={[styles.footer, { backgroundColor: data.valid ? colors.successSoft : colors.dangerSoft }]}>
        <Ionicons name={data.valid ? 'checkmark-circle' : 'close-circle'} size={18} color={data.valid ? colors.success : colors.danger} />
        <AppText variant="caption" weight="700" style={{ color: data.valid ? colors.success : colors.danger }}>
          {data.valid ? 'ХҮЧИНТЭЙ' : data.reason === 'inactive' ? STUDENT_STATUS_LABEL[c.status].toUpperCase() : 'ХУГАЦАА ДУУССАН'}
        </AppText>
        <View style={styles.flex} />
        <LiveDot />
        <AppText variant="caption" mono weight="600" tone="textSoft">
          {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
        </AppText>
      </View>
    </View>
  );
}

function Field({ label, value, half }: { label: string; value: string | null | undefined; half?: boolean }) {
  return (
    <View style={half ? styles.half : undefined}>
      <AppText variant="small" tone="muted">
        {label}
      </AppText>
      <AppText weight="600" numberOfLines={2}>
        {value || '—'}
      </AppText>
    </View>
  );
}

function Back({ data, now, online, qrSize }: { data: StudentCardData; now: Date; online: boolean; qrSize: number }) {
  const { colors } = useTheme();
  const left = Math.max(0, Math.floor((new Date(data.expires_at).getTime() - now.getTime()) / 1000));
  const expired = left === 0;
  const url = `${env.webUrl}/id/${data.token}`;

  return (
    <View style={[styles.face, styles.backFace]}>
      <AppText variant="heading" center>
        Шалгуулах QR код
      </AppText>
      <AppText variant="caption" tone="muted" center>
        Хамгаалагч, номын сангийн ажилтан утасныхаа камераар уншуулна
      </AppText>
      <View style={styles.qrBox}>
        <QRCode value={url} size={qrSize} backgroundColor="#FFFFFF" color="#172033" logo={require('../../../assets/logo.png')} logoSize={qrSize * 0.18} logoBackgroundColor="#FFFFFF" logoBorderRadius={6} />
        {expired ? (
          <View style={styles.qrExpired}>
            <Ionicons name={online ? 'refresh' : 'cloud-offline-outline'} size={36} color="#B42318" />
            <AppText weight="700" center style={styles.qrExpiredText}>
              {online ? 'Шинэчилж байна...' : 'QR хугацаа дууссан.\nИнтернетэд холбогдоно уу.'}
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={styles.timerRow}>
        <Ionicons name="time-outline" size={16} color={left < 60 ? colors.warn : colors.muted} />
        <AppText variant="caption" mono tone={left < 60 ? 'warn' : 'muted'}>
          {expired ? 'Хүчингүй' : `${pad(Math.floor(left / 60))}:${pad(left % 60)} хүчинтэй`}
        </AppText>
      </View>
      <AppText variant="small" tone="faint" center>
        QR код 2 минут тутамд автоматаар шинэчлэгдэнэ. Screenshot хийсэн код хэдхэн минутын дараа хүчингүй болно.
      </AppText>
    </View>
  );
}

/** Цахим оюутны үнэмлэх — урд тал: мэдээлэл, ар тал: QR (дарж эргүүлнэ) */
export function StudentCardScreen({ navigation }: AppScreenProps<'StudentCard'>) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const focused = useIsFocused();
  const online = useOnline();
  const q = useStudentCard(focused);
  const now = useNow();
  const [flipped, setFlipped] = useState(false);
  const flip = useRef(new Animated.Value(0)).current;

  const cardWidth = Math.min(width - spacing.lg * 2, 420);
  const qrSize = Math.min(cardWidth - 120, 220);
  // Урд, ар тал ижил өндөртэй байхын тулд
  const minHeight = qrSize + 280;

  // Token дуусахаас 60 сек өмнө шинэчилнэ
  const expiresAt = q.data ? new Date(q.data.expires_at).getTime() : 0;
  const needRefresh = !!q.data && expiresAt - now.getTime() < 60_000;
  useEffect(() => {
    if (needRefresh && online && focused && !q.isFetching) void q.refetch();
  }, [needRefresh, online, focused, q]);

  const toggle = () => {
    Animated.spring(flip, { toValue: flipped ? 0 : 1, friction: 8, tension: 12, useNativeDriver: true }).start();
    setFlipped((v) => !v);
  };

  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const cardStyle = [styles.card, { width: cardWidth, minHeight, backgroundColor: colors.surface, borderColor: colors.border }];

  return (
    <Screen contentStyle={styles.center}>
      <QueryView query={q} skeleton={<Skeleton width={cardWidth} height={cardWidth * 1.35} style={{ borderRadius: radius.lg + 4 }} />}>
        {(data) => (
          <>
            <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={flipped ? 'Үнэмлэхийн урд талыг харах' : 'QR код харах'}>
              <View style={{ width: cardWidth }}>
                <Animated.View style={[cardStyle, { transform: [{ perspective: 1200 }, { rotateY: frontRotate }] }]}>
                  <Front data={data} now={now} />
                </Animated.View>
                <Animated.View style={[cardStyle, styles.absolute, { transform: [{ perspective: 1200 }, { rotateY: backRotate }] }]}>
                  <Back data={data} now={now} online={online} qrSize={qrSize} />
                </Animated.View>
              </View>
            </Pressable>

            <Button
              title={flipped ? 'Үнэмлэх харах' : 'QR код харуулах'}
              icon={flipped ? 'card-outline' : 'qr-code-outline'}
              onPress={toggle}
              style={{ width: cardWidth }}
            />

            {!data.card.avatar_url ? (
              <Card tone="warn" style={{ width: cardWidth }}>
                <AppText variant="caption" tone="warn">
                  Үнэмлэхэнд таны зураг байхгүй байна. Шалгагч таныг танихын тулд профайл зургаа оруулна уу.
                </AppText>
                <Button title="Зураг оруулах" size="sm" variant="secondary" icon="camera-outline" onPress={() => navigation.navigate('MainTabs', { screen: 'ProfileTab' })} style={styles.mt} />
              </Card>
            ) : null}

            {!data.valid ? (
              <Card tone="danger" style={{ width: cardWidth }}>
                <AppText variant="caption" tone="danger">
                  {data.reason === 'inactive'
                    ? 'Таны суралцах төлөв идэвхгүй байгаа тул үнэмлэх хүчингүй байна. Сургалтын албанд хандана уу.'
                    : 'Одоогийн улирал дууссан тул үнэмлэх хүчингүй байна. Шинэ улирал эхлэхэд автоматаар сэргэнэ.'}
                </AppText>
              </Card>
            ) : null}

            <AppText variant="small" tone="faint" center style={{ width: cardWidth }}>
              Хүчинтэй хугацаа нь одоогийн улирлын төгсгөл хүртэл. Үнэмлэхийг дарж эргүүлнэ.
            </AppText>
          </>
        )}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center' },
  card: {
    borderRadius: radius.lg + 4,
    borderWidth: 1,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  absolute: { position: 'absolute', top: 0, left: 0, bottom: 0 },
  face: { flex: 1 },
  backFace: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  band: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  bandLogo: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#FFFFFF' },
  onBand: { color: '#FFFFFF', fontSize: 14, letterSpacing: 0.5 },
  onBandSoft: { color: 'rgba(255,255,255,0.8)', letterSpacing: 1 },
  body: { padding: spacing.lg, gap: spacing.lg },
  photoRow: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  photo: { width: 96, height: 120, borderRadius: radius.md, borderWidth: 1 },
  photoEmpty: { alignItems: 'center', justifyContent: 'center' },
  nameCol: { flex: 1, gap: 2 },
  code: { letterSpacing: 2, marginTop: spacing.xs },
  fields: { gap: spacing.md },
  twoCol: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  qrBox: { padding: spacing.md, backgroundColor: '#FFFFFF', borderRadius: radius.md, marginVertical: spacing.sm },
  qrExpired: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.93)', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.md },
  qrExpiredText: { color: '#B42318' },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mt: { marginTop: spacing.sm, alignSelf: 'flex-start' },
});
