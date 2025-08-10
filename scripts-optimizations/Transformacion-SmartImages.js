// ============================================================================
// 🚀 SCRIPT DE TRANSFORMACIÓN DE IMÁGENES INTELIGENTE v2.0 - ASTRO FUSION
// ============================================================================
// CARACTERÍSTICAS:
// 1. Optimización ultra-avanzada con Sharp
// 2. Generación automática de formatos AVIF y WebP
// 3. Sistema de cache inteligente
// 4. Generación de iconos PWA optimizados
// 5. Detección automática de tipos de imagen
// 6. Placeholders y BlurHash para lazy loading
// 7. Configuración adaptada para Astro + Tailwind CSS
// ============================================================================

import sharp from 'sharp';
import path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { glob } from 'glob';
import { encode } from 'blurhash';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

/**
 * @typedef {Object} ImageDimensions
 * @property {number} width - Ancho de la imagen
 * @property {number} height - Alto de la imagen
 */

/**
 * @typedef {Object} ProcessResult
 * @property {number} successCount - Número de imágenes procesadas exitosamente
 * @property {number} errorCount - Número de errores encontrados
 */

/**
 * @typedef {Object} PwaIconDef
 * @property {string} [src] - Ruta del icono
 * @property {string} sizes - Tamaños del icono
 * @property {string} type - Tipo MIME
 * @property {string} [purpose] - Propósito del icono
 */

/**
 * @typedef {Object} ProcessedImage
 * @property {string} url - URL de la imagen optimizada
 * @property {number} width - Ancho de la imagen
 * @property {number} height - Alto de la imagen
 * @property {string} alt - Texto alternativo
 * @property {string} type - Tipo MIME
 * @property {Record<string, string>} sources - Fuentes en diferentes formatos
 * @property {string|null} placeholder - Placeholder base64
 * @property {string|null} blurhash - Hash de blur
 * @property {Record<string, unknown>} [metadata] - Metadatos adicionales
 * @property {PwaIconDef[]} [pwaIcons] - Iconos PWA
 */

// ============================================================================
// CONFIGURACIÓN ADAPTADA PARA ASTRO
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const CONFIG = {
  inputDir: path.join(PROJECT_ROOT, 'src/assets/images'),
  outputDir: path.join(PROJECT_ROOT, 'public/assets/img-op'),
  formats: {
    avif: { quality: 30, effort: 9 }, // ULTRA OPTIMIZADA
    webp: { quality: 50 }, // Más comprimida
  },
  defaultSize: { width: 800, height: 600 },
  seoConfigFile: path.join(PROJECT_ROOT, 'src/data/seoConfig/2-seoIMAGEConfig.ts'),
  defaultMetadata: {
    copyright: `© ${new Date().getFullYear()} BarretoAds Dev`,
    author: 'BarretoAds Dev',
  },
  // Configuración avanzada para diferentes tipos de imagen
  imageTypes: {
    hero: { formats: ['avif', 'webp'], quality: { avif: 30, webp: 50 } },
    thumbnail: { formats: ['webp', 'avif'], quality: { webp: 50, avif: 30 } },
    icon: { formats: ['webp', 'avif'], quality: { webp: 50, avif: 30 } },
    background: { formats: ['avif', 'webp'], quality: { avif: 30, webp: 50 } },
  },
  // Configuración de PWA ULTRA-OPTIMIZADA (menos tamaños)
  pwa: {
    iconSizes: [128, 192, 512], // Reducido de 8 a 3 tamaños
    maskableSizes: [192, 512], // Mantener solo 2
    appleTouchSizes: [120, 180], // Reducido de 9 a 2 tamaños
    faviconSizes: [32, 48], // Reducido de 3 a 2 tamaños
  },
};

// ============================================================================
// ORQUESTADOR PRINCIPAL
// ============================================================================

/**
 * Función principal de optimización de imágenes
 * @returns {Promise<void>}
 */
