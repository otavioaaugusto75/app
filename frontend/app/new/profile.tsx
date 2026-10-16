import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { api } from "@/src/api";
import { Card, PrimaryButton } from "@/src/components/ui";
import { makeStyles, profileColors, radius, spacing, useTheme } from "@/src/theme";

const LEVELS: ("leve" | "moderado" | "alto")[] = ["leve", "moderado", "alto"];
const LEVEL_LABEL: Record<string, string> = { leve: "Leve", moderado: "Moderado", alto: "Alto" };

export default function ProfileChoice() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const { exam_id } = useLocalSearchParams<{ exam_id: string }>();

  const [exam, setExam] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; label: string }[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [level, setLevel] = useState<"leve" | "moderado" | "alto">("moderado");
  const [fontBig, setFontBig] = useState(false);
  const [extraTime, setExtraTime] = useState(true);
  const [visualAid, setVisualAid] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [e, s, p] = await Promise.all([api.getExam(exam_id), api.listStudents(), api.listProfiles()]);
      setExam(e); setStudents(s); setProfiles(p);
    })();
  }, [exam_id]);

  const toggle = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const pickStudent = (sid: string) => {
    setStudentId(sid);
    const st = students.find((x) => x.id === sid);
    if (st?.profiles?.length) setSelected(st.profiles);
  };

  const generate = async () => {
    if (!selected.length) {
      setError("Escolha pelo menos um perfil de adaptação");
      return;
    }
    setError(null); setGenerating(true);
    try {
      const ad = await api.createAdaptation({
        exam_id,
        student_id: studentId,
        profiles: selected,
        nivel_simplificacao: level,
        tempo_extra: extraTime,
        fonte_grande: fontBig,
        apoio_visual: visualAid,
      });
      router.replace(`/new/preview/${ad.id}`);
    } catch (e: any) {
      setError(e.message || "Falha ao gerar adaptação");
    } finally {
      setGenerating(false);
    }
  };

  if (!exam) {
    return <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brandPrimary} /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable testID="profile-back" onPress={() => router.back()} style={styles.back}>
          <MaterialDesignIcons name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.step}>Passo 2 de 4</Text>
          <Text style={styles.title}>{exam.title}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 140 }]}>
        <Card>
          <Text style={styles.sumLabel}>Disciplina</Text>
          <Text style={styles.sumValue}>{exam.structure.disciplina || "—"}</Text>
          <View style={styles.row}>
            <View style={styles.pill}><MaterialDesignIcons name="format-list-numbered" size={13} color={colors.brandPrimary} /><Text style={styles.pillTxt}>{exam.structure.questoes.length} questões</Text></View>
            {exam.structure.assuntos?.slice(0, 2).map((a: string) => (
              <View key={a} style={styles.pill}><Text style={styles.pillTxt}>{a}</Text></View>
            ))}
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Aluno (opcional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: 4 }}>
          <Pressable testID="student-chip-none" onPress={() => setStudentId(null)} style={[styles.studentChip, !studentId && styles.studentChipActive]}>
            <MaterialDesignIcons name="account-outline" size={14} color={!studentId ? "#FFFFFF" : colors.onSurface} />
            <Text style={[styles.studentChipTxt, !studentId && { color: "#FFFFFF" }]}>Sem aluno</Text>
          </Pressable>
          {students.map((s) => (
            <Pressable key={s.id} testID={`student-chip-${s.id}`} onPress={() => pickStudent(s.id)} style={[styles.studentChip, studentId === s.id && styles.studentChipActive]}>
              <MaterialDesignIcons name="account" size={14} color={studentId === s.id ? "#FFFFFF" : colors.onSurface} />
              <Text style={[styles.studentChipTxt, studentId === s.id && { color: "#FFFFFF" }]}>{s.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Perfis de adaptação</Text>
        <View style={styles.chipsWrap}>
          {profiles.map((p) => {
            const active = selected.includes(p.id);
            const c = profileColors[p.id] ?? { bg: colors.brandSecondary, fg: colors.brandPrimary, icon: "account" };
            return (
              <Pressable key={p.id} testID={`profile-${p.id}`} onPress={() => toggle(p.id)}
                style={[styles.profileChip, { backgroundColor: active ? c.bg : colors.surfaceTertiary, borderColor: active ? c.fg : colors.border, borderWidth: active ? 1.5 : 1 }]}>
                <MaterialDesignIcons name={c.icon as any} size={14} color={active ? c.fg : colors.muted} />
                <Text style={[styles.profileChipTxt, { color: active ? c.fg : colors.muted }]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Nível de simplificação</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {LEVELS.map((lv) => (
            <Pressable key={lv} testID={`level-${lv}`} onPress={() => setLevel(lv)} style={[styles.levelBtn, level === lv && styles.levelBtnActive]}>
              <Text style={[styles.levelTxt, level === lv && { color: "#FFFFFF" }]}>{LEVEL_LABEL[lv]}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Opções</Text>
        <Toggle testID="opt-time" title="Tempo extra" value={extraTime} onChange={setExtraTime} />
        <Toggle testID="opt-font" title="Fonte ampliada" value={fontBig} onChange={setFontBig} />
        <Toggle testID="opt-visual" title="Apoio visual (imagens/pictogramas)" value={visualAid} onChange={setVisualAid} />

        {error ? <Text style={{ color: colors.error, marginTop: spacing.md, fontWeight: "600" }}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <PrimaryButton testID="profile-generate" title={generating ? "Gerando adaptação..." : "Gerar adaptação"} onPress={generate} icon="auto-fix" loading={generating} />
      </View>
    </View>
  );
}

function Toggle({ title, value, onChange, testID }: { title: string; value: boolean; onChange: (v: boolean) => void; testID?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable testID={testID} onPress={() => onChange(!value)} style={styles.toggleRow}>
      <Text style={{ flex: 1, color: colors.onSurface, fontWeight: "500" }}>{title}</Text>
      <View style={[styles.toggle, value && { backgroundColor: colors.brandPrimary }]}>
        <View style={[styles.toggleDot, value && { marginLeft: 22 }]} />
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  step: { color: colors.brandPrimary, fontWeight: "600", fontSize: 11 },
  title: { fontWeight: "700", color: colors.onSurface, fontSize: 18 },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  sumLabel: { color: colors.muted, fontSize: 12 },
  sumValue: { color: colors.onSurface, fontWeight: "700", fontSize: 18, marginTop: 2 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.md },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.brandSecondary },
  pillTxt: { color: colors.brandPrimary, fontSize: 12, fontWeight: "600" },

  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.onSurface, marginTop: spacing.xxl, marginBottom: spacing.md },
  studentChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surfaceTertiary, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: 999 },
  studentChipActive: { backgroundColor: colors.brandPrimary },
  studentChipTxt: { color: colors.onSurface, fontWeight: "600", fontSize: 13 },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  profileChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  profileChipTxt: { fontSize: 12, fontWeight: "600" },

  levelBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.field, backgroundColor: colors.surfaceTertiary, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  levelBtnActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  levelTxt: { color: colors.onSurface, fontWeight: "600" },

  toggleRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  toggle: { width: 44, height: 22, borderRadius: 11, backgroundColor: colors.border, padding: 2, justifyContent: "center" },
  toggleDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#FFFFFF" },

  footer: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, paddingHorizontal: spacing.xl, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
}));
