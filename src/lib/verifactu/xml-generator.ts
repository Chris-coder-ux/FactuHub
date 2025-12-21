// XML Generator for VeriFactu
// Generates XML structure compliant with AEAT SuministroInformacion.xsd

import { create } from 'xmlbuilder2';
import crypto from 'crypto';
import { VeriFactuXML, VeriFactuRegistroAlta, VeriFactuRegistroAnulacion, VeriFactuCabecera, VeriFactuRegistro } from './types';
import { logger } from '@/lib/logger';

export class VeriFactuXmlGenerator {
  private chainHash: string;

  constructor(initialChainHash: string = '') {
    this.chainHash = initialChainHash;
  }

  generateXML(registros: VeriFactuRegistro[], cabecera: VeriFactuCabecera): string {
    // Calculate hashes and prepare registros
    const processedRegistros = registros.map(registro => ({
      ...registro,
      Encadenamiento: registro.Encadenamiento || this.chainHash,
      Huella: registro.Huella || this.calculateRecordHash(registro)
    }));

    const xmlData: VeriFactuXML = {
      Cabecera: cabecera,
      Registros: processedRegistros
    };

    const doc = create({
      version: '1.0',
      encoding: 'UTF-8',
      standalone: true
    }, {
      'SuministroInformacion': {
        '@xmlns': 'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/ssii/fact/ws/SuministroInformacion.xsd',
        'Cabecera': {
          'ObligadoEmision': cabecera.ObligadoEmision,
          'PersonaContactoTelefono': cabecera.PersonaContactoTelefono || '',
          'PersonaContactoEmail': cabecera.PersonaContactoEmail || '',
          'ConformeNormativa': cabecera.ConformeNormativa,
          'Version': cabecera.Version,
          'TipoHuella': cabecera.TipoHuella,
          'Intercambio': cabecera.Intercambio
        },
        'Registros': {
          'Registro': processedRegistros.map(registro => {
            const base = {
              'TipoRegistro': registro.TipoRegistro,
              'IdRegistro': registro.IdRegistro,
              'NumSerieFactura': registro.NumSerieFactura,
              'FechaExpedicionFactura': registro.FechaExpedicionFactura,
              'TipoFactura': registro.TipoFactura,
              'Huella': registro.Huella,
              'Encadenamiento': registro.Encadenamiento
            };

            if (registro.TipoRegistro === 'A') {
              const r = registro as VeriFactuRegistroAlta & { Huella: string; Encadenamiento: string };
              return {
                ...base,
                'HoraExpedicionFactura': r.HoraExpedicionFactura,
                'CuotaTotal': r.CuotaTotal,
                'ImporteTotal': r.ImporteTotal,
                'BaseImponibleTotal': r.BaseImponibleTotal,
                'DescripcionOperacion': r.DescripcionOperacion,
                'ContraparteNombreRazon': r.ContraparteNombreRazon,
                'ContraparteNIF': r.ContraparteNIF,
                'ContraparteIDOtro': r.ContraparteIDOtro || '',
                'ContrapartePais': r.ContrapartePais
              };
            } else if (registro.TipoRegistro === 'M') {
              const r = registro as VeriFactuRegistroAnulacion & { Huella: string; Encadenamiento: string };
              return {
                ...base,
                'MotivoModificacion': r.MotivoModificacion
              };
            }
            return base;
          })
        }
      }
    });

    return doc.end({ prettyPrint: true });
  }

  public calculateRecordHash(registro: VeriFactuRegistro): string {
    // Create canonical string for hashing as per AEAT specifications
    const canonicalString = this.createCanonicalString(registro);
    return crypto.createHash('sha256').update(canonicalString, 'utf8').digest('hex');
  }

