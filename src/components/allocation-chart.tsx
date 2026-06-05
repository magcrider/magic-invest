import { View, StyleSheet } from 'react-native'
import { ThemedText } from './themed-text'
import { ThemedView } from './themed-view'
import { Spacing } from '@/constants/theme'
import { useTheme } from '@/hooks/use-theme'
import type { AllocationBands } from '@/types/database'

interface Props {
  cdtPercentage: number
  etfPercentage: number
  bands: AllocationBands
  showLabels?: boolean
}

/**
 * Gráfico visual de asignación del portafolio
 * Muestra barras con bandas objetivo y asignación actual
 */
export function AllocationChart({ cdtPercentage, etfPercentage, bands, showLabels = true }: Props) {
  const theme = useTheme()

  // Determinar si está dentro o fuera de bandas
  const cdtInRange = cdtPercentage >= bands.cdt_min && cdtPercentage <= bands.cdt_max
  const etfInRange = etfPercentage >= bands.etf_min && etfPercentage <= bands.etf_max

  // Usar colores específicos de asset (CDT = marrón, ETF = azul)
  const cdtColor = theme.assetCdt
  const etfColor = theme.assetEtf

  // Color de alerta para indicador
  const cdtIndicatorColor = cdtInRange ? theme.positive : theme.attention
  const etfIndicatorColor = etfInRange ? theme.positive : theme.attention

  return (
    <ThemedView style={styles.container}>
      {/* CDT Bar */}
      {showLabels && (
        <View style={styles.labelRow}>
          <ThemedText type="defaultBold">CDT</ThemedText>
          <View style={styles.labelRight}>
            <ThemedText type="small" themeColor="textSecondary">
              {cdtPercentage.toFixed(1)}%
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              (objetivo: {bands.cdt_min}-{bands.cdt_max}%)
            </ThemedText>
          </View>
        </View>
      )}

      <View style={styles.barContainer}>
        {/* Banda objetivo CDT (fondo con borde) */}
        <View
          style={[
            styles.bandBackground,
            {
              backgroundColor: `${cdtColor}20`,
              borderWidth: 1,
              borderColor: `${cdtColor}40`,
              left: `${bands.cdt_min}%`,
              width: `${bands.cdt_max - bands.cdt_min}%`,
            },
          ]}
        />

        {/* Barra de progreso CDT */}
        <View
          style={[
            styles.progressBar,
            {
              backgroundColor: cdtColor,
              width: `${Math.min(cdtPercentage, 100)}%`,
              opacity: 0.9,
            },
          ]}
        />

        {/* Marcadores de límites */}
        <View style={[styles.marker, { left: `${bands.cdt_min}%`, backgroundColor: cdtColor }]} />
        <View style={[styles.marker, { left: `${bands.cdt_max}%`, backgroundColor: cdtColor }]} />

        {/* Indicador de fuera de rango */}
        {!cdtInRange && (
          <View style={[styles.warningIndicator, { backgroundColor: theme.attention }]}>
            <ThemedText style={styles.warningText}>!</ThemedText>
          </View>
        )}
      </View>

      <View style={styles.spacer} />

      {/* ETF Bar */}
      {showLabels && (
        <View style={styles.labelRow}>
          <ThemedText type="defaultBold">ETF</ThemedText>
          <View style={styles.labelRight}>
            <ThemedText type="small" themeColor="textSecondary">
              {etfPercentage.toFixed(1)}%
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              (objetivo: {bands.etf_min}-{bands.etf_max}%)
            </ThemedText>
          </View>
        </View>
      )}

      <View style={styles.barContainer}>
        {/* Banda objetivo ETF (fondo con borde) */}
        <View
          style={[
            styles.bandBackground,
            {
              backgroundColor: `${etfColor}20`,
              borderWidth: 1,
              borderColor: `${etfColor}40`,
              left: `${bands.etf_min}%`,
              width: `${bands.etf_max - bands.etf_min}%`,
            },
          ]}
        />

        {/* Barra de progreso ETF */}
        <View
          style={[
            styles.progressBar,
            {
              backgroundColor: etfColor,
              width: `${Math.min(etfPercentage, 100)}%`,
              opacity: 0.9,
            },
          ]}
        />

        {/* Marcadores de límites */}
        <View style={[styles.marker, { left: `${bands.etf_min}%`, backgroundColor: etfColor }]} />
        <View style={[styles.marker, { left: `${bands.etf_max}%`, backgroundColor: etfColor }]} />

        {/* Indicador de fuera de rango */}
        {!etfInRange && (
          <View style={[styles.warningIndicator, { backgroundColor: theme.attention }]}>
            <ThemedText style={styles.warningText}>!</ThemedText>
          </View>
        )}
      </View>

      {/* Leyenda */}
      {showLabels && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.assetCdt }]} />
            <ThemedText type="small" themeColor="textSecondary">
              CDT
            </ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.assetEtf }]} />
            <ThemedText type="small" themeColor="textSecondary">
              ETF
            </ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.assetCdt, opacity: 0.2, borderWidth: 1, borderColor: `${theme.assetCdt}60` }]} />
            <ThemedText type="small" themeColor="textSecondary">
              Banda objetivo
            </ThemedText>
          </View>
        </View>
      )}
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  labelRight: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  barContainer: {
    height: 32,
    width: '100%',
    position: 'relative',
    borderRadius: 6,
    overflow: 'hidden',
  },
  bandBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    opacity: 0.4,
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 6,
  },
  marker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    opacity: 0.5,
  },
  warningIndicator: {
    position: 'absolute',
    right: Spacing.two,
    top: '50%',
    transform: [{ translateY: -10 }],
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  spacer: {
    height: Spacing.three,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
})
