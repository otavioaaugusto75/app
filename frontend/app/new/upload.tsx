import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { api } from "@/src/api";
import { Card, PrimaryButton, SecondaryButton } from "@/src/components/ui";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function Upload() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const upload = async (b64: string, mime: string, source: "pdf" | "photo", suggested: string) => {
    setWorking(true);
    setError(null);
    try {
      setProgress("Lendo a prova...");
      await new Promise((r) => setTimeout(r, 200));
      setProgress("Entendendo as questões...");
      const exam = await api.uploadExam({
        title: title.trim() || suggested,
        source,
        content_base64: b64,
        mime_type: mime,
      });
      setProgress("Pronto!");
      router.replace({ pathname: "/new/profile", params: { exam_id: exam.id } });
    } catch (e: any) {
      setError(e.message || "Falha ao enviar prova");
      setProgress(null);
    } finally {
      setWorking(false);
    }
  };

  const pickPdf = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    const b64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
    upload(b64, "application/pdf", "pdf", asset.name || "Prova");
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError("Permissão de câmera negada");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    const b64 = asset.base64 ?? (await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 }));
    const mime = asset.mimeType || "image/jpeg";
    upload(b64, mime, "photo", "Foto da prova");
  };

  const pickGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Permissão de galeria negada");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    const b64 = asset.base64 ?? (await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 }));
    upload(b64, asset.mimeType || "image/jpeg", "photo", "Foto da prova");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable testID="upload-back" onPress={() => router.back()} style={styles.back}>
          <MaterialDesignIcons name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Nova adaptação</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}>
        <Text style={styles.step}>Passo 1 de 4</Text>
        <Text style={styles.h1}>Envie a prova</Text>
        <Text style={styles.body}>PDF, foto da câmera (modo Lens) ou arquivo escaneado. A IA lê e organiza as questões.</Text>

        <TextInput
          testID="upload-title"
          value={title}
          onChangeText={setTitle}
          placeholder="Título da prova (opcional)"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
          <SourceCard testID="upload-pdf" icon="file-pdf-box" title="PDF da prova" sub="Selecionar arquivo do dispositivo" onPress={pickPdf} />
          <SourceCard testID="upload-camera" icon="camera-outline" title="Modo Lens (foto)" sub="Tirar foto da prova impressa" onPress={pickPhoto} highlight={params.mode === "photo"} />
          <SourceCard testID="upload-gallery" icon="image-multiple-outline" title="Foto da galeria" sub="Importar uma imagem já salva" onPress={pickGallery} />
        </View>

        {working ? (
          <Card style={{ marginTop: spacing.xl, flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <ActivityIndicator color={colors.brandPrimary} />
            <Text testID="upload-progress" style={{ color: colors.onSurface, flex: 1 }}>{progress}</Text>
          </Card>
        ) : null}

        {error ? (
          <Card style={{ marginTop: spacing.lg, backgroundColor: "#FFECE8", borderColor: "#F4C7BE" }}>
            <Text testID="upload-error" style={{ color: colors.error, fontWeight: "600" }}>{error}</Text>
          </Card>
        ) : null}

        <Card style={{ marginTop: spacing.xxl }}>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <MaterialDesignIcons name="shield-check-outline" size={18} color={colors.brandPrimary} />
            <Text style={{ color: colors.muted, flex: 1, fontSize: 12 }}>
              Os dados do aluno são sensíveis (LGPD). Suas provas não são usadas para treinar modelos.
            </Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

function SourceCard({ icon, title, sub, onPress, testID, highlight }: { icon: string; title: string; sub: string; onPress: () => void; testID?: string; highlight?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.srcCard, pressed && { opacity: 0.9 }, highlight && { borderColor: colors.brandPrimary, borderWidth: 2 }]}>
      <View style={styles.srcIcon}>
        <MaterialDesignIcons name={icon as any} size={28} color={colors.brandPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.srcTitle}>{title}</Text>
        <Text style={styles.srcSub}>{sub}</Text>
      </View>
      <MaterialDesignIcons name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  title: { fontWeight: "700", color: colors.onSurface, fontSize: 18 },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  step: { color: colors.brandPrimary, fontWeight: "600", fontSize: 12 },
  h1: { fontSize: 26, fontWeight: "700", color: colors.onSurface, marginTop: spacing.xs },
  body: { color: colors.muted, marginTop: spacing.sm, lineHeight: 22, fontSize: 15 },
  input: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.field, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    color: colors.onSurface, fontSize: 15, marginTop: spacing.xl, minHeight: 48,
  },
  srcCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.card,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg,
  },
  srcIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  srcTitle: { fontWeight: "700", color: colors.onSurface, fontSize: 15 },
  srcSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
}));
