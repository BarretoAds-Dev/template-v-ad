// ============================================================================
// 🚀 SCRIPT DE PRELOADS ULTRA OPTIMIZADO v3.0 - ASTRO TAILWIND FUSION
// ============================================================================
// MEJORAS v3.0:
// 1. Eliminación de duplicaciones innecesarias
// 2. Orden estratégico optimizado: CSS crítico → CSS → JS → Fuentes
// 3. Sin preconnect interno, sin meta description
// 4. Sin prefetch duplicados de preloads
// 5. CSS crítico inline como primera prioridad
// 6. Eliminación de preloads de imágenes eager
// 7. Comunicación SW ultra minificada
// 8. Estrategias diferenciadas por tipo de recurso
// 9. Optimizado para Astro + Tailwind CSS
// ============================================================================

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

// ============================================================================
// 🏗️ TIPOS Y INTERFACES
// ============================================================================

/**
 * @typedef {Object} DetectedResources
 * @property {string[]} css - Archivos CSS detectados
 * @property {string[]} js - Archivos JavaScript detectados
 * @property {string[]} pageJs - Archivos JavaScript de página
 * @property {string[]} fonts - Archivos de fuentes detectados
 */

/**
 * @typedef {'aggressive' | 'moderate' | 'conservative'} PreloadStrategy
 */

/**
 * @typedef {Object} FontConfig
 * @property {string} family - Familia de fuente
 * @property {string[]} weights - Pesos de fuente
 * @property {string[]} subsets - Subconjuntos de caracteres
 * @property {'normal' | 'italic'} style - Estilo de fuente
 */

// ============================================================================
// 🛠️ CONFIGURACIÓN ULTRA OPTIMIZADA PARA ASTRO
// ============================================================================

