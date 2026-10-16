import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { api } from "@/src/api";
import { Card, PrimaryButton } from "@/src/components/ui";
import { makeStyles, spacing, useTheme } from "@/src/theme";

export default function Exams() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const [exams, setExams] = useState<any[]>([]);
  const [adaptations, setAdaptations] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const [e, a] = await Promise.allSettled([api.listExams(), api.listAdaptations()]);
    if (e.status === "fulfilled") setExams(e.value);
    if (a.status === "fulfilled") setAdaptations(a.value);
  };
  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.title}>Provas</Text>
      </View>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <PrimaryButton testID="exams-new" title="Nova adaptação" icon="plus" onPress={() => router.push("/new/upload")} />

        <Text style={styles.sectionTitle}>Minhas provas</Text>
        {exams.length === 0 ? (
          <Card><Text style={{ color: colors.muted }}>Nenhuma prova cadastrada.</Text></Card>
        ) : (
          exams.map((ex) => {
            const linked = adaptations.filter((a) => a.exam_id === ex.id);
            return (
              <Card key={ex.id} style={{ marginBottom: spacing.md }} testID={`exam-${ex.id}`}>
                <Text style={styles.itemTitle}>{ex.title}</Text>
                <Text style={styles.itemSub}>{ex.structure.disciplina} · {ex.structure.questoes.length} questões</Text>
                <View style={styles.row}>
                  <Pressable testID={`exam-${ex.id}-adapt`} style={styles.pill} onPress={() => router.push({ pathname: "/new/profile", params: { exam_id: ex.id } })}>
                    <MaterialDesignIcons name="auto-fix" size={14} color={colors.brandPrimary} />
                    <Text style={styles.pillText}>Adaptar</Text>
                  </Pressable>
                  {linked.length > 0 && (
                    <Pressable testID={`exam-${ex.id}-view`} style={[styles.pill, { backgroundColor: colors.surfaceTertiary }]} onPress={() => router.push(`/new/preview/${linked[0].id}`)}>
                      <MaterialDesignIcons name="eye-outline" size={14} color={colors.onSurface} />
                      <Text style={[styles.pillText, { color: colors.onSurface }]}>{linked.length} adaptação(ões)</Text>
                    </Pressable>
                  )}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, backgroundColor: colors.surface },
  title: { fontSize: 28, fontWeight: "700", color: colors.onSurface },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.onSurface, marginTop: spacing.xxl, marginBottom: spacing.md },
  itemTitle: { fontWeight: "700", color: colors.onSurface, fontSize: 16 },
  itemSub: { color: colors.muted, marginTop: 4, fontSize: 13 },
  row: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, flexWrap: "wrap" },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.brandSecondary, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, borderRadius: 999,
  },
  pillText: { color: colors.brandPrimary, fontWeight: "600", fontSize: 13 },
}));
