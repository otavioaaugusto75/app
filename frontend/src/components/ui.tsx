import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { gradients, radius, spacing, useTheme } from "@/src/theme";

type PrimaryBtnProps = {
  title: string;
  onPress: () => void;
  testID?: string;
  icon?: string;
  disabled?: boolean;
  style?: ViewStyle;
  loading?: boolean;
};

export function PrimaryButton({ title, onPress, testID, icon, disabled, style, loading }: PrimaryBtnProps) {
  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      testID={testID}
      style={({ pressed }) => [
        { opacity: disabled ? 0.5 : pressed ? 0.9 : 1, borderRadius: radius.pill },
        style,
      ]}
    >
      <LinearGradient
        colors={[...gradients.brand]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={pbStyles.btn}
      >
        {icon ? <MaterialDesignIcons name={icon as any} size={20} color="#FFFFFF" /> : null}
        <Text style={pbStyles.text}>{loading ? "Carregando..." : title}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const pbStyles = StyleSheet.create({
  btn: {
    minHeight: 52,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  text: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});

type SecondaryBtnProps = {
  title: string;
  onPress: () => void;
  testID?: string;
  icon?: string;
  style?: ViewStyle;
};

export function SecondaryButton({ title, onPress, testID, icon, style }: SecondaryBtnProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 52,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.xxl,
          paddingVertical: spacing.md,
          borderWidth: 1.5,
          borderColor: colors.brandPrimary,
          backgroundColor: pressed ? colors.brandSecondary : "transparent",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: spacing.sm,
        },
        style,
      ]}
    >
      {icon ? <MaterialDesignIcons name={icon as any} size={20} color={colors.brandPrimary} /> : null}
      <Text style={{ color: colors.brandPrimary, fontSize: 16, fontWeight: "700" }}>{title}</Text>
    </Pressable>
  );
}

export function AuroraBackground({ children, style }: { children?: React.ReactNode; style?: ViewStyle }) {
  return (
    <LinearGradient
      colors={[...gradients.aurora]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ flex: 1 }, style]}
    >
      {children}
    </LinearGradient>
  );
}

export function Card({ children, style, testID }: { children: React.ReactNode; style?: ViewStyle; testID?: string }) {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: colors.surfaceSecondary,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.lg,
          shadowColor: "#232F3E",
          shadowOpacity: 0.06,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
