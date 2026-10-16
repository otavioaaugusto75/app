import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { AuroraBackground, PrimaryButton } from "@/src/components/ui";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useAuth } from "@/src/auth-context";

export default function Register() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [institution, setInstitution] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (password.length < 6) {
      setError("Senha deve ter no mínimo 6 caracteres");
      return;
    }
    setLoading(true);
    try {
      await signUp(name.trim(), email.trim(), password, institution.trim() || "Escola");
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message || "Erro ao cadastrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuroraBackground>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxl }]} keyboardShouldPersistTaps="handled">
          <Pressable testID="register-back" onPress={() => router.back()} style={styles.back}>
            <MaterialDesignIcons name="arrow-left" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>Comece a adaptar provas em minutos.</Text>

          {[
            { key: "name", label: "Nome completo", v: name, set: setName, placeholder: "Maria Silva" },
            { key: "email", label: "E-mail", v: email, set: setEmail, placeholder: "voce@escola.com", keyboardType: "email-address" as const, autoCap: "none" as const },
            { key: "institution", label: "Instituição", v: institution, set: setInstitution, placeholder: "Escola Municipal..." },
            { key: "password", label: "Senha", v: password, set: setPassword, placeholder: "Mínimo 6 caracteres", secure: true },
          ].map((f) => (
            <View key={f.key} style={styles.field}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                testID={`register-${f.key}`}
                value={f.v}
                onChangeText={f.set}
                style={styles.input}
                placeholder={f.placeholder}
                placeholderTextColor={colors.muted}
                autoCapitalize={f.autoCap ?? "sentences"}
                keyboardType={f.keyboardType ?? "default"}
                secureTextEntry={!!f.secure}
              />
            </View>
          ))}

          {error ? <Text testID="register-error" style={styles.error}>{error}</Text> : null}
          <PrimaryButton testID="register-submit" title="Criar conta" onPress={submit} loading={loading} icon="account-plus" style={{ marginTop: spacing.lg }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </AuroraBackground>
  );
}

const useStyles = makeStyles((colors) => ({
  scroll: { paddingHorizontal: spacing.xl, flexGrow: 1 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  title: { fontSize: 28, fontWeight: "700", color: colors.onSurface },
  subtitle: { color: colors.muted, fontSize: 15, marginTop: spacing.xs, marginBottom: spacing.xxl },
  field: { marginBottom: spacing.lg },
  label: { color: colors.onSurface, fontWeight: "600", marginBottom: spacing.sm, fontSize: 14 },
  input: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.field, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    color: colors.onSurface, fontSize: 16, minHeight: 50,
  },
  error: { color: colors.error, marginTop: spacing.sm, fontWeight: "600" },
}));
