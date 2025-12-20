/**
 * VeriFactu Status Enum
 * Represents all possible states of a VeriFactu invoice
 */
export enum VeriFactuStatus {
  PENDING = 'pending', // XML generated, waiting to be signed
  SIGNED = 'signed', // XML signed but not sent to AEAT
  SENT = 'sent', // Sent to AEAT, waiting for verification
  VERIFIED = 'verified', // Verified and accepted by AEAT
  REJECTED = 'rejected', // Rejected by AEAT
  ERROR = 'error', // Error during processing
}

/**
 * VeriFactu Configuration
 */
export interface VeriFactuConfig {
  enabled: boolean;
  environment: 'production' | 'sandbox';
  certificate: {
    path: string;
    password: string;
  };
  aeatUsername: string;
  aeatPassword: string;
  autoSend: boolean;
  chainHash: string;
}

/**
 * VeriFactu XML Types
 */
export type TipoRegistro = 'A' | 'B' | 'M'; // A = Alta, B = Baja, M = Modificación

export interface VeriFactuRegistro {
  TipoRegistro: TipoRegistro;
  IdRegistro: string;
  NumSerieFactura: string;
  FechaExpedicionFactura: string;
  HoraExpedicionFactura?: string;
  TipoFactura: string;
  CuotaTotal?: string;
  ImporteTotal?: string;
  BaseImponibleTotal?: string;
  DescripcionOperacion?: string;
  ContraparteNombreRazon?: string;
  ContraparteNIF?: string;
  ContraparteIDOtro?: string;
  ContrapartePais?: string;
  RefExterna?: string;
  MotivoModificacion?: string;
  Huella?: string;
  Encadenamiento?: string;
}

export interface VeriFactuRegistroAlta extends Omit<VeriFactuRegistro, 'TipoRegistro' | 'HoraExpedicionFactura' | 'CuotaTotal' | 'ImporteTotal' | 'BaseImponibleTotal' | 'DescripcionOperacion' | 'ContraparteNombreRazon' | 'ContraparteNIF' | 'ContrapartePais'> {
  TipoRegistro: 'A';
  HoraExpedicionFactura: string;
  CuotaTotal: string;
  ImporteTotal: string;
  BaseImponibleTotal: string;
  DescripcionOperacion: string;
  ContraparteNombreRazon: string;
  ContraparteNIF: string;
  ContrapartePais: string;
}

export interface VeriFactuRegistroAnulacion extends Omit<VeriFactuRegistro, 'TipoRegistro' | 'MotivoModificacion'> {
  TipoRegistro: 'B' | 'M'; // B = Baja, M = Modificación
  MotivoModificacion: string; // Required for cancellations/modifications
  RefExterna?: string; // Reference to original invoice
}

export interface VeriFactuCabecera {
  ObligadoEmision: string;
  PersonaContactoTelefono?: string;
  PersonaContactoEmail?: string;
  ConformeNormativa: 'S' | 'N';
  Version: string;
  TipoHuella: 'SHA256' | string; // Allow string for flexibility
  Intercambio: 'E' | string; // Allow string for flexibility
}

export interface VeriFactuXML {
  Cabecera: VeriFactuCabecera;
  Registros: VeriFactuRegistro[];
}

/**
 * Type guard to check if a string is a valid VeriFactuStatus
 */
export function isVeriFactuStatus(status: string): status is VeriFactuStatus {
  return Object.values(VeriFactuStatus).includes(status as VeriFactuStatus);
}

/**
 * Get human-readable label for VeriFactuStatus
 */
export function getVeriFactuStatusLabel(status: VeriFactuStatus): string {
  const labels: Record<VeriFactuStatus, string> = {
    [VeriFactuStatus.PENDING]: 'Pendiente',
    [VeriFactuStatus.SIGNED]: 'Firmado',
    [VeriFactuStatus.SENT]: 'Enviado',
    [VeriFactuStatus.VERIFIED]: 'Verificado',
    [VeriFactuStatus.REJECTED]: 'Rechazado',
    [VeriFactuStatus.ERROR]: 'Error',
  };
  return labels[status] || status;
}
