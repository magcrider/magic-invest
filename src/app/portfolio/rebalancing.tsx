import { useState, useEffect } from 'react'
import { ScrollView, StyleSheet, TouchableOpacity, View, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { Spacing } from '@/constants/theme'
import { useTheme } from '@/hooks/use-theme'
import { getAllCdts, getAllEtfs, getMacroContext, getUserAllocationBands, getLatestEodPrices } from '@/services/supabase-queries'
import { calculateCurrentAllocation, analyzeDeviation, generateRebalancingScenarios, type CurrentAllocation, type RebalancingScenario } from '@/lib/rebalancing'
import type { AllocationBands, CdtPosition, EtfPosition } from '@/types/database'

type ViewMode = 'maintain' | 'rebalance'

/**
 * Pantalla de Análisis de Rebalanceo
 *
 * 3 vistas navegables:
 * 1. Diagnóstico: Estado actual vs bandas objetivo
 * 2. Escenarios: Comparación Mantener vs Rebalancear
 * 3. Plan: Instrucciones detalladas paso a paso
 */
export default function RebalancingScreen() {
  const theme = useTheme()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('maintain')

  // Datos cargados
  const [bands, setBands] = useState<AllocationBands | null>(null)
  const [allocation, setAllocation] = useState<CurrentAllocation | null>(null)
  const [scenarios, setScenarios] = useState<RebalancingScenario[]>([])
  const [trm, setTrm] = useState<number>(4200)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)

      // Cargar datos necesarios
      const [cdts, etfs, macro, userBands, eodPrices] = await Promise.all([
        getAllCdts(),
        getAllEtfs(),
        getMacroContext(),
        getUserAllocationBands(),
        getLatestEodPrices([] as string[]).then(async (prices) => {
          const allEtfs = await getAllEtfs()
          const tickers = allEtfs.map(e => e.ticker)
          return getLatestEodPrices(tickers)
        })
      ])

      setTrm(macro.trm)
      setBands(userBands)

      // Calcular valores
      const cdtTotal = cdts.reduce((sum, cdt) => sum + cdt.amount, 0)

      let etfTotalCOP = 0
      for (const etf of etfs) {
        const price = eodPrices.get(etf.ticker)
        if (price) {
          etfTotalCOP += etf.shares * price.close * macro.trm
        } else {
          // Fallback a valor invertido
          if (etf.total_invested_cop) {
            etfTotalCOP += etf.total_invested_cop
          } else if (etf.total_invested_usd) {
            etfTotalCOP += etf.total_invested_usd * macro.trm
          }
        }
      }

      // Calcular asignación
      const currentAllocation = calculateCurrentAllocation(cdtTotal, etfTotalCOP)
      setAllocation(currentAllocation)

      // Generar escenarios
      const generatedScenarios = generateRebalancingScenarios(
        currentAllocation,
        userBands,
        macro.trm
      )
      setScenarios(generatedScenarios)

    } catch (error) {
      console.error('Error loading rebalancing data:', error)
      Alert.alert('Error', 'No se pudo cargar la información de rebalanceo')
    } finally {
      setLoading(false)
    }
  }

  if (loading || !bands || !allocation) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <ThemedText type="subtitle" style={styles.headerTitle}>Rebalanceo</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Cargando...</ThemedText>
            </View>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.positive} />
          </View>
        </SafeAreaView>
      </ThemedView>
    )
  }

  const maintainScenario = scenarios.find(s => s.action === 'maintain')
  const rebalanceScenario = scenarios.find(s => s.action === 'rebalance')

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <ThemedText type="subtitle" style={styles.headerTitle}>Análisis de Rebalanceo</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Elige tu escenario
            </ThemedText>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[
              styles.tab,
              viewMode === 'maintain' && { borderBottomColor: theme.positive, borderBottomWidth: 2 },
            ]}
            onPress={() => setViewMode('maintain')}
          >
            <ThemedText
              type={viewMode === 'maintain' ? 'defaultBold' : 'default'}
              style={{ color: viewMode === 'maintain' ? theme.text : theme.textSecondary }}
            >
              Mantener
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              viewMode === 'rebalance' && { borderBottomColor: theme.positive, borderBottomWidth: 2 },
            ]}
            onPress={() => setViewMode('rebalance')}
          >
            <ThemedText
              type={viewMode === 'rebalance' ? 'defaultBold' : 'default'}
              style={{ color: viewMode === 'rebalance' ? theme.text : theme.textSecondary }}
            >
              Rebalancear
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          {viewMode === 'maintain' && maintainScenario && (
            <MaintainView
              scenario={maintainScenario}
              currentAllocation={allocation}
            />
          )}

          {viewMode === 'rebalance' && rebalanceScenario && (
            <RebalanceView
              scenario={rebalanceScenario}
              trm={trm}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  )
}

// ============================================================================
// Vista 1: Mantener (Escenario A)
// ============================================================================

