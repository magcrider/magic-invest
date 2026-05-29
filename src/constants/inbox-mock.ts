import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export type EventType = 'educational' | 'drawdown_context' | 'cdt_maturity' | 'market_trigger' | 'rebalance';

export interface ConsequenceRow {
  label: string;
  description: string;
}

export interface InboxEvent {
  id: string;
  type: EventType;
  title: string;
  summary: string;
  date: string;
  isRead: boolean;
  body: string[];
  relatedAsset?: string;
  consequences?: ConsequenceRow[];
  disclaimer: string;
}

export interface EventTypeConfig {
  icon: IoniconsName;
  color: string;
  bg: string;
  label: string;
}

export const EVENT_TYPE_CONFIG: Record<EventType, EventTypeConfig> = {
  educational:    { icon: 'book-outline',          color: '#9CA3AF', bg: '#9CA3AF18', label: 'Educativo'         },
  drawdown_context: { icon: 'trending-down-outline',  color: '#C08552', bg: '#C0855218', label: 'Caída estructural' },
  cdt_maturity:   { icon: 'time-outline',           color: '#5B8E8E', bg: '#5B8E8E18', label: 'CDT próximo'       },
  market_trigger: { icon: 'analytics-outline',      color: '#C08552', bg: '#C0855218', label: 'Disparador'        },
  rebalance:      { icon: 'layers-outline',         color: '#5B8E8E', bg: '#5B8E8E18', label: 'Rebalanceo'        },
};