async function optimizeImages() {
  const startTime = Date.now();
  console.log('🚀 Iniciando la optimización de imágenes en modo de doble flujo...');
  console.time('⏱️ Tiempo total de ejecución');
  const finalResult = { successCount: 0, errorCount: 0 };

  try {
    // 0. Cargar cache existente
    const cache = await loadCache();
    console.log(`📦 Cache cargado: ${Object.keys(cache).length} entradas`);

    // 1. Limpiar el directorio de salida para empezar de cero.
    console.log(`🧹 Limpiando directorio de salida: ${CONFIG.outputDir}`);
    if (existsSync(CONFIG.outputDir)) {
      await fs.rm(CONFIG.outputDir, { recursive: true, force: true });
    }
    await fs.mkdir(CONFIG.outputDir, { recursive: true });

    // 2. FLUJO 1: Procesar imágenes gestionadas por el archivo de configuración.
    const {
      updatedAssets,
      managedSourcePaths,
      result: managedResult,
    } = await processManagedImages(cache);
    finalResult.successCount += managedResult.successCount;
    finalResult.errorCount += managedResult.errorCount;

    // 3. FLUJO 2: Procesar imágenes no gestionadas que se encuentren en el directorio.
    const unmanagedResult = await processUnmanagedImages(managedSourcePaths, cache);
    finalResult.successCount += unmanagedResult.successCount;
    finalResult.errorCount += unmanagedResult.errorCount;

    // 4. Actualizar el archivo de configuración solo con los assets gestionados.
    if (Object.keys(updatedAssets).length > 0) {
      await updateSeoConfigFile(updatedAssets);
    }

    // 5. Guardar cache actualizado
    await saveCache(cache);
    console.log(`💾 Cache guardado: ${Object.keys(cache).length} entradas`);

    // 6. Generar reporte detallado
    await generateOptimizationReport(finalResult, cache, startTime);
  } catch (error) {
    console.error(`\n❌ Error catastrófico:`, error instanceof Error ? error.message : error);
    finalResult.errorCount++;
    process.exit(1);
  } finally {
    // 7. Mostrar reporte final.
    console.log('\n----------------------------------------');
    console.log('📊 REPORTE DE OPTIMIZACIÓN');
    console.log(`   ✅ Imágenes procesadas con éxito: ${finalResult.successCount}`);
    console.log(`   ❌ Errores encontrados: ${finalResult.errorCount}`);
    console.log('----------------------------------------');
    console.timeEnd('⏱️ Tiempo total de ejecución');
    if (finalResult.errorCount > 0) {
      console.log('\n🟡 Proceso finalizado con errores.');
    } else {
      console.log('\n🎉 Optimización completada con éxito.');
    }
  }
}

// ============================================================================
// FLUJO 1: IMÁGENES GESTIONADAS (CONFIG-DRIVEN)
// ============================================================================

/**
 * Procesa imágenes gestionadas desde el archivo de configuración
 * @param {CacheData} cache - Cache de optimización
 * @returns {Promise<{updatedAssets: Record<string, any>, managedSourcePaths: Set<string>, result: ProcessResult}>}
 */
