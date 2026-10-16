import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { storage } from "@/src/utils/storage";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { AuroraBackground, PrimaryButton } from "@/src/components/ui";
import { makeStyles, spacing } from "@/src/theme";

const STEPS = [
  {
    icon: "file-upload-outline",
    title: "Envie a prova",
    text: "PDF, fotos pela câmera ou documento escaneado. A IA lê, entende e organiza tudo.",
  },
  {
    icon: "account-heart-outline",
    title: "Escolha o perfil",
    text: "Dislexia, TDAH, TEA, baixa visão… adaptamos preservando o objetivo de aprendizagem.",
  },
  {
    icon: "shield-check-outline",
    title: "Aplique com confiança",
    text: "Prova pronta, guia de aplicação e exportação acessível. Você sempre revisa antes.",
  },
];

export default function Onboarding() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  const done = async () => {
    await storage.setItem("inclusiv_onboarded", true);
    router.replace("/(auth)/login");
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else done();
  };

  return (
    <AuroraBackground>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xxl }]}
      >
        <View style={styles.brandRow}>
          <View style={styles.logoBox}>
            <MaterialDesignIcons name="shape-plus" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.brand}>inclusiv.ai</Text>
          <Pressable testID="onboarding-skip" onPress={done}><Text style={styles.skip}>Pular</Text></Pressable>
        </View>

        <View style={styles.iconCircle}>
          <MaterialDesignIcons name={current.icon as any} size={64} color="#6B40E6" />
        </View>

        <Text style={styles.title} testID="onboarding-title">{current.title}</Text>
        <Text style={styles.body}>{current.text}</Text>

        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>

        <PrimaryButton
          testID="onboarding-next"
          title={step === STEPS.length - 1 ? "Começar" : "Próximo"}
          onPress={next}
          icon="arrow-right"
          style={{ marginTop: spacing.xxl }}
        />
      </ScrollView>
    </AuroraBackground>
  );
}

const useStyles = makeStyles((colors) => ({
  scroll: { paddingHorizontal: spacing.xl, flexGrow: 1 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xxxl },
  logoBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#6B40E6", alignItems: "center", justifyContent: "center" },
  brand: { fontSize: 18, fontWeight: "700", color: colors.onSurface, flex: 1 },
  skip: { color: colors.muted, fontWeight: "600" },
  iconCircle: {
    width: 140, height: 140, borderRadius: 70, backgroundColor: "#FFFFFF",
    alignSelf: "center", alignItems: "center", justifyContent: "center",
    marginTop: spacing.xxxl, marginBottom: spacing.xxl,
    shadowColor: "#6B40E6", shadowOpacity: 0.15, shadowRadius: 24, shadowOffset: { width: 0, height: 8 },
  },
  title: { fontSize: 28, fontWeight: "700", color: colors.onSurface, textAlign: "center", marginBottom: spacing.md },
  body: { fontSize: 16, color: colors.muted, textAlign: "center", lineHeight: 24, paddingHorizontal: spacing.md },
  dots: { flexDirection: "row", justifyContent: "center", gap: spacing.sm, marginTop: spacing.xxl },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: "#6B40E6", width: 24 },
}));
