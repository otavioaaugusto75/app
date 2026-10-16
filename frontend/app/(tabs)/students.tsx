import { useCallback, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { api } from "@/src/api";
import { Card, PrimaryButton, SecondaryButton } from "@/src/components/ui";
import { makeStyles, profileColors, radius, spacing, useTheme } from "@/src/theme";

export default function Students() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const [list, setList] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; label: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [pei, setPei] = useState("");
  const [sel, setSel] = useState<string[]>([]);

  const load = async () => {
    const [a, p] = await Promise.all([api.listStudents(), api.listProfiles()]);
    setList(a); setProfiles(p);
  };
  useFocusEffect(useCallback(() => { load(); }, []));
  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const save = async () => {
    if (!name.trim()) return;
    await api.createStudent({ name: name.trim(), grade, profiles: sel, pei_summary: pei });
    setName(""); setGrade(""); setPei(""); setSel([]); setOpen(false);
    load();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.title}>Alunos</Text>
      </View>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <PrimaryButton testID="students-add" title="Cadastrar aluno" icon="account-plus" onPress={() => setOpen(true)} />

        {list.length === 0 ? (
          <Card style={{ marginTop: spacing.xxl }}>
            <Text style={{ color: colors.muted }}>Nenhum aluno ainda. Cadastre um aluno para registrar perfis e PEI.</Text>
          </Card>
        ) : (
          <View style={{ marginTop: spacing.xxl, gap: spacing.md }}>
            {list.map((s) => (
              <Card key={s.id} testID={`student-${s.id}`}>
                <Text style={styles.sName}>{s.name}</Text>
                {s.grade ? <Text style={styles.sSub}>{s.grade}</Text> : null}
                {s.profiles?.length > 0 && (
                  <View style={styles.chipsRow}>
                    {s.profiles.map((p: string) => {
                      const c = profileColors[p] ?? { bg: colors.brandSecondary, fg: colors.brandPrimary, icon: "account" };
                      return (
                        <View key={p} style={[styles.chip, { backgroundColor: c.bg }]}>
                          <MaterialDesignIcons name={c.icon as any} size={13} color={c.fg} />
                          <Text style={[styles.chipTxt, { color: c.fg }]}>{profiles.find((x) => x.id === p)?.label ?? p}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
                {s.pei_summary ? <Text style={styles.pei}>{s.pei_summary}</Text> : null}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>Novo aluno</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TextInput testID="student-name" placeholder="Nome ou apelido" placeholderTextColor={colors.muted} value={name} onChangeText={setName} style={styles.input} />
              <TextInput testID="student-grade" placeholder="Série (ex.: 6º ano)" placeholderTextColor={colors.muted} value={grade} onChangeText={setGrade} style={styles.input} />
              <TextInput testID="student-pei" placeholder="Resumo do PEI (opcional)" placeholderTextColor={colors.muted} value={pei} onChangeText={setPei} style={[styles.input, { height: 90 }]} multiline />
              <Text style={styles.sheetLabel}>Perfis de adaptação</Text>
              <View style={styles.chipsRow}>
                {profiles.map((p) => {
                  const active = sel.includes(p.id);
                  const c = profileColors[p.id] ?? { bg: colors.brandSecondary, fg: colors.brandPrimary, icon: "account" };
                  return (
                    <Pressable
                      key={p.id}
                      testID={`student-profile-${p.id}`}
                      onPress={() => setSel((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))}
                      style={[styles.chip, { backgroundColor: active ? c.bg : colors.surfaceTertiary, borderWidth: active ? 1.5 : 1, borderColor: active ? c.fg : colors.border }]}
                    >
                      <MaterialDesignIcons name={c.icon as any} size={13} color={active ? c.fg : colors.muted} />
                      <Text style={[styles.chipTxt, { color: active ? c.fg : colors.muted }]}>{p.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
                <PrimaryButton testID="student-save" title="Salvar aluno" onPress={save} icon="check" />
                <SecondaryButton title="Cancelar" onPress={() => setOpen(false)} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  title: { fontSize: 28, fontWeight: "700", color: colors.onSurface },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  sName: { fontWeight: "700", color: colors.onSurface, fontSize: 16 },
  sSub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  pei: { color: colors.onSurfaceSecondary, fontSize: 13, marginTop: spacing.md, fontStyle: "italic" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.md },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  chipTxt: { fontSize: 12, fontWeight: "600" },

  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: spacing.xl, paddingTop: spacing.md, maxHeight: "85%" },
  grabber: { width: 44, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.md },
  sheetTitle: { fontSize: 20, fontWeight: "700", color: colors.onSurface, marginBottom: spacing.lg },
  sheetLabel: { fontWeight: "600", color: colors.onSurface, marginTop: spacing.lg },
  input: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.field, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    color: colors.onSurface, fontSize: 15, marginBottom: spacing.sm, minHeight: 48,
  },
}));