function MaintainView({
  scenario,
  currentAllocation,
}: {
  scenario: RebalancingScenario
  currentAllocation: CurrentAllocation
}) {
  const theme = useTheme()

  const drawdownCOP = currentAllocation.etfValueCOP * 0.25
  const drawdownPercentage = (drawdownCOP / currentAllocation.totalValueCOP) * 100

  return (
    <ThemedView>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        No realizar ninguna acción
      </ThemedText>

      <ThemedText type="default" style={styles.intro}>
        Mantener tu asignación actual sin cambios.
      </ThemedText>

      {/* Costo Badge */}
      <View style={[styles.costCard, { backgroundColor: theme.positiveSubtle, borderLeftColor: theme.positive }]}>
        <ThemedText type="defaultBold" style={{ color: theme.positive }}>
          Costo: $0
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Sin comisiones ni movimientos
        </ThemedText>
      </View>

      {/* Métricas */}
      <ThemedView style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="defaultBold" style={styles.cardTitle}>
          Consecuencias
        </ThemedText>

        <MetricRow
          label="Exposición cambiaria"
          value={`${currentAllocation.etfPercentage.toFixed(1)}% en USD`}
          theme={theme}
        />

        <MetricRow
          label="Drawdown potencial (caída 25% ETF)"
          value={`-${drawdownPercentage.toFixed(1)}% portafolio`}
          theme={theme}
        />

        <MetricRow
          label="Pérdida estimada si TRM baja 10%"
          value={`-$${((currentAllocation.etfValueCOP * 0.1)).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`}
          theme={theme}
        />

        <MetricRow
          label="Alineación con perfil"
          value="Desviado"
          theme={theme}
          warning
        />
      </ThemedView>

      {/* Explicación */}
      <ThemedView style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="defaultBold" style={styles.cardTitle}>
          ¿Cuándo tiene sentido?
        </ThemedText>

        <ThemedText type="small" themeColor="textSecondary" style={styles.bulletText}>
          • Crees que el dólar seguirá subiendo
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.bulletText}>
          • Tus ETFs están en pérdida y prefieres no vender ahora
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.bulletText}>
          • Tienes un CDT próximo a vencer y rebalancearás entonces
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.bulletText}>
          • La desviación es menor y prefieres esperar
        </ThemedText>
      </ThemedView>
    </ThemedView>
  )
}

function MetricRow({
  label,
  value,
  theme,
  warning,
  positive,
}: {
  label: string
  value: string
  theme: any
  warning?: boolean
  positive?: boolean
}) {
  return (
    <View style={styles.metricRow}>
      <View style={styles.metricLabel}>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
      </View>
      <View style={styles.metricValue}>
        <ThemedText
          type="small"
          style={{
            color: warning ? theme.attention : positive ? theme.positive : theme.text,
            fontWeight: '600',
            textAlign: 'right',
          }}
        >
          {value}
        </ThemedText>
      </View>
    </View>
  )
}

// ============================================================================
// Vista 2: Rebalancear (Escenario B)
// ============================================================================

