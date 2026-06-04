import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export type EventType = 'educational' | 'drawdown_context' | 'cdt_maturity' | 'market_trigger' | 'rebalance';

export interface EventTypeConfig {
  icon: IoniconsName;
  color: string;
  bg: string;
  label: string;
}

export const EVENT_TYPE_CONFIG: Record<EventType, EventTypeConfig> = {
  educational:      { icon: 'book-outline',           color: '#9CA3AF', bg: '#9CA3AF18', label: 'Educativo'         },
  drawdown_context: { icon: 'trending-down-outline', color: '#C08552', bg: '#C0855218', label: 'Caída estructural' },
  cdt_maturity:     { icon: 'time-outline',           color: '#5B8E8E', bg: '#5B8E8E18', label: 'CDT próximo'       },
  market_trigger:   { icon: 'analytics-outline',      color: '#C08552', bg: '#C0855218', label: 'Disparador'        },
  rebalance:        { icon: 'layers-outline',         color: '#5B8E8E', bg: '#5B8E8E18', label: 'Rebalanceo'        },
};