async function processManagedImages(cache) {
  console.log(`\n📄 FLUJO 1: Procesando imágenes gestionadas desde ${CONFIG.seoConfigFile}`);
  const updatedAssets = {};
  const managedSourcePaths = new Set();
  const result = { successCount: 0, errorCount: 0 };

  try {
    // Verificar si existe el archivo de configuración
    if (!existsSync(CONFIG.seoConfigFile)) {
      console.log('   ⚠️ Archivo de configuración no encontrado, saltando FLUJO 1');
      return { updatedAssets, managedSourcePaths, result };
    }

    const seoConfigModule = await import(`${CONFIG.seoConfigFile}?v=${Date.now()}`);
    const imageAssets = seoConfigModule.IMAGE_ASSETS || {};

    for (const key in imageAssets) {
      try {
        const asset = { ...imageAssets[key] }; // Clonar para evitar mutación directa
        if (typeof asset !== 'object' || asset === null || !asset.url) continue;

        const sourcePath = path.resolve(
          PROJECT_ROOT,
          asset.url.startsWith('/') ? asset.url.substring(1) : asset.url
        );
        if (!existsSync(sourcePath)) {
          throw new Error(`El archivo fuente ${sourcePath} no existe.`);
        }
        managedSourcePaths.add(sourcePath);

        // Verificar si el archivo ya está optimizado y en cache
        if (await isFileCached(sourcePath, cache)) {
          console.log(`   ⚙️  Saltando optimización de "${key}" (ya optimizado y en cache)`);
          updatedAssets[key] = asset; // Mantener la entrada original si ya está optimizado
          result.successCount++;
          continue;
        }

        const { name, ext } = path.parse(sourcePath);

        // CASO ESPECIAL: Procesar el icono maestro y sus variantes PWA
        if (key === 'Icon') {
          console.log(`   🎨 Procesando caso especial: "${key}" para PWA`);

          // Procesar el archivo SVG original
          const { name } = path.parse(sourcePath);
          const dimensions = { width: asset.width, height: asset.height };
          const svgResult = await processSvg(sourcePath, name, dimensions, key);
          if (svgResult) {
            // Solo actualizamos los campos optimizados, nunca la url fuente
            Object.entries(svgResult).forEach(([k, v]) => {
              if (k !== 'url') asset[k] = v;
            });
          }

          // Generar iconos PWA
          asset.pwaIcons = await processPwaIcons(sourcePath);
          result.successCount += asset.pwaIcons.length + 1; // +1 por el SVG
        }
        // CASO GENERAL: Procesar imágenes normales
        else if (asset.width && asset.height) {
          const dimensions = { width: asset.width, height: asset.height };
          const imageType = detectImageType(name, dimensions);
          console.log(`   🎯 Tipo detectado para "${key}": ${imageType}`);

          let imageResult = null;
          if (ext.toLowerCase() === '.svg') {
            imageResult = await processSvg(sourcePath, name, dimensions, key);
          } else {
            imageResult = await processRasterImage(sourcePath, name, dimensions, key, imageType);
          }
          if (!imageResult) throw new Error('El procesamiento de la imagen falló.');

          // Solo actualizamos los campos optimizados, nunca la url fuente
          Object.entries(imageResult).forEach(([k, v]) => {
            if (k !== 'url') asset[k] = v;
          });

          // Actualizar cache con los archivos generados
          const outputFiles = Object.values(imageResult.sources || {}).map((src) =>
            path.resolve(PROJECT_ROOT, src.startsWith('/') ? src.substring(1) : src)
          );
          await updateCache(sourcePath, outputFiles, cache);

          result.successCount++;
        }

        if (!asset.metadata) asset.metadata = {};
        Object.assign(asset.metadata, {
          ...CONFIG.defaultMetadata,
          ...asset.metadata,
          created: new Date().toISOString(),
        });
        updatedAssets[key] = asset;
      } catch (error) {
        console.error(
          `   ❌ Error en la clave gestionada "${key}":`,
          error instanceof Error ? error.message : 'Error desconocido.'
        );
        result.errorCount++;
        updatedAssets[key] = imageAssets[key]; // Mantener la entrada original si falla
      }
    }
  } catch (error) {
    console.error(
      `   ❌ Error fatal leyendo ${CONFIG.seoConfigFile}:`,
      error instanceof Error ? error.message : error
    );
    result.errorCount++;
  }

  return { updatedAssets, managedSourcePaths, result };
}

// ============================================================================
// FLUJO 2: IMÁGENES NO GESTIONADAS (DIRECTORY-DRIVEN)
// ============================================================================

/**
 * Procesa imágenes no gestionadas encontradas en el directorio
 * @param {Set<string>} managedSourcePaths - Rutas de imágenes ya gestionadas
 * @param {CacheData} cache - Cache de optimización
 * @returns {Promise<ProcessResult>}
 */
