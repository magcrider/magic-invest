import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  icon: IoniconsName;
}

export const TOOLS: ToolDefinition[] = [
  {
    id: 'compound-interest',
    name: 'Interés compuesto',
    description: 'Proyecta cuánto valdrá tu dinero si lo dejas crecer con aportes regulares.',
    icon: 'trending-up-outline',
  },
  {
    id: 'time-to-goal',
    name: 'Tiempo a meta',
    description: 'Descubre en cuánto tiempo puedes alcanzar tu número con lo que inviertes hoy.',
    icon: 'flag-outline',
  },
  {
    id: 'debt-freedom',
    name: 'Salir de deudas',
    description: 'Crea una estrategia para eliminar deudas y sabe exactamente cuándo estarás libre.',
    icon: 'remove-circle-outline',
  },
  {
    id: 'loan-payment',
    name: 'Cuota de crédito',
    description: 'Descubre cuánto pagarás cada mes y cómo se distribuye entre capital e intereses.',
    icon: 'card-outline',
  },
  {
    id: 'rate-converter',
    name: 'Convertir tasas',
    description: 'Convierte tasas mensuales, trimestrales o anuales para comparar en igualdad de condiciones.',
    icon: 'swap-horizontal-outline',
  },
  {
    id: 'cdt-vs-etf',
    name: 'CDT vs ETF',
    description: 'Compara el rendimiento real de un CDT frente a un ETF con el mismo capital y tiempo.',
    icon: 'scale-outline',
  },
  {
    id: 'dca-vs-lump',
    name: 'Mensual o todo junto',
    description: '¿Tienes una suma grande? Descubre si conviene invertirla de golpe o en partes cada mes.',
    icon: 'calendar-outline',
  },
  {
    id: 'real-return',
    name: 'Retorno real',
    description: 'Calcula si tu inversión realmente está creciendo después de inflación, devaluación e impuestos.',
    icon: 'pulse-outline',
  },
  {
    id: 'cagr',
    name: 'CAGR',
    description: '¿Cuál fue el rendimiento anual real de tu inversión? Sin importar los altibajos del camino.',
    icon: 'speedometer-outline',
  },
  {
    id: 'fee-drag',
    name: 'Costo de comisiones',
    description: 'Visualiza cuánto capital pierdes en comisiones y costos al acumularse en décadas.',
    icon: 'hourglass-outline',
  },
];
