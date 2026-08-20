import { describe, expect, it } from 'vitest';
import { gradeLevelToBand } from './gradeBand';

describe('gradeLevelToBand', () => {
  it('maps kindergarten variants', () => {
    expect(gradeLevelToBand('K')).toBe('Pre-K–K');
    expect(gradeLevelToBand('Pre-K')).toBe('Pre-K–K');
    expect(gradeLevelToBand('kindergarten')).toBe('Pre-K–K');
  });

  it('maps numeric grades to their band', () => {
    expect(gradeLevelToBand('1')).toBe('Grades 1–2');
    expect(gradeLevelToBand('2')).toBe('Grades 1–2');
    expect(gradeLevelToBand('3')).toBe('Grades 3–4');
    expect(gradeLevelToBand('4')).toBe('Grades 3–4');
    expect(gradeLevelToBand('5')).toBe('Grades 5–6');
    expect(gradeLevelToBand('6')).toBe('Grades 5–6');
  });

  it('accepts a "Grade N" prefix', () => {
    expect(gradeLevelToBand('Grade 3')).toBe('Grades 3–4');
  });

  it('fails closed to undefined for anything unrecognized, empty, or absent', () => {
    expect(gradeLevelToBand('7')).toBeUndefined();
    expect(gradeLevelToBand('middle school')).toBeUndefined();
    expect(gradeLevelToBand('')).toBeUndefined();
    expect(gradeLevelToBand(undefined)).toBeUndefined();
  });
});