async function processUnmanagedImages(managedSourcePaths, cache) {
  console.log(`\n📂 FLUJO 2: Buscando imágenes no gestionadas en ${CONFIG.inputDir}`);
  const result = { successCount: 0, errorCount: 0 };

  // Verificar si existe el directorio de entrada
  if (!existsSync(CONFIG.inputDir)) {
    console.log('   ⚠️ Directorio de entrada no encontrado, saltando FLUJO 2');
    return result;
  }

  const allImagePaths = await glob(`${CONFIG.inputDir}/**/*.{jpg,jpeg,png,gif,tiff,svg}`);

  const unmanagedPaths = allImagePaths
    .map((p) => path.resolve(p))
    .filter((p) => !managedSourcePaths.has(p));

  if (unmanagedPaths.length === 0) {
    console.log('   ✅ No se encontraron imágenes no gestionadas.');
    return result;
  }

  for (const sourcePath of unmanagedPaths) {
    try {
      // Verificar si el archivo ya está optimizado y en cache
      if (await isFileCached(sourcePath, cache)) {
        console.log(
          `   ⚙️  Saltando optimización de "${path.basename(sourcePath)}" (ya optimizado y en cache)`
        );
        result.successCount++;
        continue;
      }

      const { name, ext } = path.parse(sourcePath);
      const cleanedName = cleanBaseName(name);
      const dimensions = extractDimensionsFromName(name) || CONFIG.defaultSize;

      console.log(`   🖼️  Procesando no gestionada: ${path.basename(sourcePath)}`);

      let outputFiles = [];
      if (ext.toLowerCase() === '.svg') {
        const result = await processSvg(sourcePath, name, dimensions, cleanedName);
        if (result?.sources) {
          outputFiles = Object.values(result.sources).map((src) =>
            path.resolve(PROJECT_ROOT, src.startsWith('/') ? src.substring(1) : src)
          );
        }
      } else {
        const result = await processRasterImage(sourcePath, name, dimensions, cleanedName);
        if (result?.sources) {
          outputFiles = Object.values(result.sources).map((src) =>
            path.resolve(PROJECT_ROOT, src.startsWith('/') ? src.substring(1) : src)
          );
        }
      }

      if (outputFiles.length > 0) {
        await updateCache(sourcePath, outputFiles, cache);
      }
      result.successCount++;
    } catch (error) {
      console.error(
        `   ❌ Error en el archivo no gestionado ${path.basename(sourcePath)}:`,
        error instanceof Error ? error.message : 'Error desconocido.'
      );
      result.errorCount++;
    }
  }
  return result;
}

// ============================================================================
// LÓGICA DE PROCESAMIENTO INDIVIDUAL
// ============================================================================

/**
 * Limpia el nombre base de la imagen
 * @param {string} name - Nombre del archivo
 * @returns {string}
 */
const cleanBaseName = (name) => name.replace(/-(\d+)[xX](\d+)$/, '');

/**
 * Extrae dimensiones del nombre del archivo
 * @param {string} name - Nombre del archivo
 * @returns {ImageDimensions|null}
 */
const extractDimensionsFromName = (name) => {
  const match = name.match(/-(\d+)[xX](\d+)$/);
  return match ? { width: parseInt(match[1], 10), height: parseInt(match[2], 10) } : null;
};

/**
 * Detecta el tipo de imagen automáticamente
 * @param {string} fileName - Nombre del archivo
 * @param {ImageDimensions} dimensions - Dimensiones de la imagen
 * @returns {keyof typeof CONFIG.imageTypes}
 */
const detectImageType = (fileName, dimensions) => {
  const name = fileName.toLowerCase();
  const { width, height } = dimensions;
  const aspectRatio = width / height;

  // Detectar por nombre
  if (name.includes('hero') || name.includes('banner') || name.includes('header')) return 'hero';
  if (name.includes('thumb') || name.includes('preview') || name.includes('card'))
    return 'thumbnail';
  if (name.includes('icon') || name.includes('logo') || name.includes('favicon')) return 'icon';
  if (name.includes('bg') || name.includes('background') || name.includes('pattern'))
    return 'background';

  // Detectar por dimensiones
  if (width >= 1200 && height >= 600) return 'hero';
  if (width <= 300 && height <= 300) return 'thumbnail';
  if (width === height && width <= 512) return 'icon';
  if (aspectRatio > 2 || aspectRatio < 0.5) return 'background';

  // Por defecto
  return 'thumbnail';
};

/**
 * Procesa imágenes raster (JPG, PNG, etc.)
 * @param {string} filePath - Ruta del archivo
 * @param {string} baseName - Nombre base
 * @param {ImageDimensions} dimensions - Dimensiones
 * @param {string} assetKey - Clave del asset
 * @param {keyof typeof CONFIG.imageTypes} [imageType] - Tipo de imagen
 * @returns {Promise<Partial<ProcessedImage>|null>}
 */
