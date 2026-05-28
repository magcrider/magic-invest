import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Tokens, Spacing } from '@/constants/theme';
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

export function RiskProfileFlow({ onComplete }: Props) {
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
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { flex: progress }]} />
        <View style={{ flex: 1 - progress }} />
      </View>

      {!isResult && question ? (
        <View style={styles.questionContainer}>
          <Text style={styles.stepLabel}>
            {step + 1} de {RISK_QUESTIONS.length}
          </Text>
          <Text style={styles.questionText}>{question.question}</Text>
          <View style={styles.optionsList}>
            {question.options.map((opt) => {
              const selected = answers[step] === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.optionCard, selected && styles.optionCardSelected]}
                  onPress={() => selectOption(opt.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {opt.label}
                  </Text>
                  {selected && (
                    <Ionicons name="checkmark-circle" size={18} color={Tokens.structural.positive} />
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
  const config = PROFILE_CONFIG[profileLabel];
  const bands  = PROFILE_BANDS[profileLabel];

  return (
    <ScrollView
      style={styles.resultScroll}
      contentContainerStyle={styles.resultContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.resultHeading}>Tu perfil de inversión</Text>

      <View style={[styles.profileBadge, { borderColor: config.color + '80' }]}>
        <View style={[styles.profileDot, { backgroundColor: config.color }]} />
        <Text style={[styles.profileTitle, { color: config.color }]}>{config.title}</Text>
      </View>

      <Text style={styles.profileDescription}>{config.description}</Text>

      <View style={styles.bandsCard}>
        <Text style={styles.bandsCardTitle}>Distribución sugerida</Text>
        <BandRow
          label="CDTs"
          min={bands.cdt_min}
          max={bands.cdt_max}
          color={Tokens.structural.positive}
        />
        <View style={styles.bandDivider} />
        <BandRow
          label="ETFs"
          min={bands.etf_min}
          max={bands.etf_max}
          color={Tokens.structural.attention}
        />
      </View>

      <Text style={styles.bandsNote}>
        Estas bandas son un punto de partida. Puedes ajustarlas más adelante desde tu perfil.
      </Text>

      <TouchableOpacity
        style={[styles.confirmButton, saving && styles.confirmButtonDisabled]}
        onPress={onConfirm}
        disabled={saving}
        activeOpacity={0.8}
      >
        <Text style={styles.confirmText}>{saving ? 'Guardando…' : 'Comenzar'}</Text>
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
      <Text style={styles.bandLabel}>{label}</Text>
      <Text style={[styles.bandValue, { color }]}>
        {Math.round(min * 100)}–{Math.round(max * 100)}%
      </Text>
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
    backgroundColor: '#E5E7EB',
    marginBottom: Spacing.four,
  },
  progressFill: {
    backgroundColor: Tokens.structural.positive,
  },

  // Question step
  questionContainer: {
    flex: 1,
    paddingHorizontal: Spacing.one,
  },
  stepLabel: {
    fontSize: 12,
    color: Tokens.neutral.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.two,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: Tokens.neutral.text,
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
    backgroundColor: '#F0F0EC',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    backgroundColor: `${Tokens.structural.positive}18`,
    borderColor: Tokens.structural.positive,
  },
  optionText: {
    fontSize: 16,
    color: Tokens.neutral.text,
    fontWeight: '400',
  },
  optionTextSelected: {
    color: Tokens.structural.positive,
    fontWeight: '500',
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
    color: Tokens.neutral.muted,
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
    color: Tokens.neutral.text,
    marginBottom: Spacing.four,
  },
  bandsCard: {
    backgroundColor: '#F0F0EC',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  bandsCardTitle: {
    fontSize: 12,
    color: Tokens.neutral.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.three,
  },
  bandDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
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
    color: Tokens.neutral.text,
  },
  bandValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  bandsNote: {
    fontSize: 13,
    color: Tokens.neutral.muted,
    lineHeight: 19,
    marginBottom: Spacing.five,
  },
  confirmButton: {
    backgroundColor: Tokens.structural.positive,
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
    color: '#FFFFFF',
  },
});
