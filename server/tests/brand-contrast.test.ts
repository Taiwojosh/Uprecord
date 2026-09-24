import { expect, it } from 'vitest';
import { brandContrast } from '../../src/lib/brandContrast';
it('keeps school buttons legible for light and dark color choices', () => {
  expect(brandContrast('#FFD700')).toBe('#000000');
  expect(brandContrast('#fff')).toBe('#000000');
  expect(brandContrast('#111827')).toBe('#ffffff');
  expect(brandContrast('#000')).toBe('#ffffff');
});