async function processRasterImage(filePath, baseName, { width, height }, assetKey, imageType) {
  const cleanedBaseName = cleanBaseName(baseName);
  const image = sharp(filePath).withMetadata();
  const sources = {};

  // Usar configuración específica del tipo de imagen si está disponible
  const imageConfig = imageType ? CONFIG.imageTypes[imageType] : null;
  const formatsToProcess = imageConfig?.formats || Object.keys(CONFIG.formats);

  if (imageType) {
    console.log(
      `     🎯 Aplicando configuración para tipo "${imageType}": ${formatsToProcess.join(', ')}`
    );
  }

  // Aplica variantes responsive a todas las imágenes raster
  const subDir = path.join(CONFIG.outputDir, cleanedBaseName);
  if (!existsSync(subDir)) {
    await fs.mkdir(subDir, { recursive: true });
  }

  // Definir variantes ULTRA-OPTIMIZADAS (menos tamaños)
  const responsiveVariants = [
    { suffix: '-800', width: 800 }, // Tamaño medio
    { suffix: '', width: 1200 }, // base (reducido de 1920)
  ];

  for (const { suffix, width: variantWidth } of responsiveVariants) {
    for (const format of formatsToProcess) {
      const outputFileName = `${cleanedBaseName}${suffix}.${format}`;
      const outputPath = path.join(subDir, outputFileName);
      const publicPath = `/assets/img-op/${cleanedBaseName}/${outputFileName}`;
      const resizeOptions = {
        width: variantWidth,
        height: undefined,
        fit: sharp.fit.inside,
        withoutEnlargement: true,
      };
      await image.clone().resize(resizeOptions)[format](CONFIG.formats[format]).toFile(outputPath);
      // Solo guardar la variante base en sources para el objeto principal
      if (suffix === '') {
        sources[format] = publicPath;
      }
    }
  }

  const placeholderBuffer = await image.clone().resize(10).png({ quality: 10 }).toBuffer();
  const placeholder = `data:image/png;base64,${placeholderBuffer.toString('base64')}`;
  const { data: pixels, info } = await image
    .clone()
    .raw()
    .ensureAlpha()
    .resize(32, 32, { fit: 'inside' })
    .toBuffer({ resolveWithObject: true });
  const blurhash = encode(new Uint8ClampedArray(pixels), info.width, info.height, 4, 3);
  const firstFormat = Object.keys(sources)[0];
  return {
    url: sources[firstFormat],
    width,
    height,
    alt: assetKey,
    type: `image/${firstFormat}`,
    sources,
    placeholder,
    blurhash,
  };
}

/**
 * Procesa archivos SVG
 * @param {string} filePath - Ruta del archivo
 * @param {string} baseName - Nombre base
 * @param {ImageDimensions} dimensions - Dimensiones
 * @param {string} assetKey - Clave del asset
 * @returns {Promise<Partial<ProcessedImage>|null>}
 */
async function processSvg(filePath, baseName, { width, height }, assetKey) {
  const cleanedBaseName = cleanBaseName(baseName);
  const outputFileName = `${cleanedBaseName}.svg`;
  const outputPath = path.join(CONFIG.outputDir, outputFileName);
  const publicPath = ('/' + path.relative(PROJECT_ROOT, outputPath)).replace(/\\/g, '/');
  await fs.copyFile(filePath, outputPath);
  return {
    url: publicPath,
    width,
    height,
    alt: assetKey,
    type: 'image/svg+xml',
    sources: { optimized: publicPath },
  };
}

/**
 * Genera iconos PWA optimizados
 * @param {string} sourcePath - Ruta del archivo fuente
 * @returns {Promise<PwaIconDef[]>}
 */
