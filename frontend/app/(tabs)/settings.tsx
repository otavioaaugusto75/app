import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { useAuth } from "@/src/auth-context";
import { Card, SecondaryButton } from "@/src/components/ui";
import { makeStyles, spacing, useTheme } from "@/src/theme";

export default function Settings() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const router = useRouter();
  const { colors } = useTheme();
  const { user, signOut } = useAuth();

  const items = [
    { icon: "shield-check-outline", title: "Privacidade e LGPD", sub: "Consentimentos, exportar/excluir dados" },
    { icon: "palette-outline", title: "Acessibilidade do app", sub: "Fonte dislexia, contraste, redução de movimento" },
    { icon: "credit-card-outline", title: "Plano da instituição", sub: "Provas/mês, usuários, white-label" },
    { icon: "help-circle-outline", title: "Ajuda e suporte", sub: "Dúvidas pedagógicas, bugs" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.title}>Conta</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}>
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <View style={styles.avatar}>
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 20 }}>{user?.name?.[0]?.toUpperCase() ?? "P"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{user?.name}</Text>
              <Text style={styles.sub}>{user?.email}</Text>
              <Text style={styles.sub}>{user?.institution}</Text>
            </View>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Configurações</Text>
        {items.map((it) => (
          <Card key={it.title} style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <MaterialDesignIcons name={it.icon as any} size={22} color={colors.brandPrimary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{it.title}</Text>
                <Text style={styles.itemSub}>{it.sub}</Text>
              </View>
              <MaterialDesignIcons name="chevron-right" size={20} color={colors.muted} />
            </View>
          </Card>
        ))}

        <Card style={{ marginTop: spacing.lg, backgroundColor: colors.surfaceTertiary }}>
          <Text style={styles.disclaimer}>As adaptações são sugestões baseadas em boas práticas pedagógicas e devem ser revisadas pelo professor e pela equipe de AEE conforme o PEI e a legislação local. O app não realiza diagnóstico.</Text>
        </Card>

        <SecondaryButton
          testID="settings-signout"
          title="Sair"
          icon="logout"
          onPress={async () => { await signOut(); router.replace("/(auth)/login"); }}
          style={{ marginTop: spacing.xxl }}
        />
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  title: { fontSize: 28, fontWeight: "700", color: colors.onSurface },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#6B40E6", alignItems: "center", justifyContent: "center" },
  name: { fontWeight: "700", color: colors.onSurface, fontSize: 16 },
  sub: { color: colors.muted, fontSize: 13 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.onSurface, marginTop: spacing.xxl, marginBottom: spacing.md },
  itemTitle: { fontWeight: "600", color: colors.onSurface },
  itemSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  disclaimer: { color: colors.onSurfaceSecondary, fontSize: 12, lineHeight: 18 },
}));
