import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { authApi } from '../../api/auth.api';
import { errorMessage } from '../../api/client';
import { AppText, Avatar, Badge, BottomSheet, Button, Card, InfoRow, Input, ListItem, Screen, ThemeSelector, useToast } from '../../components';
import { useMe } from '../../hooks/queries';
import { useRefresh } from '../../hooks/useRefresh';
import { uploadAvatar } from '../../services/files';
import { useAuthStore } from '../../store/auth.store';
import { spacing, useTheme } from '../../theme';
import type { StudentStatus } from '../../types/models';
import { ROLE_LABEL, STUDENT_STATUS_LABEL } from '../../utils/constants';
import { date } from '../../utils/format';
import Constants from 'expo-constants';
import { SecuritySettingsCard } from './SecuritySettingsCard';

/** §8 Профайл: сургалтын мэдээлэл зөвхөн харах, утас/зураг өөрчлөх, §53 Гарах */
export function ProfileScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const toast = useToast();
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const signOut = useAuthStore((s) => s.signOut);
  const me = useMe();
  const { refreshing, onRefresh } = useRefresh(me.refetch);

  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phone, setPhone] = useState(profile?.user.phone ?? '');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (!profile) return null;
  const { user, student, employee } = profile;

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return toast.show('Зургийн сан руу хандах зөвшөөрөл өгнө үү.', 'danger');
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    setUploading(true);
    try {
      const next = await uploadAvatar({ uri: a.uri, name: a.fileName ?? 'avatar.jpg', mimeType: a.mimeType ?? 'image/jpeg', size: a.fileSize });
      setProfile(next);
      toast.show('Профайл зураг шинэчлэгдлээ', 'success');
    } catch (err) {
      toast.show(errorMessage(err), 'danger');
    } finally {
      setUploading(false);
    }
  };

  const savePhone = async () => {
    setPhoneError(null);
    const v = phone.replace(/\s/g, '');
    if (v && !/^(\+?976)?[0-9]{8}$/.test(v)) return setPhoneError('Утасны дугаар 8 оронтой байна.');
    setSaving(true);
    try {
      setProfile(await authApi.updateMe({ phone: v || null }));
      setPhoneOpen(false);
      toast.show('Утасны дугаар хадгалагдлаа', 'success');
    } catch (err) {
      setPhoneError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () =>
    Alert.alert('Гарах', 'Та системээс гарахдаа итгэлтэй байна уу?', [
      { text: 'Болих', style: 'cancel' },
      { text: 'Гарах', style: 'destructive', onPress: () => void signOut() },
    ]);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.header}>
        <Pressable onPress={pickAvatar} disabled={uploading} accessibilityRole="button" accessibilityLabel="Профайл зураг солих">
          <Avatar name={user.full_name} uri={user.avatar_url} size={88} />
          <View style={[styles.camera, { backgroundColor: colors.accent, borderColor: colors.background }]}>
            <Ionicons name={uploading ? 'hourglass-outline' : 'camera'} size={14} color={colors.onAccent} />
          </View>
        </Pressable>
        <AppText variant="title" center>
          {user.full_name}
        </AppText>
        <View style={styles.badges}>
          <Badge label={ROLE_LABEL[user.role]} tone="accent" />
          {student ? <Badge label={STUDENT_STATUS_LABEL[student.status as StudentStatus] ?? student.status} tone={student.status === 'active' ? 'success' : 'warn'} /> : null}
        </View>
      </View>

      {student ? (
        <Card>
          <AppText variant="label" tone="muted" style={styles.cardTitle}>
            СУРГАЛТЫН МЭДЭЭЛЭЛ
          </AppText>
          <InfoRow label="Оюутны код" value={student.student_code} />
          <InfoRow label="Овог" value={student.last_name} />
          <InfoRow label="Нэр" value={student.first_name} />
          <InfoRow label="Сургууль" value={student.school_name} />
          <InfoRow label="Тэнхим" value={student.department_name} />
          <InfoRow label="Хөтөлбөр" value={student.program_name} />
          <InfoRow label="Анги" value={student.class_name} />
          <InfoRow label="Курс" value={student.year_level ? `${student.year_level}-р курс` : null} />
          <InfoRow label="Элссэн он" value={student.enrollment_year} last />
        </Card>
      ) : null}

      {employee ? (
        <Card>
          <AppText variant="label" tone="muted" style={styles.cardTitle}>
            АЖЛЫН МЭДЭЭЛЭЛ
          </AppText>
          <InfoRow label="Ажилтны код" value={employee.employee_code} />
          <InfoRow label="Тэнхим" value={employee.department_name} />
          <InfoRow label="Албан тушаал" value={employee.position} />
          <InfoRow label="Мэргэшил" value={employee.specialization} />
          <InfoRow label="Зэрэг" value={employee.academic_degree} />
          <InfoRow label="Ажилд орсон" value={date(employee.hired_at)} last />
        </Card>
      ) : null}

      <Card>
        <AppText variant="label" tone="muted" style={styles.cardTitle}>
          ХОЛБОО БАРИХ
        </AppText>
        <InfoRow label="И-мэйл" value={user.email} />
        <ListItem
          title="Утас"
          subtitle={user.phone || 'Оруулаагүй'}
          icon="call-outline"
          divider={false}
          onPress={() => {
            setPhone(user.phone ?? '');
            setPhoneOpen(true);
          }}
          right={<AppText variant="caption" tone="accent" weight="600">Засах</AppText>}
        />
      </Card>

      <Card>
        <AppText variant="label" tone="muted" style={styles.cardTitle}>
          ХАРАГДАХ БАЙДАЛ
        </AppText>
        <ThemeSelector />
        <AppText variant="small" tone="faint" style={styles.themeHint}>
          "Систем" сонговол утасны тохиргоог дагаж автоматаар солигдоно.
        </AppText>
      </Card>

      <SecuritySettingsCard />

      <Card padded={false} style={styles.menu}>
        {student ? <ListItem title="Цахим оюутны үнэмлэх" icon="id-card-outline" onPress={() => navigation.navigate('StudentCard')} /> : null}
        <ListItem title="Академик календарь" icon="calendar-number-outline" onPress={() => navigation.navigate('Calendar')} />
        <ListItem title="Шалгалтын хуваарь" icon="calendar-outline" onPress={() => navigation.navigate('Exams')} />
        <ListItem title="Зарлал" icon="megaphone-outline" onPress={() => navigation.navigate('Announcements')} />
        <ListItem title="Тодорхойлолт шалгах" icon="shield-checkmark-outline" onPress={() => navigation.navigate('VerifyCertificate')} divider={false} />
      </Card>

      <Button title="Гарах" icon="log-out-outline" variant="danger" onPress={confirmLogout} fullWidth />
      <AppText variant="small" tone="faint" center>
        Их Засаг Mobile · v{Constants.expoConfig?.version ?? '1.0.0'}
      </AppText>

      <BottomSheet
        visible={phoneOpen}
        onClose={() => setPhoneOpen(false)}
        title="Утасны дугаар"
        footer={<Button title="Хадгалах" onPress={savePhone} loading={saving} fullWidth />}
      >
        <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="99112233" error={phoneError} icon="call-outline" maxLength={12} />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  camera: { position: 'absolute', right: 0, bottom: 0, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  badges: { flexDirection: 'row', gap: spacing.sm },
  cardTitle: { marginBottom: spacing.xs },
  menu: { paddingHorizontal: spacing.lg },
  themeHint: { marginTop: spacing.sm },
});
