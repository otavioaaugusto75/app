import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { api, auth } from "@/src/api";
import { Card, PrimaryButton } from "@/src/components/ui";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function ExportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const [playing, setPlaying] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    api.getAdaptation(id).then((a) => setApproved(a.status === "aprovada"));
    return () => { playerRef.current?.remove(); playerRef.current = null; };
  }, [id]);

  const download = async (kind: "pdf" | "txt") => {
    setBusy(kind); setMsg(null);
    try {
      const token = await auth.getToken();
      const url = kind === "pdf" ? api.exportPdfUrl(id) : api.exportTxtUrl(id);
      if (Platform.OS === "web") {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const blob = await res.blob();
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href; a.download = `prova-adaptada.${kind}`; a.click();
        setMsg("Arquivo baixado.");
      } else {
        const dest = `${FileSystem.cacheDirectory}prova-adaptada-${id.slice(0, 6)}.${kind}`;
        const r = await FileSystem.downloadAsync(url, dest, { headers: { Authorization: `Bearer ${token}` } });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(r.uri, { mimeType: kind === "pdf" ? "application/pdf" : "text/plain" });
        }
        setMsg("Arquivo pronto para compartilhar.");
      }
    } catch (e: any) {
      setMsg(`Erro: ${e.message}`);
    } finally { setBusy(null); }
  };

  const playAudio = async () => {
    if (playing) { playerRef.current?.pause(); setPlaying(false); return; }
    setBusy("audio"); setMsg("Gerando áudio...");
    try {
      const { url } = await api.ttsUrl(id);
      const full = `${api.base}${url}`;
      await setAudioModeAsync({ playsInSilentMode: true });
      playerRef.current?.remove();
      const p = createAudioPlayer({ uri: full });
      playerRef.current = p;
      p.addListener("playbackStatusUpdate", (s) => {
        if (s.playing) setPlaying(true);
        if (s.didJustFinish) setPlaying(false);
      });
      p.play();
      setMsg("Reproduzindo versão em áudio.");
    } catch (e: any) {
      setMsg(`Erro no áudio: ${e.message}`);
    } finally { setBusy(null); }
  };

  const approve = async () => {
    await api.approveAdaptation(id);
    setApproved(true);
    setMsg("Prova aprovada. Pronta para aplicar.");
  };

  const options = [
    { k: "pdf", icon: "file-pdf-box", title: "PDF acessível", sub: "Fonte adaptada e espaçamento amplo", onPress: () => download("pdf") },
    { k: "txt", icon: "text-box-outline", title: "TXT para leitor de tela", sub: "Texto puro, ideal para TalkBack/VoiceOver", onPress: () => download("txt") },
    { k: "audio", icon: playing ? "pause-circle-outline" : "volume-high", title: playing ? "Pausar áudio" : "Versão em áudio", sub: "Leitura em voz alta da prova", onPress: playAudio },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable testID="export-back" onPress={() => router.back()} style={styles.back}>
          <MaterialDesignIcons name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.step}>Passo 4 de 4</Text>
          <Text style={styles.title}>Exportar e compartilhar</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: insets.bottom + 40 }}>
        <Card style={{ marginBottom: spacing.lg, backgroundColor: approved ? "#E8F5E9" : "#FFF8E6" }}>
          <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
            <MaterialDesignIcons name={approved ? "check-decagram" : "alert-circle-outline"} size={22} color={approved ? colors.success : colors.warning} />
            <Text testID="export-status" style={{ flex: 1, color: colors.onSurface, fontWeight: "600" }}>
              {approved ? "Prova aprovada pelo professor." : "Prova pronta. Revise antes de aplicar."}
            </Text>
          </View>
        </Card>

        {options.map((o) => (
          <Pressable key={o.k} testID={`export-${o.k}`} onPress={busy ? undefined : o.onPress} style={({ pressed }) => [styles.opt, pressed && { opacity: 0.9 }]}>
            <View style={styles.optIcon}><MaterialDesignIcons name={o.icon as any} size={26} color={colors.brandPrimary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.optTitle}>{o.title}</Text>
              <Text style={styles.optSub}>{o.sub}</Text>
            </View>
            {busy === o.k ? <ActivityIndicator color={colors.brandPrimary} /> : <MaterialDesignIcons name="chevron-right" size={22} color={colors.muted} />}
          </Pressable>
        ))}

        {msg ? <Text testID="export-msg" style={{ color: colors.onSurfaceSecondary, marginTop: spacing.md }}>{msg}</Text> : null}

        {!approved && <PrimaryButton testID="export-approve" title="Aprovar prova" icon="check" onPress={approve} style={{ marginTop: spacing.xxl }} />}
        <Pressable testID="export-home" onPress={() => router.replace("/(tabs)")} style={{ marginTop: spacing.lg, alignItems: "center", padding: spacing.md }}>
          <Text style={{ color: colors.brandPrimary, fontWeight: "600" }}>Voltar ao início</Text>
        </Pressable>
        <Text style={styles.disclaimer}>As adaptações são sugestões e devem ser revisadas pelo professor e AEE conforme o PEI. O app não realiza diagnóstico.</Text>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  step: { color: colors.brandPrimary, fontWeight: "600", fontSize: 11 },
  title: { fontWeight: "700", color: colors.onSurface, fontSize: 18 },
  opt: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  optIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  optTitle: { fontWeight: "700", color: colors.onSurface, fontSize: 15 },
  optSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  disclaimer: { color: colors.muted, fontSize: 11, textAlign: "center", marginTop: spacing.lg, lineHeight: 16 },
}));