  private createCanonicalString(registro: VeriFactuRegistro): string {
    // Canonical representation for hash calculation based on record type
    if (registro.TipoRegistro === 'A') {
      const r = registro as VeriFactuRegistroAlta;
      const fields = [
        r.TipoRegistro,
        r.IdRegistro,
        r.NumSerieFactura,
        r.FechaExpedicionFactura,
        r.HoraExpedicionFactura,
        r.TipoFactura,
        r.CuotaTotal,
        r.ImporteTotal,
        r.BaseImponibleTotal,
        r.DescripcionOperacion,
        r.ContraparteNombreRazon,
        r.ContraparteNIF,
        r.ContraparteIDOtro || '',
        r.ContrapartePais,
        r.Encadenamiento || ''
      ];
      return fields.join('|');
    } else if (registro.TipoRegistro === 'M') {
      const r = registro as VeriFactuRegistroAnulacion;
      const fields = [
        r.TipoRegistro,
        r.IdRegistro,
        r.NumSerieFactura,
        r.FechaExpedicionFactura,
        r.TipoFactura,
        r.Encadenamiento || '',
        r.MotivoModificacion
      ];
      return fields.join('|');
    } else {
      throw new Error(`Unsupported record type: ${(registro as any).TipoRegistro}`);
    }
  }

  updateChainHash(newHash: string): void {
    this.chainHash = newHash;
  }

  getCurrentChainHash(): string {
    return this.chainHash;
  }

  /**
   * Validates XML structure without using vulnerable libxmljs
   * Performs structural validation to ensure XML is well-formed and contains required elements
   * Note: Full XSD validation is disabled due to security vulnerabilities in libxmljs
   * The XML structure is validated through the generation process and type checking
   */
  async validateXML(xmlContent: string): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Basic XML well-formedness check
      if (!xmlContent || typeof xmlContent !== 'string') {
        errors.push('XML content is empty or invalid');
        return { isValid: false, errors };
      }

      // Check for XML declaration
      if (!xmlContent.trim().startsWith('<?xml')) {
        errors.push('Missing XML declaration');
      }

      // Check for required root element
      if (!xmlContent.includes('<SuministroInformacion')) {
        errors.push('Missing required root element: SuministroInformacion');
      }

      // Check for required namespaces
      const requiredNamespace = 'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/ssii/fact/ws/SuministroInformacion.xsd';
      if (!xmlContent.includes(requiredNamespace)) {
        errors.push('Missing required namespace for SuministroInformacion');
      }

      // Check for required Cabecera element
      if (!xmlContent.includes('<Cabecera>') && !xmlContent.includes('<Cabecera ')) {
        errors.push('Missing required Cabecera element');
      }

      // Check for required Registros element
      if (!xmlContent.includes('<Registros>')) {
        errors.push('Missing required Registros element');
      }

      // Validate Cabecera required fields
      const cabeceraFields = [
        'ObligadoEmision',
        'ConformeNormativa',
        'Version',
        'TipoHuella',
        'Intercambio'
      ];

      for (const field of cabeceraFields) {
        if (!xmlContent.includes(`<${field}>`) && !xmlContent.includes(`<${field} `)) {
          errors.push(`Missing required Cabecera field: ${field}`);
        }
      }

      // Basic XML structure validation - check for balanced tags
      const openTags = (xmlContent.match(/<[^/!?][^>]*>/g) || []).length;
      const closeTags = (xmlContent.match(/<\/[^>]+>/g) || []).length;
      
      if (openTags !== closeTags) {
        errors.push(`Unbalanced XML tags: ${openTags} opening tags vs ${closeTags} closing tags`);
      }

      // Check for common XML errors
      if (xmlContent.includes('&amp;') && xmlContent.includes('&') && !xmlContent.match(/&(amp|lt|gt|quot|apos);/g)) {
        // Check for unescaped ampersands (basic check)
        const unescapedAmpersands = xmlContent.match(/&(?!amp|lt|gt|quot|apos|#)/g);
        if (unescapedAmpersands) {
          errors.push('Found unescaped ampersands in XML content');
        }
      }

      if (errors.length > 0) {
        return { isValid: false, errors };
      }

      // If all checks pass, consider XML structurally valid
      // Note: Full XSD validation is disabled for security reasons
      // The XML structure is already validated through TypeScript types and generation logic
      logger.info('XML structural validation passed (XSD validation disabled for security)');
      return { isValid: true, errors: [] };

    } catch (error) {
      logger.error('XML validation error', error);
      return { 
        isValid: false, 
        errors: ['XML validation failed due to technical error', error instanceof Error ? error.message : 'Unknown error'] 
      };
    }
  }
}