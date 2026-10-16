import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { AuroraBackground, PrimaryButton } from "@/src/components/ui";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useAuth } from "@/src/auth-context";

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("professor@inclusiv.ai");
  const [password, setPassword] = useState("inclusiv123");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message || "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuroraBackground>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xxl }]} keyboardShouldPersistTaps="handled">
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              <MaterialDesignIcons name="shape-plus" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.brand}>inclusiv.ai</Text>
          </View>

          <Text style={styles.title}>Entrar</Text>
          <Text style={styles.subtitle}>Acesse para gerar provas adaptadas ao perfil de cada aluno.</Text>

          <View style={styles.field}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              testID="login-email"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholder="voce@escola.com"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.pwdRow}>
              <TextInput
                testID="login-password"
                value={password}
                onChangeText={setPassword}
                style={[styles.input, { flex: 1 }]}
                placeholder="Sua senha"
                placeholderTextColor={colors.muted}
                secureTextEntry={!showPwd}
              />
              <Pressable onPress={() => setShowPwd((s) => !s)} style={styles.eyeBtn}>
                <MaterialDesignIcons name={showPwd ? "eye-off" : "eye"} size={20} color={colors.muted} />
              </Pressable>
            </View>
          </View>

          {error ? <Text testID="login-error" style={styles.error}>{error}</Text> : null}

          <PrimaryButton testID="login-submit" title="Entrar" onPress={submit} loading={loading} icon="login" style={{ marginTop: spacing.lg }} />

          <Pressable testID="login-go-register" onPress={() => router.push("/(auth)/register")} style={{ marginTop: spacing.lg }}>
            <Text style={styles.linkCenter}>Novo por aqui? <Text style={{ fontWeight: "700", color: colors.brandPrimary }}>Criar conta</Text></Text>
          </Pressable>

          <View style={styles.demoHint}>
            <MaterialDesignIcons name="information-outline" size={16} color={colors.muted} />
            <Text style={styles.demoText}>Conta demo: professor@inclusiv.ai / inclusiv123</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuroraBackground>
  );
}

const useStyles = makeStyles((colors) => ({
  scroll: { paddingHorizontal: spacing.xl, flexGrow: 1 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xxl },
  logoBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#6B40E6", alignItems: "center", justifyContent: "center" },
  brand: { fontSize: 18, fontWeight: "700", color: colors.onSurface },
  title: { fontSize: 32, fontWeight: "700", color: colors.onSurface, marginTop: spacing.lg },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 22, marginTop: spacing.sm, marginBottom: spacing.xxl },
  field: { marginBottom: spacing.lg },
  label: { color: colors.onSurface, fontWeight: "600", marginBottom: spacing.sm, fontSize: 14 },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.onSurface,
    fontSize: 16,
    minHeight: 50,
  },
  pwdRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  eyeBtn: { padding: spacing.md },
  error: { color: colors.error, marginTop: spacing.sm, fontWeight: "600" },
  linkCenter: { textAlign: "center", color: colors.onSurface, fontSize: 15 },
  demoHint: { flexDirection: "row", alignItems: "center", gap: spacing.xs, justifyContent: "center", marginTop: spacing.xxl },
  demoText: { color: colors.muted, fontSize: 12 },
}));
