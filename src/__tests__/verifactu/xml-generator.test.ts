/* @jest-environment node */

import { VeriFactuXmlGenerator } from '@/lib/verifactu/xml-generator';
import { VeriFactuRegistroAlta, VeriFactuCabecera } from '@/lib/verifactu/types';

describe('VeriFactuXmlGenerator', () => {
  let generator: VeriFactuXmlGenerator;
  let cabecera: VeriFactuCabecera;
  let registro: VeriFactuRegistroAlta;

  beforeEach(() => {
    generator = new VeriFactuXmlGenerator('previous_hash_123');
    cabecera = {
      ObligadoEmision: 'B12345678',
      ConformeNormativa: 'S',
      Version: '1.0',
      TipoHuella: 'SHA256',
      Intercambio: 'E',
    };
    registro = {
      TipoRegistro: 'A',
      IdRegistro: 'VERI-INV-001',
      NumSerieFactura: 'INV-0001',
      FechaExpedicionFactura: '2024-01-15',
      HoraExpedicionFactura: '14:30:00',
      TipoFactura: 'F1',
      CuotaTotal: '21.00',
      ImporteTotal: '121.00',
      BaseImponibleTotal: '100.00',
      DescripcionOperacion: 'Factura de servicios',
      ContraparteNombreRazon: 'Cliente S.L.',
      ContraparteNIF: 'A12345678',
      ContrapartePais: 'ES',
    };
  });

  describe('XML Generation', () => {
    test('should generate valid XML structure', () => {
      const xml = generator.generateXML([registro], cabecera);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"');
      expect(xml).toContain('<SuministroInformacion');
      expect(xml).toContain('<Cabecera>');
      expect(xml).toContain('<Registros>');
      expect(xml).toContain('<Registro>');
      expect(xml).toContain('B12345678');
      expect(xml).toContain('VERI-INV-001');
    });

    test('should include all required fields in XML', () => {
      const xml = generator.generateXML([registro], cabecera);

      expect(xml).toContain('<ObligadoEmision>B12345678</ObligadoEmision>');
      expect(xml).toContain('<ConformeNormativa>S</ConformeNormativa>');
      expect(xml).toContain('<TipoRegistro>A</TipoRegistro>');
      expect(xml).toContain('<NumSerieFactura>INV-0001</NumSerieFactura>');
      expect(xml).toContain('<TipoFactura>F1</TipoFactura>');
      expect(xml).toContain('<ImporteTotal>121.00</ImporteTotal>');
      expect(xml).toContain('<ContraparteNIF>A12345678</ContraparteNIF>');
    });

    test('should handle multiple registros', () => {
      const registro2 = { ...registro, IdRegistro: 'VERI-INV-002', NumSerieFactura: 'INV-0002' };
      const xml = generator.generateXML([registro, registro2], cabecera);

      expect(xml).toContain('VERI-INV-001');
      expect(xml).toContain('VERI-INV-002');
      expect(xml.split('<Registro>').length).toBe(3); // 1 opening + 2 registros
    });
  });

  describe('Hash Calculation', () => {
    test('should calculate SHA256 hash', () => {
      const hash = generator.calculateRecordHash(registro);

      expect(hash).toMatch(/^[a-f0-9]{64}$/); // SHA256 is 64 hex chars
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64);
    });

    test('should generate different hashes for different data', () => {
      const registro2 = { ...registro, NumSerieFactura: 'INV-0002' };
      const hash1 = generator.calculateRecordHash(registro);
      const hash2 = generator.calculateRecordHash(registro2);

      expect(hash1).not.toBe(hash2);
    });

    test('should generate consistent hashes for same data', () => {
      const hash1 = generator.calculateRecordHash(registro);
      const hash2 = generator.calculateRecordHash(registro);

      expect(hash1).toBe(hash2);
    });
  });

  describe('Chain Hash Management', () => {
    test('should use provided initial chain hash', () => {
      const xml = generator.generateXML([registro], cabecera);

      expect(xml).toContain('<Encadenamiento>previous_hash_123</Encadenamiento>');
    });

    test('should update chain hash', () => {
      generator.updateChainHash('new_chain_hash');
      const xml = generator.generateXML([registro], cabecera);

      expect(xml).toContain('<Encadenamiento>new_chain_hash</Encadenamiento>');
    });

    test('should get current chain hash', () => {
      expect(generator.getCurrentChainHash()).toBe('previous_hash_123');

      generator.updateChainHash('updated_hash');
      expect(generator.getCurrentChainHash()).toBe('updated_hash');
    });

    afterEach(() => {
      jest.clearAllMocks();
      jest.clearAllTimers();
    });
  });
});