async function processPwaIcons(sourcePath) {
  const updatedPwaIcons = [];
  const sourceImage = sharp(sourcePath);

  // Nueva carpeta destino para iconos
  const iconsDir = path.join(PROJECT_ROOT, 'public', 'assets', 'icons');
  if (!existsSync(iconsDir)) {
    await fs.mkdir(iconsDir, { recursive: true });
  }

  // Generar iconos PWA estándar en WebP
  for (const size of CONFIG.pwa.iconSizes) {
    const outputFileName = `icon-${size}x${size}.webp`;
    const outputPath = path.join(iconsDir, outputFileName);
    const publicPath = `/assets/icons/${outputFileName}`;

    await sourceImage
      .clone()
      .resize({ width: size, height: size })
      .webp({ quality: 85 })
      .toFile(outputPath);

    console.log(`     ✅ Generado ícono PWA: ${outputFileName}`);
    updatedPwaIcons.push({
      sizes: `${size}x${size}`,
      type: 'image/webp',
      purpose: 'any',
      src: publicPath,
    });
  }

  // Generar iconos maskable para PWA en WebP
  for (const size of CONFIG.pwa.maskableSizes) {
    const outputFileName = `icon-${size}x${size}-maskable.webp`;
    const outputPath = path.join(iconsDir, outputFileName);
    const publicPath = `/assets/icons/${outputFileName}`;

    await sourceImage
      .clone()
      .resize({ width: size, height: size })
      .webp({ quality: 85 })
      .toFile(outputPath);

    console.log(`     ✅ Generado ícono maskable: ${outputFileName}`);
    updatedPwaIcons.push({
      sizes: `${size}x${size}`,
      type: 'image/webp',
      purpose: 'maskable',
      src: publicPath,
    });
  }

  // Generar Apple Touch Icons en WebP
  for (const size of CONFIG.pwa.appleTouchSizes) {
    const outputFileName = `apple-touch-icon-${size}x${size}.webp`;
    const outputPath = path.join(iconsDir, outputFileName);

    await sourceImage
      .clone()
      .resize({ width: size, height: size })
      .webp({ quality: 85 })
      .toFile(outputPath);

    console.log(`     ✅ Generado Apple Touch Icon: ${outputFileName}`);
  }

  // Generar favicons en WebP
  for (const size of CONFIG.pwa.faviconSizes) {
    const outputFileName = `favicon-${size}x${size}.webp`;
    const outputPath = path.join(iconsDir, outputFileName);

    await sourceImage
      .clone()
      .resize({ width: size, height: size })
      .webp({ quality: 85 })
      .toFile(outputPath);

    console.log(`     ✅ Generado favicon: ${outputFileName}`);
  }

  return updatedPwaIcons;
}

// ============================================================================
// UTILIDADES DE ESCRITURA DE ARCHIVO
// ============================================================================

/**
 * Convierte un valor a string de TypeScript
 * @param {unknown} value - Valor a convertir
 * @param {string} indent - Indentación
 * @returns {string}
 */
const toTypeScriptValueString = (value, indent = '') => {
  if (value === null) return 'null';
  if (typeof value === 'string') return `'${value.replace(/'/g, "\\'")}'`;
  if (typeof value !== 'object') return String(value);
  const newIndent = indent + '  ';
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value
      .map((item) => `${newIndent}${toTypeScriptValueString(item, newIndent)}`)
      .join(',\n');
    return `[\n${items}\n${indent}]`;
  }
  const items = Object.entries(value)
    .map(([k, v]) =>
      v !== undefined ? `${newIndent}${k}: ${toTypeScriptValueString(v, newIndent)}` : null
    )
    .filter(Boolean)
    .join(',\n');
  return `{\n${items}\n${indent}}`;
};

/**
 * Actualiza el archivo de configuración SEO
 * @param {Record<string, any>} processedImages - Imágenes procesadas
 * @returns {Promise<void>}
 */
async function updateSeoConfigFile(processedImages) {
  console.log(`\n✍️  Actualizando archivo de configuración con los assets gestionados.`);
  
  // Verificar si existe el archivo de configuración
  if (!existsSync(CONFIG.seoConfigFile)) {
    console.log('   ⚠️ Archivo de configuración no encontrado, creando uno nuevo...');
    await fs.mkdir(path.dirname(CONFIG.seoConfigFile), { recursive: true });
    
    const newContent = `// ============================================================================
// CONFIGURACIÓN DE IMÁGENES SEO - GENERADO AUTOMÁTICAMENTE
// ============================================================================
// Última actualización: ${new Date().toISOString()}

export const IMAGE_ASSETS = {
${Object.entries(processedImages)
  .map(([key, asset]) => `  ${key}: ${toTypeScriptValueString(asset, '  ')}`)
  .join(',\n')}
} as const;
`;
    await fs.writeFile(CONFIG.seoConfigFile, newContent, 'utf-8');
    console.log('   ✅ Archivo de configuración creado con éxito.');
    return;
  }

  const originalContent = await fs.readFile(CONFIG.seoConfigFile, 'utf-8');
  let newAssetsContent = 'export const IMAGE_ASSETS = {\n';
  const keys = Object.keys(processedImages);
  keys.forEach((key, index) => {
    newAssetsContent += `  ${key}: ${toTypeScriptValueString(processedImages[key], '  ')}${
      index < keys.length - 1 ? ',\n' : '\n'
    }`;
  });
  newAssetsContent += '} as const;';
  const updatedContent = originalContent.replace(
    /export const IMAGE_ASSETS = \{[\s\S]*?\} as const;/m,
    newAssetsContent
  );
  const finalContent = updatedContent.replace(
    /(Última actualización: ).*Z/m,
    `$1${new Date().toISOString()}`
  );
  await fs.writeFile(CONFIG.seoConfigFile, finalContent, 'utf-8');
  console.log('   ✅ Archivo de configuración actualizado con éxito.');
}

