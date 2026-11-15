/**
 * Dynamic Pill SVG Generator & Multilingual Descriptors
 * Draws friendly, high-contrast SVG representations of pills based on
 * shape, color, size, and markings.
 * Generates natural Devanagari descriptions for Marathi and Hindi, and English.
 */

export const PILL_SHAPES = [
  { id: 'round', labelEn: 'Round', labelMr: 'गोल', labelHi: 'गोल' },
  { id: 'oblong', labelEn: 'Oblong', labelMr: 'लांबट', labelHi: 'लंबा' },
  { id: 'capsule', labelEn: 'Capsule', labelMr: 'कॅप्सूल', labelHi: 'कैप्सूल' },
  { id: 'oval', labelEn: 'Oval', labelMr: 'अंडाकृती', labelHi: 'अंडाकार' }
];

export const PILL_COLORS = [
  { id: 'pink', nameEn: 'Pink', nameMr: 'गुलाबी', nameHi: 'गुलाबी', hex: '#F472B6', border: '#DB2777', text: '#9D174D' },
  { id: 'white', nameEn: 'White', nameMr: 'पांढरी', nameHi: 'सफेद', hex: '#FFFFFF', border: '#CBD5E1', text: '#334155' },
  { id: 'yellow', nameEn: 'Yellow', nameMr: 'पिवळी', nameHi: 'पीली', hex: '#FACC15', border: '#CA8A04', text: '#854D0E' },
  { id: 'orange', nameEn: 'Orange', nameMr: 'नारंगी', nameHi: 'नारंगी', hex: '#FB923C', border: '#EA580C', text: '#9A3412' },
  { id: 'blue', nameEn: 'Blue', nameMr: 'निळी', nameHi: 'नीली', hex: '#60A5FA', border: '#2563EB', text: '#1E40AF' },
  { id: 'green', nameEn: 'Green', nameMr: 'हिरवी', nameHi: 'हरी', hex: '#4ADE80', border: '#16A34A', text: '#166534' }
];

export const PILL_SIZES = [
  { id: 'small', labelEn: 'Small', labelMr: 'लहान', labelHi: 'छोटी', scale: 0.8 },
  { id: 'medium', labelEn: 'Medium', labelMr: 'मध्यम', labelHi: 'मध्यम', scale: 1.0 },
  { id: 'large', labelEn: 'Large', labelMr: 'मोठी', labelHi: 'बड़ी', scale: 1.2 }
];

/**
 * Generate human-readable pill description in specified language (mr, hi, en)
 * Example:
 * Marathi: "गुलाबी गोल गोळी, बीपी साठी, जेवणानंतर"
 * Hindi: "गुलाबी गोल गोली, बीपी के लिए, खाने के बाद"
 * English: "Pink round pill, for BP, after food"
 */
export function getLocalizedPillDescription(med, lang = 'mr') {
  const app = med.appearance || {};
  const colorObj = PILL_COLORS.find(c => c.hex.toLowerCase() === (app.color || '').toLowerCase() || c.nameEn.toLowerCase() === (app.colorName || '').toLowerCase()) || PILL_COLORS[0];
  const shapeObj = PILL_SHAPES.find(s => s.id === app.shape) || PILL_SHAPES[0];
  const label = med.label || '';
  const afterFood = med.afterFood;

  if (lang === 'mr') {
    const color = colorObj.nameMr;
    const shape = shapeObj.labelMr;
    let desc = `${color} ${shape} गोळी`;
    if (label) desc += `, ${label} साठी`;
    if (afterFood) desc += `, जेवणानंतर`;
    return desc;
  }

  if (lang === 'hi') {
    const color = colorObj.nameHi;
    const shape = shapeObj.labelHi;
    let desc = `${color} ${shape} गोली`;
    if (label) desc += `, ${label} के लिए`;
    if (afterFood) desc += `, खाने के बाद`;
    return desc;
  }

  // English
  const color = colorObj.nameEn;
  const shape = shapeObj.labelEn.toLowerCase();
  let desc = `${color} ${shape} pill`;
  if (label) desc += `, for ${label.replace(/^for\s+/i, '')}`;
  if (afterFood) desc += `, after food`;
  return desc;
}

/**
 * Generate friendly SVG markup for a pill
 */
