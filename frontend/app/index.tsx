import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { storage } from "@/src/utils/storage";
import { useAuth } from "@/src/auth-context";
import { AnimatedSplash } from "@/src/components/animated-splash";

const ONBOARDING_KEY = "inclusiv_onboarded";

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [animDone, setAnimDone] = useState(false);
  const finish = useCallback(() => setAnimDone(true), []);

  useEffect(() => {
    if (loading || !animDone) return;
    (async () => {
      const onboarded = await storage.getItem<boolean>(ONBOARDING_KEY, false);
      if (!onboarded) router.replace("/onboarding");
      else if (!user) router.replace("/(auth)/login");
      else router.replace("/(tabs)");
    })();
  }, [loading, animDone, user, router]);

  return <AnimatedSplash onFinish={finish} />;
}
