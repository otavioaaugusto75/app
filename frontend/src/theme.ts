// inclusiv.ai design tokens.
// Paleta inspirada na identidade AWS em versão suave/pastel (ver design/DESIGN_SYSTEM.md).
import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  // Surfaces
  surface: "#F7F9FC",
  onSurface: "#232F3E",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#232F3E",
  surfaceTertiary: "#EEF2F7",
  onSurfaceTertiary: "#232F3E",
  surfaceInverse: "#232F3E",
  onSurfaceInverse: "#FFFFFF",
  muted: "#5F6B7A",

  // Brand (AWS-inspired)
  brand: "#0972D3",
  onBrand: "#FFFFFF",
  brandPrimary: "#0972D3",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#E6F4FF",
  onBrandSecondary: "#0972D3",
  brandTertiary: "#F3F4F6",
  onBrandTertiary: "#232F3E",

  // Accent (laranja AWS)
  accent: "#FF9900",
  onAccent: "#FFFFFF",
  cyan: "#00A1C9",

  // Status
  success: "#1D8102",
  onSuccess: "#FFFFFF",
  warning: "#DB7500",
  onWarning: "#FFFFFF",
  error: "#D13212",
  onError: "#FFFFFF",
  info: "#0972D3",
  onInfo: "#FFFFFF",

  // Lines
  border: "#E6EAF0",
  borderStrong: "#D0D7E2",
  divider: "#E6EAF0",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;
export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

// Degradês do design system
export const gradients = {
  aurora: ["#EEF0FF", "#FDEFF7", "#FFF3E3"] as const,
  brand: ["#6B40E6", "#E0457B", "#FF9900"] as const,
  sea: ["#E6F4FF", "#E3F9F8"] as const,
  night: ["#232F3E", "#1B2431"] as const,
};

// Espaçamento 8pt grid
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  field: 12,
  card: 16,
  pill: 999,
};

// Cores por perfil (chips pastel)
export const profileColors: Record<string, { bg: string; fg: string; icon: string }> = {
  dislexia: { bg: "#FFF3E3", fg: "#8A4B00", icon: "book-open-variant" },
  tdah: { bg: "#FDEFF7", fg: "#8E1E55", icon: "lightning-bolt" },
  tea: { bg: "#EEF0FF", fg: "#3B2A99", icon: "puzzle" },
  intelectual: { bg: "#E6F4FF", fg: "#044A82", icon: "brain" },
  baixa_visao: { bg: "#E3F9F8", fg: "#0A5E63", icon: "magnify" },
  cegueira: { bg: "#EEF2F7", fg: "#232F3E", icon: "eye-off" },
  surdez: { bg: "#F3EEFF", fg: "#4A1D96", icon: "hand-wave" },
  motora: { bg: "#FFEDE3", fg: "#8A3D00", icon: "wheelchair" },
  discalculia: { bg: "#E8F5E9", fg: "#1F4D23", icon: "calculator-variant" },
  disgrafia: { bg: "#FFF8E1", fg: "#6B5000", icon: "pencil-off" },
};

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}
setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

export const colors = light;
