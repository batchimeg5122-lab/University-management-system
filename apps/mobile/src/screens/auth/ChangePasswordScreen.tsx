import { useState } from 'react';
import { AppText, Button, Card, Input, Screen } from '../../components';
import { useAuthStore } from '../../store/auth.store';

/** Админ нууц үгийг шинэчилсэн (must_change_password) үед заавал солино */
export function ChangePasswordScreen() {
  const changePassword = useAuthStore((s) => s.changePassword);
  const signOut = useAuthStore((s) => s.signOut);
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (pw.length < 8) return setError('Нууц үг хамгийн багадаа 8 тэмдэгт байна.');
    if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return setError('Үсэг болон тоо агуулсан байна.');
    if (pw !== confirm) return setError('Нууц үг таарахгүй байна.');
    setLoading(true);
    try {
      await changePassword(pw);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboard>
      <Card tone="warn">
        <AppText tone="warn">Аюулгүй байдлын үүднээс анхны нууц үгээ шинээр солино уу.</AppText>
      </Card>
      <Input label="Шинэ нууц үг" password value={pw} onChangeText={setPw} hint="8+ тэмдэгт, үсэг ба тоо" />
      <Input label="Шинэ нууц үг давтах" password value={confirm} onChangeText={setConfirm} error={error} onSubmitEditing={submit} />
      <Button title="Хадгалах" onPress={submit} loading={loading} fullWidth />
      <Button title="Гарах" variant="ghost" onPress={() => void signOut()} />
    </Screen>
  );
}