const logger = {
  log: (...args) => console.log('⚡ [LOG]', ...args),
  warn: (...args) => console.warn('⚠️ [WARN]', ...args),
  error: (...args) => console.error('❌ [ERROR]', ...args),
  debug: (...args) => console.log('🔍 [DEBUG]', ...args),
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const CONFIG = {
  directories: {
    project: PROJECT_ROOT,
    dist: path.join(PROJECT_ROOT, 'dist'),
    possibleAstroPaths: [
      path.join(PROJECT_ROOT, 'dist', '_astro'),
      path.join(PROJECT_ROOT, 'dist', 'assets'),
      path.join(PROJECT_ROOT, 'dist'),
    ],
  },
  targetFile: path.join(PROJECT_ROOT, 'src', 'layouts', 'MetaHead.astro'),
  fontSource: {
    targetFonts: [
      {
        family: 'inter',
        weights: ['400', '500', '600', '700'],
        subsets: ['latin'],
        style: 'normal',
      },
    ],
  },
  preloadStrategy: 'moderate',
};

const CONSTANTS = {
  preloadMarkers: {
    start: '{/* 🚀🚀🚀 Preloads Content Optimizations Start 🚀🚀🚀 */}',
    end: '{/* 🚀 Preloads Content Optimizations End 🚀 */}',
  },
};

// ============================================================================
// 🔍 DETECCIÓN DE RECURSOS OPTIMIZADA PARA ASTRO
// ============================================================================

/**
 * Encuentra el directorio válido de Astro con archivos CSS/JS
 * @returns {Promise<string|null>}
 */
async function findValidAstroDirectory() {
  logger.debug('🔍 Buscando directorio con archivos CSS/JS...');

  for (const astroPath of CONFIG.directories.possibleAstroPaths) {
    try {
      await fs.access(astroPath);
      const files = await fs.readdir(astroPath);
      const hasAssetsFiles = files.some((f) => f.endsWith('.css') || f.endsWith('.js'));

      if (hasAssetsFiles) {
        logger.debug(`✅ Directorio encontrado: ${astroPath}`);
        return astroPath;
      }
    } catch {
      // Ignorar errores silenciosamente
    }
  }

  return null;
}

/**
 * Detecta archivos JavaScript de página específicos de Astro
 * @param {string} astroDir - Directorio de Astro
 * @returns {Promise<string[]>}
 */
async function detectPageJsFiles(astroDir) {
  try {
    const pageJsFiles = await glob('page.*.js', {
      cwd: astroDir,
      absolute: false,
      nodir: true,
      ignore: ['**/*.map'],
    });

    const relativeToDistPath = path.relative(CONFIG.directories.dist, astroDir);
    const basePath = relativeToDistPath ? `/${relativeToDistPath}` : '';

    return pageJsFiles.map((file) => `${basePath}/${file}`);
  } catch {
    return [];
  }
}

/**
 * Detecta archivos de fuentes optimizados
 * @param {string} astroDir - Directorio de Astro
 * @returns {Promise<string[]>}
 */
async function detectFontsourceFiles(astroDir) {
  try {
    const allWoff2Files = await glob('**/*.woff2', {
      cwd: astroDir,
      absolute: false,
      nodir: true,
    });

    if (allWoff2Files.length === 0) return [];

    const finalFontFiles = new Set();
    for (const fontConfig of CONFIG.fontSource.targetFonts) {
      const matchingFonts = allWoff2Files.filter((file) => {
        const lower = file.toLowerCase();
        return (
          lower.includes(fontConfig.family.toLowerCase()) &&
          fontConfig.weights.some((w) => lower.includes(`-${w}-`)) &&
          fontConfig.subsets.some((s) => lower.includes(`-${s.toLowerCase()}-`)) &&
          lower.includes(`-${fontConfig.style.toLowerCase()}-`)
        );
      });

      matchingFonts.forEach((file) => {
        finalFontFiles.add(`/_astro/${file}`);
      });
    }

    return Array.from(finalFontFiles).sort((a, b) => {
      const getWeight = (url) => {
        const match = url.match(/-(\d+)-/);
        return match ? parseInt(match[1], 10) : 0;
      };
      return getWeight(a) - getWeight(b);
    });
  } catch {
    return [];
  }
}

/**
 * Detecta recursos críticos para Astro
 * @returns {Promise<DetectedResources>}
 */
async function detectCriticalResources() {
  logger.log('🔍 Detectando recursos críticos...');
  const resources = {
    css: [],
    js: [],
    pageJs: [],
    fonts: [],
  };

  const assetsDir = await findValidAstroDirectory();
  if (!assetsDir) {
    logger.error('❌ No se encontró directorio con archivos CSS/JS.');
    return resources;
  }

  logger.log(`✅ Usando directorio: ${assetsDir}`);

  try {
    // CSS Files - Buscar específicamente archivos CSS de Astro
    const allCssFiles = await glob('**/*.css', {
      cwd: assetsDir,
      absolute: false,
      nodir: true,
      ignore: ['**/*.map', '**/*.br'],
    });

    // JS Files - Buscar archivos JS de Astro
    const allJsFiles = await glob('**/*.js', {
      cwd: assetsDir,
      absolute: false,
      nodir: true,
      ignore: ['**/*.map', '**/*.br'],
    });

    // Page JS Files
    resources.pageJs = await detectPageJsFiles(assetsDir);

    // Filtrar archivos importantes
    const importantCssFiles = allCssFiles.filter((file) => 
      path.basename(file).includes('index') || 
      path.basename(file).includes('astro') ||
      path.basename(file).includes('tailwind')
    );
    
    const importantJsFiles = allJsFiles.filter((file) => 
      path.basename(file).includes('index') || 
      path.basename(file).includes('astro')
    );

    const relativeToDistPath = path.relative(CONFIG.directories.dist, assetsDir);
    const basePath = relativeToDistPath ? `/${relativeToDistPath}` : '';

    resources.css = importantCssFiles.map((file) => `${basePath}/${file}`);
    resources.js = importantJsFiles.map((file) => `${basePath}/${file}`);
    resources.fonts = await detectFontsourceFiles(assetsDir);

    logger.log(`📊 RECURSOS DETECTADOS:`);
    logger.log(`   🎨 CSS (${resources.css.length}): ${resources.css.join(', ')}`);
    logger.log(`   ⚡ JS (${resources.js.length}): ${resources.js.join(', ')}`);
    logger.log(`   📄 Page JS (${resources.pageJs.length}): ${resources.pageJs.join(', ')}`);
    logger.log(`   🔤 Fuentes (${resources.fonts.length}): ${resources.fonts.join(', ')}`);
  } catch (error) {
    logger.error(`❌ Error detectando recursos: ${error.message}`);
  }

  return resources;
}

// ============================================================================
// 🎨 GENERACIÓN ULTRA OPTIMIZADA - SIN DUPLICACIONES
// ============================================================================

/**
 * Genera preloads ultra optimizados para Astro + Tailwind
 * @param {DetectedResources} resources - Recursos detectados
 * @returns {string}
 */
function generateUltraOptimizedPreloads(resources) {
  const lines = [];

  logger.log('🎨 Generando preloads ultra-optimizados...');

  const totalResources = resources.css.length + resources.js.length + resources.pageJs.length;
  if (totalResources === 0) {
    logger.warn('⚠️ No hay recursos CSS/JS para generar preloads');
    return '';
  }

  {/* 1. 🎨 CSS CRÍTICO INLINE - PRIMERA PRIORIDAD (style) */}
  lines.push('  {/* 🎨 CSS CRÍTICO INLINE - MÁXIMA PRIORIDAD  */}');
  lines.push(`  <style is:inline id="critical-css">
*,
*::before,
*::after {
  box-sizing: border-box;
  -ms-overflow-style: none; 
  scrollbar-width: none; 
}
::-webkit-scrollbar {
  display: none;
}
::selection {
  background-color: var(--text-color);
  color: var(--background-color);
}
html {
  min-height: 100%;
  scroll-behavior: smooth;
  scrollbar-gutter: stable;
  text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
  font-variant-alternates: normal;
  font-stretch: normal;
  font-display: swap;
  text-rendering: optimizeSpeed;
  font-weight: 400;
  font-size-adjust: 0.5;
  ascent-override: 90%;
  descent-override: 20%;
  line-gap-override: 0%;
}

body {
  display: grid;
  min-height: 100dvh;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header"
    "main"
    "footer";
}
header {
  grid-area: header;
}

main {
  grid-area: main;
  container-type: inline-size;
  container-name: main-layout;
  flex: 1 0 auto; 
}
footer {
  grid-area: footer;
}
</style>`);
  logger.log('   ✅ CSS Inline crítico añadido (style)');

  {/* 2. 🎨 CSS EXTERNOS - SEGUNDA PRIORIDAD */}
  if (resources.css.length > 0) {
    lines.push('  {/* 🎨 CSS CRÍTICOS EXTERNOS */}');
    resources.css.forEach((file, index) => {
      const priority = index === 0 ? 'high' : 'medium';
      lines.push(
        `  <link rel="preload" href="${file}" as="style" fetchpriority="${priority}" onload="this.onload=null;this.rel='stylesheet'">`
      );
      logger.log(`   ✅ CSS preload: ${file} (${priority})`);
    });
  }

  {/* 3. ⚡ JAVASCRIPT CRÍTICO - TERCERA PRIORIDAD */}
  if (resources.js.length > 0) {
    lines.push('  {/* ⚡ JavaScript Crítico */}');

    {/* Preload del JS crítico */}
    lines.push(
      `  <link rel="modulepreload" href="${resources.js[0]}" as="script" fetchpriority="high">`
    );

    {/* Script tags para ejecución */}
    resources.js.forEach((file, index) => {
      const isCritical = index === 0;
      const scriptTag = isCritical
        ? `<script type="module" src="${file}" fetchpriority="high"></script>`
        : `<script type="module" src="${file}" defer></script>`;
      lines.push(`  ${scriptTag}`);
    });

    logger.log(`   ✅ JS crítico: ${resources.js.join(', ')}`);
  }

  {/* 4. 📄 JAVASCRIPT DE PÁGINA - CUARTA PRIORIDAD */}
  if (resources.pageJs.length > 0) {
    lines.push('  {/* 📄 JavaScript de Página */}');
    resources.pageJs.forEach((file) => {
      lines.push(`  <script type="module" src="${file}" defer></script>`);
    });
    logger.log(`   ✅ JS de página: ${resources.pageJs.join(', ')}`);
  }

  {/* 5. 🔤 FUENTES - QUINTA PRIORIDAD */}
  if (resources.fonts.length > 0) {
    lines.push('  {/* 🔤 Fuentes Críticas */}');
    resources.fonts.forEach((file, index) => {
      const priority = index === 0 ? 'high' : 'medium';
      lines.push(
        `  <link rel="preload" href="${file}" as="font" type="font/woff2" crossorigin fetchpriority="${priority}" />`
      );
      logger.log(`   ✅ Font preload: ${file} (${priority})`);
    });
  }

  const result = [
    `  ${CONSTANTS.preloadMarkers.start}`,
    ...lines,
    `  ${CONSTANTS.preloadMarkers.end}`,
  ].join('\n');
  logger.log(`   ✅ Generadas ${lines.length} líneas ultra-optimizadas`);
  return result;
}

// ============================================================================
// 🔧 INYECCIÓN OPTIMIZADA
// ============================================================================

/**
 * Escapa caracteres especiales para regex
 * @param {string} str - String a escapar
 * @returns {string}
 */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Inyecta preloads en el archivo de layout
 * @param {string} filePath - Ruta del archivo
 * @param {string} preloadHtml - HTML de preloads
 * @returns {Promise<void>}
 */
async function injectPreloads(filePath, preloadHtml) {
  try {
    logger.log(`🔄 Procesando: ${path.relative(CONFIG.directories.project, filePath)}`);

    await fs.access(filePath);
    let content = await fs.readFile(filePath, 'utf-8');

    // Remover bloque anterior
    const preloadBlockRegex = new RegExp(
      `[ \\t]*${escapeRegExp(CONSTANTS.preloadMarkers.start)}[\\s\\S]*?${escapeRegExp(CONSTANTS.preloadMarkers.end)}[ \\t]*\\n?`,
      'g'
    );

    const contentWithoutOldBlock = content.replace(preloadBlockRegex, '');
    const hadOldBlock = contentWithoutOldBlock.length !== content.length;

    if (preloadHtml === '') {
      if (hadOldBlock) {
        await fs.writeFile(filePath, contentWithoutOldBlock, 'utf-8');
        logger.log('   🗑️ Bloque anterior eliminado');
      }
      return;
    }

    // Buscar punto de inserción en Astro
    const insertionPoints = [
      '<meta charset="UTF-8" />',
      '<meta charset="utf-8" />',
      '<head>',
      '<title>'
    ];

    let insertionPoint = -1;
    let insertionText = '';

    for (const point of insertionPoints) {
      const pointIndex = contentWithoutOldBlock.indexOf(point);
      if (pointIndex !== -1) {
        insertionPoint = pointIndex;
        insertionText = point;
        break;
      }
    }

    if (insertionPoint === -1) {
      logger.error('   ❌ No se encontró punto de inserción válido');
      return;
    }

    // Insertar preloads
    const newContent =
      contentWithoutOldBlock.substring(0, insertionPoint + insertionText.length) +
      '\n' +
      preloadHtml +
      contentWithoutOldBlock.substring(insertionPoint + insertionText.length);

    if (newContent.trim() !== content.trim()) {
      await fs.writeFile(filePath, newContent, 'utf-8');
      logger.log(`   ✅ Preloads ultra-optimizados inyectados`);
    } else {
      logger.log(`   👌 Sin cambios necesarios`);
    }
  } catch (error) {
    logger.error(`   ❌ Error inyectando preloads: ${error.message}`);
  }
}

// ============================================================================
// 🏁 EJECUCIÓN PRINCIPAL ULTRA OPTIMIZADA
// ============================================================================

/**
 * Ejecuta la optimización principal de preloads
 * @returns {Promise<void>}
 */
async function runUltraPreloadOptimization() {
  console.log('\n'.padEnd(80, '='));
  console.log('🚀 ULTRA OPTIMIZACIÓN DE PRELOADS v3.0 - ASTRO TAILWIND FUSION 🚀');
  console.log(''.padEnd(80, '='));

  try {
    await fs.access(CONFIG.targetFile);
    logger.log(`✅ Archivo objetivo: ${CONFIG.targetFile}`);

    const detectedResources = await detectCriticalResources();
    const preloadsHtml = generateUltraOptimizedPreloads(detectedResources);

    if (preloadsHtml === '') {
      logger.warn('🟡 No se detectaron recursos críticos');
      logger.warn('💡 Ejecuta: pnpm run build');
    } else {
      logger.log(`✅ HTML ultra-optimizado generado`);
    }

    await injectPreloads(CONFIG.targetFile, preloadsHtml);

    console.log('\n'.padEnd(80, '='));
    console.log('✅ ULTRA OPTIMIZACIÓN COMPLETADA ✅');
    console.log(''.padEnd(80, '='));
  } catch (error) {
    logger.error(`❌ ERROR FATAL en optimización de preloads: ${error.message}`);
    process.exit(1);
  }
}

{/* Ejecutar si es llamado directamente */}
if (process.argv[1] && process.argv[1].includes('PrecargaInteligente.js')) {
  console.log('🚀 Iniciando script de optimización...');
  runUltraPreloadOptimization();
}

export { runUltraPreloadOptimization, detectCriticalResources }; 