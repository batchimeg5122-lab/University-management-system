import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { AppText, Button, Card, Input, Screen } from '../../components';
import type { AuthScreenProps } from '../../navigation/types';
import { supabase } from '../../services/supabase';
import { authApi } from '../../api/auth.api';

/**
 * Нууц үг сэргээх: и-мэйл рүү холбоос илгээнэ.
 * Оюутны код оруулсан бол бүртгэлтэй и-мэйлийг олж илгээнэ.
 */
export function ForgotPasswordScreen({ route, navigation }: AuthScreenProps<'ForgotPassword'>) {
  const [value, setValue] = useState(route.params?.email ?? '');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const id = value.trim();
    if (!id) return setError('И-мэйл эсвэл кодоо оруулна уу.');
    setLoading(true);
    try {
      let email = id;
      if (!id.includes('@')) email = (await authApi.lookup(id).catch(() => ({ email: '' }))).email;
      // Бүртгэлтэй эсэхийг задруулахгүйн тулд үргэлж ижил мессеж харуулна
      if (email) await supabase.auth.resetPasswordForEmail(email.toLowerCase());
      setSent(true);
    } catch {
      setError('Хүсэлт илгээж чадсангүй. Интернет холболтоо шалгана уу.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboard>
      <AppText tone="muted">
        Бүртгэлтэй и-мэйл хаяг эсвэл оюутны/ажилтны кодоо оруулна уу. Нууц үг сэргээх холбоосыг и-мэйлээр илгээнэ.
      </AppText>
      {sent ? (
        <Card tone="success">
          <AppText tone="success">
            Хэрэв энэ хаяг бүртгэлтэй бол нууц үг сэргээх холбоос илгээгдлээ. И-мэйлээ шалгана уу. И-мэйлгүй оюутан бол Сургалтын албанд хандана уу.
          </AppText>
        </Card>
      ) : null}
      <Input label="И-мэйл / код" value={value} onChangeText={setValue} autoCapitalize="none" keyboardType="email-address" error={error} icon="mail-outline" />
      <Button title="Холбоос илгээх" onPress={submit} loading={loading} fullWidth />
      <Button title="Нэвтрэх рүү буцах" variant="ghost" onPress={() => navigation.goBack()} style={styles.back} />
    </Screen>
  );
}

const styles = StyleSheet.create({ back: { alignSelf: 'center' } });
