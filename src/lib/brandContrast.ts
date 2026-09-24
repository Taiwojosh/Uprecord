export function brandContrast(hex: string): '#000000' | '#ffffff' {
  const raw = hex.replace('#', '');
  const normalized = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw;
  const channels = [0, 2, 4].map(i => parseInt(normalized.slice(i, i + 2), 16) / 255)
    .map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance > 0.179 ? '#000000' : '#ffffff';
}