function RebalanceView({ scenario, trm }: { scenario: RebalancingScenario; trm: number }) {
  const theme = useTheme()

  return (
    <ThemedView>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Rebalancear al centro
      </ThemedText>

      <ThemedText type="default" style={styles.intro}>
        Ajustar tu asignación a {scenario.targetCdtPercentage.toFixed(0)}% CDT / {scenario.targetEtfPercentage.toFixed(0)}% ETF
      </ThemedText>

      {/* Costo Badge */}
      <View style={[styles.costCard, { backgroundColor: theme.attentionSubtle, borderLeftColor: theme.attention }]}>
        <ThemedText type="defaultBold" style={{ color: theme.attention }}>
          Costo: ${scenario.totalCost.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Comisiones + spread cambiario
        </ThemedText>
      </View>

      {/* Métricas */}
      <ThemedView style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="defaultBold" style={styles.cardTitle}>
          Resultado
        </ThemedText>

        <MetricRow
          label="Nueva exposición cambiaria"
          value={`${scenario.targetEtfPercentage.toFixed(1)}% en USD`}
          theme={theme}
        />

        <MetricRow
          label="Comisiones estimadas"
          value={`$${scenario.estimatedCommission.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`}
          theme={theme}
        />

        <MetricRow
          label="Spread cambiario"
          value={`$${scenario.estimatedSpread.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`}
          theme={theme}
        />

        <MetricRow
          label="Alineación con perfil"
          value="Centrado"
          theme={theme}
          positive
        />
      </ThemedView>

      {/* Plan paso a paso */}
      <ThemedText type="defaultBold" style={styles.planTitle}>
        Plan paso a paso
      </ThemedText>

      {/* Steps */}
      <View style={styles.stepsList}>
        {scenario.etfToSell && scenario.cdtToBuy && (
          <>
            <StepCard
              number={1}
              title="Vender ETF"
              description={`Vende ${scenario.etfToSell.toFixed(2)} USD en ETFs (aprox. $${(scenario.etfToSell * trm).toLocaleString('es-CO', { maximumFractionDigits: 0 })} COP)`}
              icon="trending-down"
              theme={theme}
            />

            <StepCard
              number={2}
              title="Abrir CDT"
              description={`Invierte $${scenario.cdtToBuy.toLocaleString('es-CO', { maximumFractionDigits: 0 })} COP en un nuevo CDT a 360 días`}
              icon="briefcase"
              theme={theme}
            />
          </>
        )}

        {scenario.cdtToSell && scenario.etfToBuy && (
          <>
            <StepCard
              number={1}
              title="Cancelar CDT"
              description={`Cancela CDT por valor de $${scenario.cdtToSell.toLocaleString('es-CO', { maximumFractionDigits: 0 })} COP (espera vencimiento si es posible)`}
              icon="briefcase-outline"
              theme={theme}
            />

            <StepCard
              number={2}
              title="Comprar ETF"
              description={`Invierte ${scenario.etfToBuy.toFixed(2)} USD en ETFs (aprox. $${(scenario.etfToBuy * trm).toLocaleString('es-CO', { maximumFractionDigits: 0 })} COP)`}
              icon="trending-up"
              theme={theme}
            />
          </>
        )}

        <StepCard
          number={3}
          title="Registrar en Magic Invest"
          description="Actualiza tus posiciones en la app para reflejar los cambios"
          icon="create-outline"
          theme={theme}
        />
      </View>

      {/* Cost Breakdown */}
      <ThemedView style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="defaultBold" style={styles.cardTitle}>
          Detalle de costos
        </ThemedText>

        <View style={styles.costRow}>
          <ThemedText type="small" themeColor="textSecondary">
            Comisión plataforma (0.5%)
          </ThemedText>
          <ThemedText type="small">
            ${scenario.estimatedCommission.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
          </ThemedText>
        </View>

        <View style={styles.costRow}>
          <ThemedText type="small" themeColor="textSecondary">
            Spread cambiario (0.3%)
          </ThemedText>
          <ThemedText type="small">
            ${scenario.estimatedSpread.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
          </ThemedText>
        </View>

        <View style={[styles.costRow, styles.costTotal, { borderTopColor: theme.divider }]}>
          <ThemedText type="defaultBold">Total estimado</ThemedText>
          <ThemedText type="defaultBold">
            ${scenario.totalCost.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
          </ThemedText>
        </View>
      </ThemedView>

      {/* Tax Warning */}
      {scenario.capitalGain && scenario.capitalGain > 0 && (
        <ThemedView style={[styles.card, { backgroundColor: theme.attentionSubtle, borderLeftWidth: 4, borderLeftColor: theme.attention }]}>
          <View style={styles.warningHeader}>
            <Ionicons name="warning" size={20} color={theme.attention} />
            <ThemedText type="defaultBold" style={{ color: theme.attention }}>
              Impacto fiscal
            </ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Ganancia de capital estimada: ${scenario.capitalGain.toFixed(2)} USD
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: Spacing.two }}>
            Esta ganancia está sujeta a impuesto de renta (~15-35%) según tu rango. Consulta con tu contador para tu caso específico.
          </ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  )
}

function StepCard({
  number,
  title,
  description,
  icon,
  theme,
}: {
  number: number
  title: string
  description: string
  icon: string
  theme: any
}) {
  return (
    <View style={[styles.stepCard, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepNumber, { backgroundColor: theme.positive }]}>
          <ThemedText style={styles.stepNumberText}>{number}</ThemedText>
        </View>
        <Ionicons name={icon as any} size={24} color={theme.textSecondary} />
      </View>
      <ThemedText type="defaultBold" style={styles.stepTitle}>
        {title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {description}
      </ThemedText>
    </View>
  )
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
    paddingHorizontal: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingTop: Spacing.two,
  },
  backButton: {
    paddingTop: 2,
  },
  headerText: {
    flex: 1,
    gap: Spacing.one,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    gap: Spacing.four,
    marginTop: Spacing.three,
  },
  tab: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
  },
  content: {
    flex: 1,
    paddingTop: Spacing.four,
  },
  contentContainer: {
    paddingBottom: Spacing.four * 4,
  },
  sectionTitle: {
    marginBottom: Spacing.three,
  },
  intro: {
    marginBottom: Spacing.three,
  },
  costCard: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderLeftWidth: 4,
    marginBottom: Spacing.three,
    gap: Spacing.one,
  },
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.two,
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  bulletText: {
    marginTop: Spacing.one,
  },
  planTitle: {
    marginTop: Spacing.four,
    marginBottom: Spacing.three,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  metricLabel: {
    flex: 1,
    paddingRight: Spacing.three,
  },
  metricValue: {
    flex: 0.6,
    alignItems: 'flex-end',
  },
  stepsList: {
    gap: Spacing.three,
  },
  stepCard: {
    padding: Spacing.four,
    borderRadius: Spacing.two,
    gap: Spacing.two,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepTitle: {
    marginBottom: Spacing.one,
  },
  cardTitle: {
    marginBottom: Spacing.three,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  costTotal: {
    marginTop: Spacing.two,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
})