export const INBOX_EVENTS: InboxEvent[] = [
  {
    id: 'evt-001',
    type: 'drawdown_context',
    title: 'VOO ha caído 27% desde su máximo histórico',
    summary: 'El S&P 500 entró en caída estructural. El sistema registró 15 episodios similares en los últimos 35 años de historia del índice.',
    date: '26 may 2026',
    isRead: false,
    relatedAsset: 'VOO',
    body: [
      'VOO (Vanguard S&P 500 ETF) cerró hoy con una caída del 27.3% desde su pico más reciente, registrado el 19 de febrero de 2026. El sistema lo clasifica como caída estructural cuando supera el 25% desde el último máximo histórico.',
      'En los 35 años de historia del índice S&P 500, se han registrado 15 caídas superiores al 25%. El tiempo promedio de recuperación desde ese nivel ha sido de 14 meses, con un rango que va desde 4 meses (2020) hasta 51 meses (dot-com, 2000–2004). En 13 de esos 15 episodios, el índice superó su pico anterior dentro de los 36 meses.',
      'Una caída de esta magnitud no es una señal determinística de que el mercado continuará bajando ni de que rebotará pronto. Es un punto de referencia histórico que el sistema registra para que puedas contextualizarlo frente a tu horizonte de inversión declarado.',
    ],
    consequences: [
      {
        label: 'Si mantienes la posición',
        description: 'Basado en los 15 episodios históricos comparables, el portafolio recupera su valor nominal en un plazo mediano de 14 meses. Si tu horizonte es mayor a 5 años, la probabilidad histórica de recuperación completa es del 100% (15/15 episodios).',
      },
      {
        label: 'Si liquidas hoy',
        description: 'Realizas la pérdida nominal del 27.3% en USD. El capital liberado en COP equivale aproximadamente a $38.200.000 al TRM actual ($4.280). Reinvertido en un CDT al 11.5% EA, recuperaría el valor original en aproximadamente 3.1 años sin exposición adicional a mercado.',
      },
    ],
    disclaimer: 'Este análisis se basa en datos históricos del índice. El comportamiento pasado no garantiza resultados futuros. No constituye asesoría financiera ni una recomendación de compra, venta o rebalanceo. Las decisiones de inversión son responsabilidad exclusiva del usuario.',
  },
  {
    id: 'evt-002',
    type: 'cdt_maturity',
    title: 'Tu CDT de Bancolombia vence en 15 días',
    summary: '$15.000.000 estarán disponibles el 10 de junio. Este es el momento para revisar tu distribución actual frente a las bandas configuradas.',
    date: '25 may 2026',
    isRead: false,
    relatedAsset: 'CDT Bancolombia',
    body: [
      'Tu CDT de Bancolombia al 12.8% EA con capital de $15.000.000 vence el 10 de junio de 2026. Al vencimiento recibirás $15.213.699 (capital $15.000.000 + rendimientos brutos $213.699 − retefuente $8.548). El 10 de junio ese capital quedará disponible.',
      'El Hurdle Rate vigente es 11.2% EA, calculado como el promedio de captación CDT a 12 meses reportado por el Banco de la República, ajustado por el diferencial de inflación COP/USD del último trimestre. La tasa de mercado para CDT a 12 meses en Bancolombia es actualmente 11.9% EA.',
      'Tu distribución actual es CDTs 68% / ETFs 32%. Las bandas configuradas son CDTs 50–70% / ETFs 30–50%. Estás dentro de los límites pero en el extremo conservador. La maduración de este CDT es un punto natural para revisar si quieres mantener esa posición o ajustar la distribución.',
    ],
    consequences: [
      {
        label: 'Renovar en CDT (mismo plazo)',
        description: 'Mantienes la distribución actual cerca del 68/32. La nueva tasa (11.9% EA) es menor a tu CDT anterior (12.8% EA), lo que refleja el ciclo de baja de tasas del Banco de la República. El capital continúa trabajando dentro de las bandas.',
      },
      {
        label: 'No renovar en CDT',
        description: 'Los ETFs subirían de 32% a aproximadamente 36% del portafolio total. Seguirías dentro de las bandas (límite ETFs: 50%). El capital disponible podría destinarse a aumentar exposición a ETFs si el Hurdle Rate lo justifica para los activos en tu watchlist.',
      },
    ],
    disclaimer: 'Las tasas CDT son referenciales y pueden variar al momento del vencimiento según las condiciones de mercado. No constituye asesoría financiera.',
  },
  {
    id: 'evt-003',
    type: 'market_trigger',
    title: 'El Banco de la República bajó su tasa 50 puntos básicos',
    summary: 'La tasa de política monetaria pasó de 10.75% a 10.25%. Esto modifica el Hurdle Rate implícito del portafolio y cambia el mapa de ETFs elegibles.',
    date: '23 may 2026',
    isRead: true,
    body: [
      'En su junta del 23 de mayo, el Banco de la República decidió reducir la tasa de política monetaria 50 puntos básicos, de 10.75% a 10.25%. Esta es la tercera reducción consecutiva desde el ciclo de ajuste iniciado en diciembre de 2025, acumulando 150 pbs de recorte en el período.',
      'El Hurdle Rate del portafolio se actualizó automáticamente. El nuevo valor es 10.8% EA (vs 11.2% EA anterior), calculado sobre el promedio móvil de tasas CDT a 12 meses, ajustado por el diferencial inflacionario COP/USD del último trimestre reportado por el DANE.',
      'Con el Hurdle Rate más bajo, un mayor número de ETFs en la watchlist podría ahora justificar capital. VTI (Vanguard Total Stock Market ETF) tenía un CAGR a 5 años de 10.9% en USD — antes insuficiente para superar el Hurdle anterior (11.2%), ahora marginalmente por encima del nuevo umbral (10.8%).',
    ],
    consequences: [
      {
        label: 'Impacto en CDTs existentes',
        description: 'Tus CDTs activos no se ven afectados — sus tasas están pactadas al momento de la apertura. Sin embargo, las renovaciones futuras probablemente serán a tasas menores, siguiendo el ciclo de baja. El CDT que vence en 15 días se renovaría a condiciones menos favorables que las originales.',
      },
      {
        label: 'Impacto en evaluación de ETFs',
        description: 'VTI pasa de "no supera Hurdle Rate" a "supera marginalmente". El sistema recalculará el Sortino de todos los ETFs en watchlist en la próxima sincronización de datos EOD. Un Hurdle Rate más bajo amplía el universo de activos elegibles estadísticamente.',
      },
    ],
    disclaimer: 'Los cálculos de Hurdle Rate son estimaciones basadas en datos públicos disponibles. Pueden diferir de evaluaciones hechas con metodologías alternativas. No constituye asesoría financiera.',
  },
  {
    id: 'evt-004',
    type: 'rebalance',
    title: 'Tu distribución de activos salió de las bandas configuradas',
    summary: 'Los ETFs representan el 54% del portafolio — 4 puntos por encima del límite configurado del 50%. Los CDTs están en 46%.',
    date: '20 may 2026',
    isRead: true,
    body: [
      'La valorización de los ETFs en cartera durante las últimas semanas desplazó la distribución fuera de las bandas configuradas. Distribución actual: ETFs 54% / CDTs 46%. Bandas configuradas: CDTs 50–70% / ETFs 30–50%.',
      'El límite superior de ETFs (50%) fue superado por apreciación del mercado, no por nuevas compras. El exceso es de 4 puntos porcentuales sobre el límite. En términos absolutos, esto equivale a aproximadamente $6.200.000 en ETFs por encima de la banda máxima, calculado sobre el valor total del portafolio al cierre de hoy.',
      'Esto no es una emergencia operativa — el portafolio sigue siendo estructuralmente sólido. Es una señal de rebalanceo de oportunidad: el mercado ha movido la distribución y este es el momento para evaluar si quieres corregirla.',
    ],
    consequences: [
      {
        label: 'Rebalancear con venta parcial de ETFs',
        description: 'Venderías aproximadamente $6.200.000 en ETFs y reinvertirías en CDT. El portafolio volvería a CDTs 50% / ETFs 50% (límite exacto superior de ETFs). Realizarías parcialmente las ganancias actuales de los ETFs y reducirías la exposición a mercado.',
      },
      {
        label: 'Rebalancear cuando venza el CDT',
        description: 'En 15 días vence tu CDT de Bancolombia ($15.2M). Podrías renovarlo o no renovarlo parcialmente para corregir la distribución sin vender ETFs. Esta opción no realiza ganancias de ETF pero ajusta la distribución de forma natural y sin costos de transacción adicionales.',
      },
    ],
    disclaimer: 'El rebalanceo puede implicar costos de transacción y consecuencias fiscales según tu situación tributaria. Este análisis es informativo y no constituye una instrucción de rebalanceo ni asesoría financiera.',
  },
  {
    id: 'evt-006',
    type: 'cdt_maturity',
    title: 'Tu CDT de Davivienda vence en 30 días',
    summary: '$8.000.000 estarán disponibles el 28 de junio. Momento para revisar si renovar o redirigir capital.',
    date: '29 may 2026',
    isRead: false,
    relatedAsset: 'CDT Davivienda',
    body: [
      'Tu CDT de Davivienda con capital de $8.000.000 vence el 28 de junio de 2026. Quedan 30 días para que el capital quede disponible.',
      'La tasa de captación a 12 meses en Davivienda es actualmente 11.4% EA, por debajo de la tasa pactada originalmente. Esto refleja el ciclo de baja de tasas del Banco de la República iniciado en diciembre de 2025.',
    ],
    disclaimer: 'Las tasas CDT son referenciales y pueden variar al momento del vencimiento. No constituye asesoría financiera.',
  },
  {
    id: 'evt-007',
    type: 'educational',
    title: 'VTI: el mercado total de EE.UU. en un instrumento',
    summary: 'VTI replica más de 3.900 empresas americanas. Entiende cómo se compara con VOO y cuándo cada uno tiene sentido.',
    date: '28 may 2026',
    isRead: false,
    relatedAsset: 'VTI',
    body: [
      'VTI (Vanguard Total Stock Market ETF) replica el índice CRSP US Total Market, que incluye más de 3.900 empresas de todos los tamaños: grandes (large-cap), medianas (mid-cap) y pequeñas (small-cap). VOO, en cambio, replica solo las 500 empresas más grandes del S&P 500.',
      'Históricamente, VTI y VOO tienen una correlación cercana al 99% y retornos casi idénticos a largo plazo. La diferencia principal: VTI incluye small-caps, que en algunos ciclos económicos superan a las large-caps — aunque también añaden volatilidad.',
      'TER de VTI: 0.03% anual. Igual que VOO. Para un portafolio indexado colombiano, ambos son equivalentes en costo. La elección entre uno y otro es más una decisión de convicción sobre el universo de empresas que sobre eficiencia de costos.',
    ],
    disclaimer: 'Este análisis compara instrumentos históricos. El comportamiento pasado no garantiza resultados futuros. No constituye asesoría financiera.',
  },
  {
    id: 'evt-005',
    type: 'educational',
    title: 'El peso se devaluó 8% — ¿perdiste plata realmente?',
    summary: 'Tu portafolio en pesos bajó esta semana sin que los ETFs hayan caído en USD. Aquí está la explicación matemática de lo que pasó.',
    date: '15 may 2026',
    isRead: true,
    body: [
      'La semana pasada el peso colombiano se apreció frente al dólar, con la TRM pasando de $4.280 a $3.960 (−7.5%). Si miraste el valor de tu portafolio en pesos durante ese período, viste una caída — aunque los ETFs no se movieron en USD.',
      'Ejemplo concreto: si tienes posición en VOO a USD 520, con TRM de $4.280 ese ETF valía $22.256.000 COP. Con TRM de $3.960, el mismo ETF (sin moverse un centavo en USD) vale $20.592.000 COP — una "bajada" de $1.664.000 que no existe en la moneda del activo.',
      'La confusión es normal y tiene solución conceptual: el activo (VOO) está denominado en USD. Su valor real es en USD. La conversión a COP cambia cada día con el tipo de cambio. Una variación en COP sin variación proporcional en USD es el efecto del tipo de cambio sobre la conversión contable — no una pérdida del activo.',
      'El sistema siempre muestra el valor del ETF en su moneda original (USD) y la conversión en COP como referencia. Cuando veas una discrepancia entre ambos, el tipo de cambio es la explicación más probable.',
    ],
    disclaimer: 'La variación del tipo de cambio puede tener implicaciones fiscales en Colombia. El diferencial cambiario tiene un tratamiento tributario que puede diferir del de la ganancia de capital tradicional. Consulta un asesor tributario para tu situación específica.',
  },
];
