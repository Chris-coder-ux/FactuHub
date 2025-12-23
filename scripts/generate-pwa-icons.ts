#!/usr/bin/env tsx
/**
 * Script para generar iconos PWA desde una imagen fuente
 * 
 * Uso:
 *   npm run pwa:icons <ruta-a-imagen.png>
 * 
 * Requiere: sharp (npm install -D sharp)
 */

import { existsSync } from 'fs';
import { join } from 'path';

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons(sourceImage: string) {
  try {
    // Dynamic import de sharp (puede no estar instalado)
    const sharp = await import('sharp').catch(() => null);
    
    if (!sharp) {
      console.error('❌ Error: sharp no está instalado.');
      console.log('📦 Instala sharp con: npm install -D sharp');
      console.log('\n💡 Alternativa: Usa una herramienta online como:');
      console.log('   https://realfavicongenerator.net/');
      console.log('   https://www.pwabuilder.com/imageGenerator');
      process.exit(1);
    }

    if (!existsSync(sourceImage)) {
      console.error(`❌ Error: No se encontró la imagen: ${sourceImage}`);
      process.exit(1);
    }

    const outputDir = join(process.cwd(), 'public', 'icons');
    const { mkdir } = await import('fs/promises');
    await mkdir(outputDir, { recursive: true });

    console.log('🎨 Generando iconos PWA...\n');

    for (const size of sizes) {
      const outputPath = join(outputDir, `icon-${size}x${size}.png`);
      
      await sharp.default(sourceImage)
        .resize(size, size, {
          fit: 'cover',
          position: 'center',
        })
        .png()
        .toFile(outputPath);

      console.log(`✅ Generado: icon-${size}x${size}.png`);
    }

    console.log('\n✨ ¡Iconos generados exitosamente!');
    console.log(`📁 Ubicación: ${outputDir}`);
    console.log('\n📝 Asegúrate de que el manifest.json apunte a estos iconos.');
  } catch (error) {
    console.error('❌ Error generando iconos:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const sourceImage = process.argv[2];
  
  if (!sourceImage) {
    console.error('❌ Error: Debes proporcionar la ruta a la imagen fuente.');
    console.log('\n📖 Uso:');
    console.log('   npm run pwa:icons <ruta-a-imagen.png>');
    console.log('\n💡 Ejemplo:');
    console.log('   npm run pwa:icons ./assets/logo.png');
    process.exit(1);
  }

  generateIcons(sourceImage);
}

export { generateIcons };

