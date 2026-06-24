const fs = require('fs');
const path = require('path');

// Resolve absolute paths
const COLOR_TOKENS_PATH = path.join(__dirname, '../tokens/color-tokens.json');
const TYPOGRAPHY_TOKENS_PATH = path.join(__dirname, '../tokens/design-tokens.tokens.json');
const OUTPUT_CSS_PATH = path.join(__dirname, '../tokens/variables.css');

// Helper to convert camelCase to kebab-case
function camelToKebab(str) {
  return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}

// Helper to convert spaces to hyphens
function spacesToHyphens(str) {
  return str.toLowerCase().replace(/\s+/g, '-');
}

// Helper to recursively resolve references like {color.key.primary}
function resolveReference(value, rootObj) {
  let depth = 0;
  const maxDepth = 10;
  
  while (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
    if (depth++ > maxDepth) {
      throw new Error(`Circular reference detected: ${value}`);
    }
    const pathStr = value.slice(1, -1); // Remove { and }
    const keys = pathStr.split('.');
    
    let current = rootObj;
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        throw new Error(`Failed to resolve token reference: "${value}" (broken at key "${key}")`);
      }
    }
    value = current;
  }
  return value;
}

function run() {
  console.log('Starting token conversion...');

  // 1. Read input files
  if (!fs.existsSync(COLOR_TOKENS_PATH)) {
    console.error(`Color tokens file not found at ${COLOR_TOKENS_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(TYPOGRAPHY_TOKENS_PATH)) {
    console.error(`Typography tokens file not found at ${TYPOGRAPHY_TOKENS_PATH}`);
    process.exit(1);
  }

  const colorTokensRaw = JSON.parse(fs.readFileSync(COLOR_TOKENS_PATH, 'utf8'));
  const typoTokensRaw = JSON.parse(fs.readFileSync(TYPOGRAPHY_TOKENS_PATH, 'utf8'));

  // Inject fallback error palette if missing
  if (colorTokensRaw.color && colorTokensRaw.color.palette && !colorTokensRaw.color.palette.error) {
    console.warn('Warning: "color.palette.error" is missing from color tokens. Injecting fallback red error palette.');
    colorTokensRaw.color.palette.error = {
      "0": "hsl(0, 0%, 0%)",
      "10": "hsl(359, 100%, 15%)",
      "20": "hsl(358, 100%, 20%)",
      "30": "hsl(358, 100%, 30%)",
      "40": "hsl(358, 100%, 40%)",
      "50": "hsl(358, 100%, 50%)",
      "60": "hsl(359, 100%, 60%)",
      "70": "hsl(0, 100%, 70%)",
      "80": "hsl(0, 100%, 80%)",
      "87": "hsl(0, 100%, 87%)",
      "90": "hsl(0, 100%, 90%)",
      "92": "hsl(0, 100%, 92%)",
      "94": "hsl(0, 100%, 94%)",
      "95": "hsl(0, 100%, 95%)",
      "96": "hsl(0, 100%, 96%)",
      "98": "hsl(0, 100%, 98%)",
      "99": "hsl(0, 100%, 99%)",
      "100": "hsl(0, 0%, 100%)"
    };
  }

  // Inject fallback neutral keys if missing (Material Design 3 dark theme elevated surfaces)
  if (colorTokensRaw.color && colorTokensRaw.color.palette && colorTokensRaw.color.palette.neutral) {
    const neutral = colorTokensRaw.color.palette.neutral;
    const neutralFallbacks = {
      "4": "hsl(220, 10%, 4%)",
      "6": "hsl(220, 10%, 6%)",
      "12": "hsl(225, 8%, 12%)",
      "17": "hsl(225, 7%, 17%)",
      "22": "hsl(227, 6%, 22%)",
      "24": "hsl(227, 6%, 24%)"
    };
    for (const [key, val] of Object.entries(neutralFallbacks)) {
      if (!(key in neutral)) {
        console.warn(`Warning: "color.palette.neutral.${key}" is missing. Injecting fallback: ${val}`);
        neutral[key] = val;
      }
    }
  }

  let cssContent = `/**\n * DESIGN SYSTEM VARIABLES\n * Generated automatically from JSON design tokens.\n */\n\n:root {\n`;

  // 2. Process Typography Tokens
  cssContent += `  /* ==========================================================================\n`;
  cssContent += `     TYPOGRAPHY TOKENS\n`;
  cssContent += `     ========================================================================== */\n`;

  const fontSection = typoTokensRaw.font;
  if (!fontSection) {
    console.error('No "font" section found in typography tokens file.');
    process.exit(1);
  }

  for (const [fontKey, fontData] of Object.entries(fontSection)) {
    const formattedFontKey = spacesToHyphens(fontKey);
    const value = fontData.value;
    if (value) {
      cssContent += `\n  /* ${fontKey} */\n`;
      
      if (value.fontFamily) {
        // Wrap family in quotes if it contains spaces or is a specific font
        const family = value.fontFamily.includes(' ') ? `"${value.fontFamily}"` : value.fontFamily;
        cssContent += `  --font-${formattedFontKey}-family: ${family}, sans-serif;\n`;
      }
      if (value.fontSize !== undefined) {
        cssContent += `  --font-${formattedFontKey}-size: ${value.fontSize}px;\n`;
      }
      if (value.fontWeight !== undefined) {
        cssContent += `  --font-${formattedFontKey}-weight: ${value.fontWeight};\n`;
      }
      if (value.lineHeight !== undefined) {
        cssContent += `  --font-${formattedFontKey}-line-height: ${value.lineHeight}px;\n`;
      }
      if (value.letterSpacing !== undefined) {
        cssContent += `  --font-${formattedFontKey}-letter-spacing: ${value.letterSpacing}px;\n`;
      }
      if (value.fontStyle) {
        cssContent += `  --font-${formattedFontKey}-style: ${value.fontStyle};\n`;
      }
      if (value.textDecoration) {
        cssContent += `  --font-${formattedFontKey}-text-decoration: ${value.textDecoration};\n`;
      }
    }
  }

  // 3. Process Color Roles
  const colorRoles = colorTokensRaw.color?.role;
  if (!colorRoles) {
    console.error('No "color.role" section found in color tokens file.');
    process.exit(1);
  }

  // Generate Light Theme Color Roles under :root
  cssContent += `\n  /* ==========================================================================\n`;
  cssContent += `     COLOR ROLES - LIGHT THEME (DEFAULT)\n`;
  cssContent += `     ========================================================================== */\n`;

  const lightRoles = colorRoles.light;
  for (const [roleKey, rawValue] of Object.entries(lightRoles)) {
    const resolvedValue = resolveReference(rawValue, colorTokensRaw);
    const cssVarName = `--color-${camelToKebab(roleKey)}`;
    cssContent += `  ${cssVarName}: ${resolvedValue};\n`;
  }

  cssContent += `}\n`;

  // Generate Dark Theme Color Roles
  const darkRoles = colorRoles.dark;
  if (darkRoles) {
    let darkThemeVariables = '';
    for (const [roleKey, rawValue] of Object.entries(darkRoles)) {
      const resolvedValue = resolveReference(rawValue, colorTokensRaw);
      const cssVarName = `--color-${camelToKebab(roleKey)}`;
      darkThemeVariables += `  ${cssVarName}: ${resolvedValue};\n`;
    }

    // Media query block
    cssContent += `\n/* Dark Theme support (system preferred) */\n@media (prefers-color-scheme: dark) {\n  :root {\n${darkThemeVariables}  }\n}\n`;

    // Class based block (for manual theme toggling)
    cssContent += `\n/* Dark Theme support (class-based) */\n.dark {\n${darkThemeVariables}}\n`;
  }

  // 4. Write to file
  fs.writeFileSync(OUTPUT_CSS_PATH, cssContent, 'utf8');
  console.log(`Successfully generated CSS variables at: ${OUTPUT_CSS_PATH}`);
}

run();
