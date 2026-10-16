import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { api } from "@/src/api";
import { Card, PrimaryButton, SecondaryButton } from "@/src/components/ui";
import { makeStyles, profileColors, radius, spacing, useTheme } from "@/src/theme";

export default function Preview() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [adaptation, setAdaptation] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [tab, setTab] = useState<"compare" | "adapted">("compare");
  const [editing, setEditing] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const ad = await api.getAdaptation(id);
    setAdaptation(ad);
    const ex = await api.getExam(ad.exam_id);
    setExam(ex);
  };
  useEffect(() => { load(); }, [id]);

  const startEdit = (n: number, current: string) => { setEditing(n); setEditText(current); };
  const saveEdit = async () => {
    if (editing == null) return;
    setSaving(true);
    const updated = adaptation.questoes_adaptadas.map((q: any) =>
      q.numero === editing ? { ...q, enunciado_adaptado: editText } : q,
    );
    try {
      await api.editAdaptation(id, updated);
      setAdaptation({ ...adaptation, questoes_adaptadas: updated });
      setEditing(null);
    } finally { setSaving(false); }
  };

  if (!adaptation || !exam) {
    return <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brandPrimary} /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable testID="preview-back" onPress={() => router.replace("/(tabs)")} style={styles.back}>
          <MaterialDesignIcons name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.step}>Passo 3 de 4 · Preview</Text>
          <Text style={styles.title} numberOfLines={1}>{exam.title}</Text>
        </View>
      </View>

      <View style={styles.profilesRow}>
        {adaptation.profiles.map((p: string) => {
          const c = profileColors[p] ?? { bg: colors.brandSecondary, fg: colors.brandPrimary, icon: "account" };
          return (
            <View key={p} style={[styles.profileChip, { backgroundColor: c.bg }]}>
              <MaterialDesignIcons name={c.icon as any} size={12} color={c.fg} />
              <Text style={[styles.profileChipTxt, { color: c.fg }]}>{p}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.tabsRow}>
        <Pressable testID="tab-compare" onPress={() => setTab("compare")} style={[styles.tab, tab === "compare" && styles.tabActive]}>
          <Text style={[styles.tabTxt, tab === "compare" && styles.tabTxtActive]}>Comparar</Text>
        </Pressable>
        <Pressable testID="tab-adapted" onPress={() => setTab("adapted")} style={[styles.tab, tab === "adapted" && styles.tabActive]}>
          <Text style={[styles.tabTxt, tab === "adapted" && styles.tabTxtActive]}>Adaptada</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 160 }]}>
        {exam.structure.questoes.map((orig: any) => {
          const ad = adaptation.questoes_adaptadas.find((x: any) => x.numero === orig.numero);
          return (
            <View key={orig.numero} testID={`q-${orig.numero}`} style={{ marginBottom: spacing.xl }}>
              <Text style={styles.qLabel}>Questão {orig.numero}</Text>
              {tab === "compare" && (
                <Card style={styles.origCard}>
                  <View style={styles.badge}><Text style={styles.badgeTxt}>Original</Text></View>
                  <Text style={styles.qText}>{orig.enunciado}</Text>
                  {orig.alternativas?.map((a: string, i: number) => <Text key={i} style={styles.alt}>{a}</Text>)}
                </Card>
              )}
              <Card style={styles.adaptedCard} testID={`adapted-${orig.numero}`}>
                <View style={[styles.badge, { backgroundColor: colors.brandPrimary }]}><Text style={[styles.badgeTxt, { color: "#FFFFFF" }]}>Adaptada</Text></View>
                {editing === orig.numero ? (
                  <>
                    <TextInput
                      testID={`edit-${orig.numero}`}
                      value={editText}
                      onChangeText={setEditText}
                      multiline
                      style={styles.editInput}
                    />
                    <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
                      <PrimaryButton testID={`save-${orig.numero}`} title={saving ? "Salvando" : "Salvar"} onPress={saveEdit} loading={saving} style={{ flex: 1 }} />
                      <SecondaryButton title="Cancelar" onPress={() => setEditing(null)} style={{ flex: 1 }} />
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.qText}>{ad?.enunciado_adaptado ?? "—"}</Text>
                    {ad?.alternativas_adaptadas?.map((a: string, i: number) => <Text key={i} style={styles.alt}>{a}</Text>)}
                    {ad?.apoios?.length ? (
                      <View style={styles.supportRow}>
                        {ad.apoios.map((s: string) => (
                          <View key={s} style={styles.supportPill}>
                            <MaterialDesignIcons name="plus-circle-outline" size={11} color={colors.brandPrimary} />
                            <Text style={styles.supportTxt}>{s}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                    {ad?.justificativa ? (
                      <View style={styles.justBox}>
                        <MaterialDesignIcons name="lightbulb-on-outline" size={14} color={colors.accent} />
                        <Text style={styles.justTxt}>{ad.justificativa}</Text>
                      </View>
                    ) : null}
                    <Pressable testID={`edit-btn-${orig.numero}`} onPress={() => startEdit(orig.numero, ad?.enunciado_adaptado ?? "")} style={styles.editBtn}>
                      <MaterialDesignIcons name="pencil-outline" size={14} color={colors.brandPrimary} />
                      <Text style={styles.editBtnTxt}>Editar</Text>
                    </Pressable>
                  </>
                )}
              </Card>
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <SecondaryButton testID="go-guide" title="Guia" icon="clipboard-text-outline" onPress={() => router.push(`/new/guide/${id}`)} style={{ flex: 1 }} />
        <PrimaryButton testID="go-export" title="Exportar" icon="export-variant" onPress={() => router.push(`/new/export/${id}`)} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  step: { color: colors.brandPrimary, fontWeight: "600", fontSize: 11 },
  title: { fontWeight: "700", color: colors.onSurface, fontSize: 17 },

  profilesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  profileChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  profileChipTxt: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },

  tabsRow: { flexDirection: "row", marginHorizontal: spacing.xl, marginBottom: spacing.md, backgroundColor: colors.surfaceTertiary, borderRadius: radius.field, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  tabActive: { backgroundColor: colors.surfaceSecondary },
  tabTxt: { color: colors.muted, fontWeight: "600", fontSize: 13 },
  tabTxtActive: { color: colors.brandPrimary },

  scroll: { paddingHorizontal: spacing.xl },
  qLabel: { fontSize: 12, color: colors.muted, fontWeight: "700", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  origCard: { marginBottom: spacing.sm, backgroundColor: colors.surfaceTertiary },
  adaptedCard: { backgroundColor: "#E6F4FF", borderColor: "#BAE0FF" },
  badge: { alignSelf: "flex-start", backgroundColor: colors.surfaceInverse, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: spacing.sm },
  badgeTxt: { color: "#FFFFFF", fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  qText: { color: colors.onSurface, fontSize: 15, lineHeight: 22 },
  alt: { color: colors.onSurface, fontSize: 14, marginTop: 4, marginLeft: spacing.md },
  supportRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: spacing.md },
  supportPill: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(9,114,211,0.1)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  supportTxt: { color: colors.brandPrimary, fontSize: 10, fontWeight: "600" },
  justBox: { flexDirection: "row", gap: 6, marginTop: spacing.md, backgroundColor: "#FFF8E6", padding: spacing.sm, borderRadius: 8, alignItems: "flex-start" },
  justTxt: { color: "#5A4100", fontSize: 12, flex: 1, lineHeight: 17 },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.md, alignSelf: "flex-end" },
  editBtnTxt: { color: colors.brandPrimary, fontWeight: "600", fontSize: 13 },
  editInput: { backgroundColor: "#FFFFFF", borderRadius: radius.field, borderWidth: 1, borderColor: colors.border, padding: spacing.md, color: colors.onSurface, fontSize: 15, minHeight: 100, textAlignVertical: "top" },

  footer: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, paddingHorizontal: spacing.xl, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: "row", gap: spacing.sm },
}));
