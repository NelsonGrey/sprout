import { describe, expect, it } from 'vitest';
import { isEarlyReaderPresentation } from './studentPresentation';

describe('isEarlyReaderPresentation', () => {
  it('is true for Pre-K/K and grades 1-2', () => {
    expect(isEarlyReaderPresentation({ gradeLevel: 'K' })).toBe(true);
    expect(isEarlyReaderPresentation({ gradeLevel: '1' })).toBe(true);
    expect(isEarlyReaderPresentation({ gradeLevel: '2' })).toBe(true);
  });

  it('is false for grades 3 and up', () => {
    expect(isEarlyReaderPresentation({ gradeLevel: '3' })).toBe(false);
    expect(isEarlyReaderPresentation({ gradeLevel: '6' })).toBe(false);
  });

  it('fails closed to the standard (non-simplified) presentation when the grade level is unresolvable', () => {
    expect(isEarlyReaderPresentation({ gradeLevel: undefined })).toBe(false);
    expect(isEarlyReaderPresentation({ gradeLevel: '9' })).toBe(false);
  });
});
