import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { storage } from "@/src/utils/storage";
import { useAuth } from "@/src/auth-context";
import { useTheme } from "@/src/theme";

const ONBOARDING_KEY = "inclusiv_onboarded";

export default function Index() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      if (loading) return;
      const onboarded = await storage.getItem<boolean>(ONBOARDING_KEY, false);
      if (!onboarded) {
        router.replace("/onboarding");
      } else if (!user) {
        router.replace("/(auth)/login");
      } else {
        router.replace("/(tabs)");
      }
    })();
  }, [loading, user, router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={colors.brandPrimary} />
    </View>
  );
}
