import { Tabs } from "expo-router";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { useTheme } from "@/src/theme";

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surfaceSecondary, borderTopColor: colors.border },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarIcon: ({ color, size }) => <MaterialDesignIcons name="home-variant" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="exams"
        options={{
          title: "Provas",
          tabBarIcon: ({ color, size }) => <MaterialDesignIcons name="file-document-multiple-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: "Alunos",
          tabBarIcon: ({ color, size }) => <MaterialDesignIcons name="account-group-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Conta",
          tabBarIcon: ({ color, size }) => <MaterialDesignIcons name="cog-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