// ============================================================================
// UTILIDADES DE CACHE
// ============================================================================

const CACHE_FILE = path.join(PROJECT_ROOT, '.image-optimization-cache.json');

/**
 * @typedef {Object} CacheEntry
 * @property {string} hash - Hash del archivo
 * @property {number} timestamp - Timestamp de la entrada
 * @property {string[]} outputFiles - Archivos de salida generados
 */

/**
 * @typedef {Object} CacheData
 * @property {string} CacheEntry - Entrada de cache por ruta de archivo
 */

/**
 * Carga el cache desde el archivo
 * @returns {Promise<CacheData>}
 */
async function loadCache() {
  try {
    if (existsSync(CACHE_FILE)) {
      const cacheContent = await fs.readFile(CACHE_FILE, 'utf-8');
      return JSON.parse(cacheContent);
    }
  } catch (error) {
    console.log('   ⚠️  Cache corrupto, iniciando nuevo cache.');
  }
  return {};
}

/**
 * Guarda el cache en el archivo
 * @param {CacheData} cache - Datos del cache
 * @returns {Promise<void>}
 */
async function saveCache(cache) {
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.log('   ⚠️  No se pudo guardar el cache.');
  }
}

/**
 * Genera hash MD5 de un archivo
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<string>}
 */
async function getFileHash(filePath) {
  const content = await fs.readFile(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Verifica si un archivo está en cache y es válido
 * @param {string} sourcePath - Ruta del archivo fuente
 * @param {CacheData} cache - Cache de optimización
 * @returns {Promise<boolean>}
 */
async function isFileCached(sourcePath, cache) {
  const entry = cache[sourcePath];
  if (!entry) return false;

  try {
    const currentHash = await getFileHash(sourcePath);
    if (entry.hash !== currentHash) return false;

    // Verificar que todos los archivos de salida existen
    for (const outputFile of entry.outputFiles) {
      if (!existsSync(outputFile)) return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Actualiza el cache con nuevos archivos
 * @param {string} sourcePath - Ruta del archivo fuente
 * @param {string[]} outputFiles - Archivos de salida generados
 * @param {CacheData} cache - Cache de optimización
 * @returns {Promise<void>}
 */
async function updateCache(sourcePath, outputFiles, cache) {
  const hash = await getFileHash(sourcePath);
  cache[sourcePath] = {
    hash,
    timestamp: Date.now(),
    outputFiles,
  };
}

// ============================================================================
// SISTEMA DE REPORTES
// ============================================================================

/**
 * Genera reporte detallado de optimización
 * @param {ProcessResult} finalResult - Resultado final
 * @param {CacheData} cache - Cache de optimización
 * @param {number} startTime - Tiempo de inicio
 * @returns {Promise<void>}
 */
async function generateOptimizationReport(finalResult, cache, startTime) {
  const endTime = Date.now();
  const timeElapsed = endTime - startTime;

  console.log('\n========================================');
  console.log('📊 REPORTE DETALLADO DE OPTIMIZACIÓN');
  console.log('========================================');
  console.log(`⏱️  Tiempo total: ${(timeElapsed / 1000).toFixed(2)}s`);
  console.log(`📦 Entradas en cache: ${Object.keys(cache).length}`);
  console.log(`✅ Imágenes procesadas: ${finalResult.successCount}`);
  console.log(`❌ Errores: ${finalResult.errorCount}`);
  console.log(
    `⚙️  Imágenes saltadas (cache): ${Object.keys(cache).length - finalResult.successCount}`
  );

  // Calcular estadísticas de formatos
  const formatStats = await calculateFormatStats();
  if (Object.keys(formatStats).length > 0) {
    console.log('\n📁 Formatos generados:');
    Object.entries(formatStats).forEach(([format, count]) => {
      console.log(`   ${format}: ${count} archivos`);
    });
  }

  // Calcular ahorro de espacio
  const spaceStats = await calculateSpaceSavings();
  if (spaceStats.saved > 0) {
    console.log('\n💾 Ahorro de espacio:');
    console.log(`   Antes: ${formatBytes(spaceStats.before)}`);
    console.log(`   Después: ${formatBytes(spaceStats.after)}`);
    console.log(
      `   Ahorrado: ${formatBytes(spaceStats.saved)} (${spaceStats.percentage.toFixed(1)}%)`
    );
  }

  console.log('========================================\n');
}

/**
 * Calcula estadísticas de formatos generados
 * @returns {Promise<Record<string, number>>}
 */
async function calculateFormatStats() {
  const stats = {};
  try {
    const files = await glob(`${CONFIG.outputDir}/**/*.*`);
    files.forEach((file) => {
      const ext = path.extname(file).toLowerCase().substring(1);
      stats[ext] = (stats[ext] || 0) + 1;
    });
  } catch {
    // Ignorar errores en el cálculo de estadísticas
  }
  return stats;
}

/**
 * Calcula ahorro de espacio
 * @returns {Promise<{before: number, after: number, saved: number, percentage: number}>}
 */
async function calculateSpaceSavings() {
  let before = 0;
  let after = 0;

  try {
    // Calcular tamaño de archivos originales
    if (existsSync(CONFIG.inputDir)) {
      const originalFiles = await glob(`${CONFIG.inputDir}/**/*.*`);
      for (const file of originalFiles) {
        const stats = await fs.stat(file);
        before += stats.size;
      }
    }

    // Calcular tamaño de archivos optimizados
    if (existsSync(CONFIG.outputDir)) {
      const optimizedFiles = await glob(`${CONFIG.outputDir}/**/*.*`);
      for (const file of optimizedFiles) {
        const stats = await fs.stat(file);
        after += stats.size;
      }
    }
  } catch {
    // Ignorar errores en el cálculo de espacio
  }

  const saved = before - after;
  const percentage = before > 0 ? (saved / before) * 100 : 0;

  return { before, after, saved, percentage };
}

/**
 * Formatea bytes a formato legible
 * @param {number} bytes - Bytes a formatear
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================================================
// VALIDACIÓN LOCAL DE IMÁGENES OPTIMIZADAS
// ============================================================================

/**
 * Valida que todas las imágenes optimizadas estén presentes
 * @returns {Promise<void>}
 */
async function validateAllOptimizedImages() {
  const imgDir = CONFIG.outputDir;
  if (!existsSync(imgDir)) {
    console.log('⚠️ Directorio de imágenes optimizadas no encontrado.');
    return;
  }

  const files = await fs.readdir(imgDir);
  let warnings = 0;
  for (const file of files) {
    const base = file.replace(/\.(avif|webp|png|jpg|jpeg)$/i, '');
    const avif = path.join(imgDir, `${base}.avif`);
    const webp = path.join(imgDir, `${base}.webp`);
    try {
      await fs.access(avif);
    } catch {
      console.warn(`⚠️ AVIF no encontrado: ${avif}`);
      warnings++;
    }
    try {
      await fs.access(webp);
    } catch {
      console.warn(`⚠️ WebP no encontrado: ${webp}`);
      warnings++;
    }
  }
  if (warnings === 0) {
    console.log('✅ Todas las imágenes optimizadas están presentes.');
  } else {
    console.log(`🟡 Validación finalizada con ${warnings} advertencias.`);
  }
}

// ============================================================================
// INICIAR EJECUCIÓN
// ============================================================================

// Ejecutar optimización cuando se ejecuta el script
if (process.argv[1] && process.argv[1].includes('Transformacion-SmartImages.js')) {
  console.log('🚀 Iniciando script de transformación de imágenes...');
  optimizeImages().then(validateAllOptimizedImages);
}

export { optimizeImages, validateAllOptimizedImages }; 