import * as LocalAuthentication from 'expo-local-authentication';

export interface BiometricInfo {
  available: boolean;
  /** "Face ID", "Хурууны хээ" ... */
  label: string;
  icon: 'scan-outline' | 'finger-print-outline' | 'lock-closed-outline';
}

/** Төхөөрөмж биометр дэмждэг, бүртгэсэн эсэх */
export async function getBiometricInfo(): Promise<BiometricInfo> {
  try {
    const [hardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    const finger = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    return {
      available: hardware && enrolled,
      label: face ? 'Face ID' : finger ? 'Хурууны хээ' : 'Биометр',
      icon: face ? 'scan-outline' : finger ? 'finger-print-outline' : 'lock-closed-outline',
    };
  } catch {
    return { available: false, label: 'Биометр', icon: 'lock-closed-outline' };
  }
}

/** Face ID / хурууны хээ асууна. Биометр амжилтгүй бол утасны PIN-ээр орж болно */
export async function authenticate(promptMessage = 'Их Засаг апп-ын түгжээг тайлах'): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Болих',
      fallbackLabel: 'PIN код ашиглах',
      disableDeviceFallback: false,
    });
    if (res.success) return { ok: true };
    return { ok: false, error: res.error };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
