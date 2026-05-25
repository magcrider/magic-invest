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
    name: 'Interés compuesto / Valor futuro',
    description: 'Proyecta cuánto valdrá tu dinero si lo dejas crecer con aportes regulares.',
    icon: 'trending-up-outline',
  },
  {
    id: 'time-to-goal',
    name: 'Tiempo para alcanzar tu meta',
    description: 'Descubre en cuánto tiempo puedes alcanzar tu número con lo que inviertes hoy.',
    icon: 'flag-outline',
  },
  {
    id: 'debt-freedom',
    name: 'Calculadora para salir de deudas',
    description: 'Crea una estrategia para eliminar deudas y sabe exactamente cuándo estarás libre.',
    icon: 'remove-circle-outline',
  },
  {
    id: 'rate-converter',
    name: 'Conversor de tasas',
    description: 'Convierte tasas mensuales, trimestrales o anuales para comparar en igualdad de condiciones.',
    icon: 'swap-horizontal-outline',
  },
  {
    id: 'cdt-vs-etf',
    name: 'Simulador CDT vs ETF',
    description: 'Compara el rendimiento real de un CDT frente a un ETF con el mismo capital y tiempo.',
    icon: 'scale-outline',
  },
  {
    id: 'dca-vs-lump',
    name: '¿Invierto mes a mes o todo de una vez?',
    description: '¿Tienes una suma grande? Descubre si conviene invertirla de golpe o en partes cada mes.',
    icon: 'calendar-outline',
  },
  {
    id: 'real-return',
    name: '¿Tu plata crece o solo aguanta?',
    description: 'Calcula si tu inversión realmente está creciendo después de inflación, devaluación e impuestos.',
    icon: 'pulse-outline',
  },
  {
    id: 'cagr',
    name: 'Rendimiento anual promedio',
    description: '¿Cuál fue el rendimiento anual real de tu inversión? Sin importar los altibajos del camino.',
    icon: 'speedometer-outline',
  },
  {
    id: 'fee-drag',
    name: '¿Cuánto te cuestan las comisiones en 20 años?',
    description: 'Visualiza cuánto capital pierdes en comisiones y costos al acumularse en décadas.',
    icon: 'hourglass-outline',
  },
];