export function generatePillSvg(appearance = {}, width = 80, height = 80) {
  const shape = appearance.shape || 'round';
  const colorHex = appearance.color || '#F472B6';
  const size = appearance.size || 'medium';
  const markings = appearance.markings || '';

  const sizeObj = PILL_SIZES.find(s => s.id === size) || PILL_SIZES[1];
  const scale = sizeObj.scale;

  const isWhite = colorHex.toLowerCase() === '#ffffff' || colorHex.toLowerCase() === '#fff';
  const strokeColor = isWhite ? '#94A3B8' : 'rgba(0,0,0,0.22)';
  const textColor = isWhite ? '#334155' : '#1E293B';
  const shadowColor = 'rgba(0,0,0,0.1)';

  let pillShapeContent = '';

  if (shape === 'round') {
    const r = 24 * scale;
    pillShapeContent = `
      <defs>
        <radialGradient id="grad_round_${shape}_${colorHex.replace('#','')}" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.5"/>
          <stop offset="45%" stop-color="${colorHex}"/>
          <stop offset="100%" stop-color="${colorHex}" stop-opacity="0.88"/>
        </radialGradient>
        <filter id="shadow_${shape}" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="3" stdDeviation="3.5" flood-color="${shadowColor}"/>
        </filter>
      </defs>
      <circle cx="36" cy="36" r="${r}" fill="url(#grad_round_${shape}_${colorHex.replace('#','')})" stroke="${strokeColor}" stroke-width="2.5" filter="url(#shadow_${shape})" />
      <line x1="36" y1="${36 - r + 5}" x2="36" y2="${36 + r - 5}" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-opacity="0.45"/>
      ${markings ? `<text x="36" y="${36 + 4 * scale}" text-anchor="middle" font-size="${10 * scale}" font-family="Nunito, sans-serif" font-weight="800" fill="${textColor}" letter-spacing="0.5">${markings}</text>` : ''}
    `;
  } else if (shape === 'oblong') {
    const w = 48 * scale;
    const h = 24 * scale;
    const x = 36 - w / 2;
    const y = 36 - h / 2;
    const rx = h / 2;
    pillShapeContent = `
      <defs>
        <linearGradient id="grad_oblong_${colorHex.replace('#','')}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.5"/>
          <stop offset="50%" stop-color="${colorHex}"/>
          <stop offset="100%" stop-color="${colorHex}" stop-opacity="0.88"/>
        </linearGradient>
        <filter id="shadow_oblong" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="3" stdDeviation="3.5" flood-color="${shadowColor}"/>
        </filter>
      </defs>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="url(#grad_oblong_${colorHex.replace('#','')})" stroke="${strokeColor}" stroke-width="2.5" filter="url(#shadow_oblong)"/>
      <line x1="36" y1="${y + 3}" x2="36" y2="${y + h - 3}" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-opacity="0.45"/>
      ${markings ? `<text x="36" y="${36 + 4 * scale}" text-anchor="middle" font-size="${9 * scale}" font-family="Nunito, sans-serif" font-weight="800" fill="${textColor}" letter-spacing="0.5">${markings}</text>` : ''}
    `;
  } else if (shape === 'capsule') {
    const w = 48 * scale;
    const h = 22 * scale;
    const x = 36 - w / 2;
    const y = 36 - h / 2;
    const rx = h / 2;
    const capColor2 = isWhite ? '#CBD5E1' : '#FFFFFF';
    pillShapeContent = `
      <defs>
        <clipPath id="clip_capsule_${colorHex.replace('#','')}">
          <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/>
        </clipPath>
        <filter id="shadow_capsule" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="3" stdDeviation="3.5" flood-color="${shadowColor}"/>
        </filter>
      </defs>
      <g filter="url(#shadow_capsule)">
        <rect x="${x}" y="${y}" width="${w / 2}" height="${h}" fill="${colorHex}" clip-path="url(#clip_capsule_${colorHex.replace('#','')})"/>
        <rect x="${36}" y="${y}" width="${w / 2}" height="${h}" fill="${capColor2}" clip-path="url(#clip_capsule_${colorHex.replace('#','')})"/>
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="none" stroke="${strokeColor}" stroke-width="2.5"/>
        <line x1="36" y1="${y}" x2="36" y2="${y + h}" stroke="${strokeColor}" stroke-width="2.5"/>
      </g>
      ${markings ? `<text x="${x + w * 0.25}" y="${36 + 4 * scale}" text-anchor="middle" font-size="${8 * scale}" font-family="Nunito, sans-serif" font-weight="800" fill="#FFFFFF">${markings}</text>` : ''}
    `;
  } else {
    // Oval
    const rx = 24 * scale;
    const ry = 16 * scale;
    pillShapeContent = `
      <defs>
        <radialGradient id="grad_oval_${colorHex.replace('#','')}" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.5"/>
          <stop offset="50%" stop-color="${colorHex}"/>
          <stop offset="100%" stop-color="${colorHex}" stop-opacity="0.88"/>
        </radialGradient>
        <filter id="shadow_oval" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="3" stdDeviation="3.5" flood-color="${shadowColor}"/>
        </filter>
      </defs>
      <ellipse cx="36" cy="36" rx="${rx}" ry="${ry}" fill="url(#grad_oval_${colorHex.replace('#','')})" stroke="${strokeColor}" stroke-width="2.5" filter="url(#shadow_oval)"/>
      <line x1="36" y1="${36 - ry + 4}" x2="36" y2="${36 + ry - 4}" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-opacity="0.45"/>
      ${markings ? `<text x="36" y="${36 + 4 * scale}" text-anchor="middle" font-size="${9 * scale}" font-family="Nunito, sans-serif" font-weight="800" fill="${textColor}">${markings}</text>` : ''}
    `;
  }

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" class="pill-svg-graphic" aria-hidden="true">
      ${pillShapeContent}
    </svg>
  `;
}
