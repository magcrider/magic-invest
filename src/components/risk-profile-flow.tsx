import { useState, useMemo } from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  RISK_QUESTIONS,
  PROFILE_CONFIG,
  PROFILE_BANDS,
  scoreProfile,
  type RiskProfile,
  type RiskProfileLabel,
} from '@/constants/risk-profile';

interface Props {
  onComplete: (profile: RiskProfile) => Promise<void>;
}

type ThemeColors = ReturnType<typeof useTheme>;

function getProfileThemeColor(label: RiskProfileLabel, theme: ThemeColors): string {
  switch (label) {
    case 'conservador': return theme.positive;
    case 'moderado':    return theme.attention;
    case 'arriesgado':  return theme.risk;
  }
}

export function RiskProfileFlow({ onComplete }: Props) {
  const theme = useTheme();

  const [step, setStep]       = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>(
    Array(RISK_QUESTIONS.length).fill(null)
  );
  const [saving, setSaving]   = useState(false);

  const isResult = step >= RISK_QUESTIONS.length;
  const question = isResult ? null : RISK_QUESTIONS[step];

  const profileLabel = useMemo<RiskProfileLabel | null>(() => {
    if (!isResult) return null;
    const [h, r, g] = answers;
    if (!h || !r || !g) return null;
    return scoreProfile(h, r, g);
  }, [isResult, answers]);

  function selectOption(optionId: string) {
    if (answers[step] !== null) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[step] = optionId;
      return next;
    });
    setTimeout(() => setStep((s) => s + 1), 180);
  }

  async function handleConfirm() {
    if (!profileLabel) return;
    const [horizon, reaction, goal, experience, emotion] = answers;
    if (!horizon || !reaction || !goal || !experience || !emotion) return;
    setSaving(true);
    try {
      await onComplete({
        label: profileLabel,
        horizon,
        reaction,
        goal,
        experience,
        emotion,
        answeredAt: new Date().toISOString(),
      });
    } finally {
      setSaving(false);
    }
  }

  const progress = isResult ? 1 : step / RISK_QUESTIONS.length;

  return (
    <View style={styles.root}>
      <View style={[styles.progressTrack, { backgroundColor: theme.divider }]}>
        <View style={[styles.progressFill, { flex: progress, backgroundColor: theme.positive }]} />
        <View style={{ flex: 1 - progress }} />
      </View>

      {!isResult && question ? (
        <View style={styles.questionContainer}>
          <ThemedText style={[styles.stepLabel, { color: theme.textSecondary }]}>
            {step + 1} de {RISK_QUESTIONS.length}
          </ThemedText>
          <ThemedText style={styles.questionText}>{question.question}</ThemedText>
          <View style={styles.optionsList}>
            {question.options.map((opt) => {
              const selected = answers[step] === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.optionCard,
                    { backgroundColor: theme.backgroundElement },
                    selected && { backgroundColor: theme.positiveSubtle, borderColor: theme.positive },
                  ]}
                  onPress={() => selectOption(opt.id)}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[
                    styles.optionText,
                    { color: selected ? theme.positive : theme.text },
                    selected ? { fontWeight: '500' as const } : undefined,
                  ]}>
                    {opt.label}
                  </ThemedText>
                  {selected && (
                    <Ionicons name="checkmark-circle" size={18} color={theme.positive} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : profileLabel ? (
        <ResultScreen
          profileLabel={profileLabel}
          saving={saving}
          onConfirm={handleConfirm}
        />
      ) : null}
    </View>
  );
}

interface ResultScreenProps {
  profileLabel: RiskProfileLabel;
  saving:       boolean;
  onConfirm:    () => void;
}

function ResultScreen({ profileLabel, saving, onConfirm }: ResultScreenProps) {
  const theme        = useTheme();
  const config       = PROFILE_CONFIG[profileLabel];
  const bands        = PROFILE_BANDS[profileLabel];
  const profileColor = getProfileThemeColor(profileLabel, theme);

  return (
    <ScrollView
      style={styles.resultScroll}
      contentContainerStyle={styles.resultContainer}
      showsVerticalScrollIndicator={false}
    >
      <ThemedText style={[styles.resultHeading, { color: theme.textSecondary }]}>
        Tu perfil de inversión
      </ThemedText>

      <View style={[styles.profileBadge, { borderColor: profileColor + '80' }]}>
        <View style={[styles.profileDot, { backgroundColor: profileColor }]} />
        <ThemedText style={[styles.profileTitle, { color: profileColor }]}>{config.title}</ThemedText>
      </View>

      <ThemedText style={styles.profileDescription}>{config.description}</ThemedText>

      <View style={[styles.bandsCard, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText style={[styles.bandsCardTitle, { color: theme.textSecondary }]}>
          Distribución sugerida
        </ThemedText>
        <BandRow label="CDTs" min={bands.cdt_min} max={bands.cdt_max} color={theme.assetCdt} />
        <View style={[styles.bandDivider, { backgroundColor: theme.divider }]} />
        <BandRow label="ETFs" min={bands.etf_min} max={bands.etf_max} color={theme.assetEtf} />
      </View>

      <ThemedText style={[styles.bandsNote, { color: theme.textSecondary }]}>
        Estas bandas son un punto de partida. Puedes ajustarlas más adelante desde tu perfil.
      </ThemedText>

      <TouchableOpacity
        style={[
          styles.confirmButton,
          { backgroundColor: theme.positive },
          saving && styles.confirmButtonDisabled,
        ]}
        onPress={onConfirm}
        disabled={saving}
        activeOpacity={0.8}
      >
        <ThemedText style={[styles.confirmText, { color: '#FFFFFF' }]}>
          {saving ? 'Guardando…' : 'Comenzar'}
        </ThemedText>
      </TouchableOpacity>
    </ScrollView>
  );
}

interface BandRowProps {
  label: string;
  min:   number;
  max:   number;
  color: string;
}

function BandRow({ label, min, max, color }: BandRowProps) {
  return (
    <View style={styles.bandRow}>
      <View style={[styles.bandDot, { backgroundColor: color }]} />
      <ThemedText style={styles.bandLabel}>{label}</ThemedText>
      <ThemedText style={[styles.bandValue, { color }]}>
        {Math.round(min * 100)}–{Math.round(max * 100)}%
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  progressTrack: {
    height: 3,
    flexDirection: 'row',
    marginBottom: Spacing.four,
  },
  progressFill: {},

  // Question step
  questionContainer: {
    flex: 1,
    paddingHorizontal: Spacing.one,
  },
  stepLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.two,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    marginBottom: Spacing.four,
  },
  optionsList: {
    gap: Spacing.two,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '400',
  },

  // Result step
  resultScroll: {
    flex: 1,
  },
  resultContainer: {
    paddingHorizontal: Spacing.one,
    paddingBottom: Spacing.six,
  },
  resultHeading: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.three,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 100,
    borderWidth: 1.5,
    marginBottom: Spacing.three,
  },
  profileDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  profileTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  profileDescription: {
    fontSize: 15,
    lineHeight: 23,
    marginBottom: Spacing.four,
  },
  bandsCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  bandsCardTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.three,
  },
  bandDivider: {
    height: 1,
    marginVertical: Spacing.two,
  },
  bandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  bandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bandLabel: {
    flex: 1,
    fontSize: 14,
  },
  bandValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  bandsNote: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: Spacing.five,
  },
  confirmButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
