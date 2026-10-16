import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { api } from "@/src/api";
import { Card } from "@/src/components/ui";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Phase = "antes" | "durante" | "depois";
const PHASES: { id: Phase; label: string }[] = [
  { id: "antes", label: "Antes" },
  { id: "durante", label: "Durante" },
  { id: "depois", label: "Depois" },
];

export default function Guide() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ad, setAd] = useState<any>(null);
  const [phase, setPhase] = useState<Phase>("antes");
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => { api.getAdaptation(id).then(setAd); }, [id]);

  if (!ad) {
    return <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brandPrimary} /></View>;
  }
  const g = ad.guide || {};
  const items: string[] = g[phase] || [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable testID="guide-back" onPress={() => router.back()} style={styles.back}>
          <MaterialDesignIcons name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.step}>Guia de aplicação</Text>
          <Text style={styles.title}>Como aplicar a prova</Text>
        </View>
      </View>

      <View style={styles.tabsRow}>
        {PHASES.map((p) => (
          <Pressable key={p.id} testID={`guide-tab-${p.id}`} onPress={() => setPhase(p.id)} style={[styles.tab, phase === p.id && styles.tabActive]}>
            <Text style={[styles.tabTxt, phase === p.id && styles.tabTxtActive]}>{p.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: insets.bottom + 40 }}>
        {g.tempo_sugerido ? (
          <Card style={{ marginBottom: spacing.md, flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
            <MaterialDesignIcons name="timer-outline" size={20} color={colors.accent} />
            <Text testID="guide-time" style={{ flex: 1, color: colors.onSurface }}>{g.tempo_sugerido}</Text>
          </Card>
        ) : null}

        {items.length === 0 ? (
          <Text style={{ color: colors.muted }}>Sem itens para esta etapa.</Text>
        ) : items.map((it, i) => {
          const k = `${phase}-${i}`;
          const on = !!checked[k];
          return (
            <Pressable key={k} testID={`guide-item-${k}`} onPress={() => setChecked((c) => ({ ...c, [k]: !c[k] }))} style={styles.item}>
              <MaterialDesignIcons name={on ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} size={22} color={on ? colors.success : colors.muted} />
              <Text style={[styles.itemTxt, on && { color: colors.muted, textDecorationLine: "line-through" }]}>{it}</Text>
            </Pressable>
          );
        })}

        {g.recursos?.length ? (
          <>
            <Text style={styles.section}>Recursos</Text>
            {g.recursos.map((r: string, i: number) => <Text key={i} style={styles.bullet}>• {r}</Text>)}
          </>
        ) : null}
        {g.dicas_por_assunto?.length ? (
          <>
            <Text style={styles.section}>Dicas por assunto</Text>
            {g.dicas_por_assunto.map((r: string, i: number) => <Text key={i} style={styles.bullet}>• {r}</Text>)}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  step: { color: colors.brandPrimary, fontWeight: "600", fontSize: 11 },
  title: { fontWeight: "700", color: colors.onSurface, fontSize: 18 },
  tabsRow: { flexDirection: "row", marginHorizontal: spacing.xl, marginBottom: spacing.lg, backgroundColor: colors.surfaceTertiary, borderRadius: radius.field, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  tabActive: { backgroundColor: colors.surfaceSecondary },
  tabTxt: { color: colors.muted, fontWeight: "600" },
  tabTxtActive: { color: colors.brandPrimary },
  item: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start", backgroundColor: colors.surfaceSecondary, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.sm, minHeight: 48 },
  itemTxt: { flex: 1, color: colors.onSurface, fontSize: 15, lineHeight: 21 },
  section: { fontWeight: "700", color: colors.onSurface, fontSize: 16, marginTop: spacing.xxl, marginBottom: spacing.sm },
  bullet: { color: colors.onSurfaceSecondary, fontSize: 14, lineHeight: 21, marginBottom: 4 },
}));
