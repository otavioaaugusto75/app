import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth-context";
import { Card, PrimaryButton } from "@/src/components/ui";
import { gradients, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [adaptations, setAdaptations] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const [a, e, s] = await Promise.allSettled([api.listAdaptations(), api.listExams(), api.listStudents()]);
    if (a.status === "fulfilled") setAdaptations(a.value);
    if (e.status === "fulfilled") setExams(e.value);
    if (s.status === "fulfilled") setStudents(s.value);
  };
  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <LinearGradient
        colors={[...gradients.aurora]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + spacing.lg }]}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>Olá, {user?.name?.split(" ")[0] ?? "professor"} 👋</Text>
            <Text style={styles.subtitle}>Vamos adaptar uma prova hoje?</Text>
          </View>
          <View style={styles.logoBox}>
            <MaterialDesignIcons name="shape-plus" size={22} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.statsRow}>
          <Stat label="Provas" value={exams.length} />
          <Stat label="Adaptações" value={adaptations.length} />
          <Stat label="Alunos" value={students.length} />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <PrimaryButton testID="home-new-adaptation" title="Nova adaptação" icon="plus" onPress={() => router.push("/new/upload")} />

        <Text style={styles.sectionTitle}>Atalhos</Text>
        <View style={styles.shortcuts}>
          <Shortcut testID="shortcut-lens" icon="camera-outline" title="Modo Lens" sub="Foto da prova" onPress={() => router.push({ pathname: "/new/upload", params: { mode: "photo" } })} />
          <Shortcut testID="shortcut-students" icon="account-plus-outline" title="Alunos" sub="Perfis e PEI" onPress={() => router.push("/(tabs)/students")} />
          <Shortcut testID="shortcut-exams" icon="folder-open-outline" title="Provas" sub="Minhas provas" onPress={() => router.push("/(tabs)/exams")} />
          <Shortcut testID="shortcut-guide" icon="clipboard-list-outline" title="Guia" sub="Como aplicar" onPress={() => router.push({ pathname: "/(tabs)/exams", params: { tab: "guides" } })} />
        </View>

        <Text style={styles.sectionTitle}>Recentes</Text>
        {adaptations.length === 0 ? (
          <Card>
            <Text style={{ color: colors.muted }}>Nenhuma adaptação ainda. Comece enviando uma prova em PDF ou tirando foto.</Text>
          </Card>
        ) : (
          adaptations.slice(0, 5).map((ad) => (
            <Pressable key={ad.id} testID={`home-adaptation-${ad.id}`} onPress={() => router.push(`/new/preview/${ad.id}`)}>
              <Card style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                  <View style={styles.iconCircle}>
                    <MaterialDesignIcons name="file-document-check-outline" size={22} color={colors.brandPrimary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{exams.find((e) => e.id === ad.exam_id)?.title ?? "Prova"}</Text>
                    <Text style={styles.itemSub}>{ad.profiles.join(" · ")} · {ad.nivel_simplificacao}</Text>
                  </View>
                  <MaterialDesignIcons name="chevron-right" size={22} color={colors.muted} />
                </View>
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Shortcut({ icon, title, sub, onPress, testID }: { icon: string; title: string; sub: string; onPress: () => void; testID?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.shortcut, pressed && { opacity: 0.85 }]}>
      <LinearGradient colors={[...gradients.sea]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.shortcutIcon}>
        <MaterialDesignIcons name={icon as any} size={22} color={colors.brandPrimary} />
      </LinearGradient>
      <Text style={styles.shortcutTitle}>{title}</Text>
      <Text style={styles.shortcutSub}>{sub}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  logoBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#6B40E6", alignItems: "center", justifyContent: "center" },
  hello: { fontSize: 22, fontWeight: "700", color: colors.onSurface },
  subtitle: { color: colors.muted, marginTop: 2 },
  statsRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xxl },
  stat: { flex: 1, backgroundColor: "rgba(255,255,255,0.7)", borderRadius: radius.card, padding: spacing.md, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "700", color: colors.brandPrimary },
  statLabel: { color: colors.muted, fontSize: 12, marginTop: 2 },

  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.onSurface, marginTop: spacing.xxl, marginBottom: spacing.md },
  shortcuts: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  shortcut: {
    width: "47%", backgroundColor: colors.surfaceSecondary, borderRadius: radius.card,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  shortcutIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  shortcutTitle: { fontWeight: "700", color: colors.onSurface },
  shortcutSub: { color: colors.muted, fontSize: 12, marginTop: 2 },

  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  itemTitle: { fontWeight: "700", color: colors.onSurface },
  itemSub: { color: colors.muted, fontSize: 12, marginTop: 2, textTransform: "capitalize" },
}));
