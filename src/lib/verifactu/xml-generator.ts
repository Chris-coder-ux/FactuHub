// XML Generator for VeriFactu
// Generates XML structure compliant with AEAT SuministroInformacion.xsd

import { create } from 'xmlbuilder2';
import crypto from 'crypto';
import { VeriFactuXML, VeriFactuRegistroAlta, VeriFactuRegistroAnulacion, VeriFactuCabecera, VeriFactuRegistro } from './types';
import * as fs from 'fs';
import * as path from 'path';

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

  async validateXML(xmlContent: string): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      // Dynamic import to avoid issues in Next.js
      const libxmljs = await import('libxmljs');

      // In Next.js, __dirname might be undefined, so we use a relative path approach
      const schemaPath = path.join(process.cwd(), 'src/lib/verifactu/schema.xsd');
      const xsdContent = fs.readFileSync(schemaPath, 'utf8');

      const xsdDoc = libxmljs.parseXml(xsdContent);
      const xmlDoc = libxmljs.parseXml(xmlContent);

      const result = xmlDoc.validate(xsdDoc);

      if (result) {
        return { isValid: true, errors: [] };
      } else {
        const errors = xmlDoc.validationErrors.map((error: any) => error.message);
        return { isValid: false, errors };
      }
    } catch (error) {
      console.error('XML validation error:', error);
      return { isValid: false, errors: ['XML validation failed due to technical error'] };
    }
  }
}