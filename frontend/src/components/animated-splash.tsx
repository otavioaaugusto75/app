import { useEffect } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { AuroraBackground } from "@/src/components/ui";
import { gradients, spacing, useTheme } from "@/src/theme";

const BOX = 104;
const SHAPE = 30;
const GAP = 22; // offset of each shape center from the box center

type ShapeKind = "square" | "circle" | "triangle" | "plus";

// Final slot inside the logo + the screen corner it flies in from.
const SHAPES: { kind: ShapeKind; x: number; y: number; fromX: number; fromY: number; rot: number }[] = [
  { kind: "square", x: -GAP, y: -GAP, fromX: -1, fromY: -1, rot: -200 },
  { kind: "circle", x: GAP, y: -GAP, fromX: 1, fromY: -1, rot: 160 },
  { kind: "triangle", x: -GAP, y: GAP, fromX: -1, fromY: 1, rot: 220 },
  { kind: "plus", x: GAP, y: GAP, fromX: 1, fromY: 1, rot: -180 },
];

const STAGGER = 120;
const SHAPES_START = 250;

export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();

  const box = useSharedValue(reduced ? 1 : 0);
  const word = useSharedValue(reduced ? 1 : 0);
  const p0 = useSharedValue(reduced ? 1 : 0);
  const p1 = useSharedValue(reduced ? 1 : 0);
  const p2 = useSharedValue(reduced ? 1 : 0);
  const p3 = useSharedValue(reduced ? 1 : 0);
  const progress = [p0, p1, p2, p3];

  useEffect(() => {
    if (reduced) {
      const t = setTimeout(onFinish, 600);
      return () => clearTimeout(t);
    }
    const ease = Easing.out(Easing.cubic);
    box.value = withSequence(
      withTiming(1, { duration: 450, easing: ease }),
      withDelay(SHAPES_START + STAGGER * 3 + 350, withSpring(1.06, { damping: 8, stiffness: 180 })),
      withSpring(1, { damping: 12, stiffness: 160 }),
    );
    [p0, p1, p2, p3].forEach((p, i) => {
      p.value = withDelay(SHAPES_START + i * STAGGER, withTiming(1, { duration: 750, easing: Easing.out(Easing.exp) }));
    });
    word.value = withDelay(1350, withTiming(1, { duration: 500, easing: ease }));
    const t = setTimeout(onFinish, 2400);
    return () => clearTimeout(t);
  }, [reduced, onFinish, box, word, p0, p1, p2, p3]);

  const boxStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, box.value * 1.4),
    transform: [{ scale: 0.7 + 0.3 * box.value }],
  }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{ translateY: (1 - word.value) * 14 }],
  }));

  // Far enough to start fully off-screen from each corner.
  const reachX = width * 0.75;
  const reachY = height * 0.6;

  return (
    <AuroraBackground>
      <View testID="animated-splash" style={styles.center}>
        <View style={styles.logoWrap}>
          <Animated.View style={[styles.box, { backgroundColor: gradients.brand[0] }, boxStyle]} />
          {SHAPES.map((s, i) => (
            <FlyingShape key={s.kind} shape={s} progress={progress[i]} reachX={reachX} reachY={reachY} accent={colors.accent} />
          ))}
        </View>
        <Animated.View style={[styles.wordWrap, wordStyle]}>
          <Text testID="splash-wordmark" style={[styles.word, { color: colors.onSurface }]}>inclusiv.ai</Text>
          <Text style={[styles.tagline, { color: colors.muted }]}>Provas adaptadas para cada aluno</Text>
        </Animated.View>
      </View>
    </AuroraBackground>
  );
}

function FlyingShape({
  shape, progress, reachX, reachY, accent,
}: {
  shape: (typeof SHAPES)[number];
  progress: SharedValue<number>;
  reachX: number;
  reachY: number;
  accent: string;
}) {
  const style = useAnimatedStyle(() => {
    const inv = 1 - progress.value;
    return {
      opacity: Math.min(1, progress.value * 3),
      transform: [
        { translateX: shape.x + shape.fromX * reachX * inv },
        { translateY: shape.y + shape.fromY * reachY * inv },
        { rotate: `${shape.rot * inv}deg` },
        { scale: 1 + 0.6 * inv },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.shapeSlot, style]}>
      <ShapeGlyph kind={shape.kind} accent={accent} />
    </Animated.View>
  );
}

function ShapeGlyph({ kind, accent }: { kind: ShapeKind; accent: string }) {
  const white = "#FFFFFF";
  const pink = gradients.aurora[1];
  switch (kind) {
    case "square":
      return <View style={[styles.square, { backgroundColor: white }]} />;
    case "circle":
      return <View style={[styles.circle, { backgroundColor: accent }]} />;
    case "triangle":
      return <View style={[styles.triangle, { borderBottomColor: pink }]} />;
    case "plus":
      return (
        <View style={styles.plusWrap}>
          <View style={[styles.plusBarH, { backgroundColor: white }]} />
          <View style={[styles.plusBarV, { backgroundColor: white }]} />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  logoWrap: { width: BOX, height: BOX, alignItems: "center", justifyContent: "center" },
  box: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
    shadowColor: "#6B40E6",
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  shapeSlot: {
    position: "absolute",
    width: SHAPE,
    height: SHAPE,
    alignItems: "center",
    justifyContent: "center",
  },
  square: { width: SHAPE - 6, height: SHAPE - 6, borderRadius: 6 },
  circle: { width: SHAPE - 4, height: SHAPE - 4, borderRadius: SHAPE },
  triangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 24,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  plusWrap: { width: SHAPE - 4, height: SHAPE - 4, alignItems: "center", justifyContent: "center" },
  plusBarH: { position: "absolute", width: SHAPE - 4, height: 7, borderRadius: 4 },
  plusBarV: { position: "absolute", width: 7, height: SHAPE - 4, borderRadius: 4 },
  wordWrap: { alignItems: "center", marginTop: spacing.xxl },
  word: { fontSize: 34, fontWeight: "800", letterSpacing: -0.5 },
  tagline: { fontSize: 15, marginTop: spacing.xs },
});
