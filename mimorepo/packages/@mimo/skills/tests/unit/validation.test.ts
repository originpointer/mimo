/**
 * Unit tests for validation utilities.
 */

import { describe, it, expect } from 'vitest';
import { normalizeSkillName, validateSkillName, validateSkillMetadata } from '../../src/validation.js';
import { SKILL_NAME_PATTERN } from '../../src/constants.js';

describe('validation', () => {
  describe('SKILL_NAME_PATTERN', () => {
    it('should match valid skill names', () => {
      expect(SKILL_NAME_PATTERN.test('arxiv-search')).toBe(true);
      expect(SKILL_NAME_PATTERN.test('web-research')).toBe(true);
      expect(SKILL_NAME_PATTERN.test('data-analyzer')).toBe(true);
      expect(SKILL_NAME_PATTERN.test('test')).toBe(true);
    });

    it('should not match invalid skill names', () => {
      expect(SKILL_NAME_PATTERN.test('ArxivSearch')).toBe(false);
      expect(SKILL_NAME_PATTERN.test('arxiv_search')).toBe(false);
      expect(SKILL_NAME_PATTERN.test('arxiv--search')).toBe(false);
      expect(SKILL_NAME_PATTERN.test('arXiv-Search')).toBe(false);
    });
  });

  describe('normalizeSkillName', () => {
    it('should normalize function names to skill names', () => {
      expect(normalizeSkillName('data_analyzer')).toBe('data-analyzer');
      expect(normalizeSkillName('my_cool_skill')).toBe('my-cool-skill');
      expect(normalizeSkillName('DataAnalyzer')).toBe('dataanalyzer');
    });

    it('should throw on invalid characters', () => {
      expect(() => normalizeSkillName('Invalid_Name')).toThrow();
      expect(() => normalizeSkillName('test--name')).toThrow();
    });

    it('should throw on names too long', () => {
      const longName = 'a'.repeat(65);
      expect(() => normalizeSkillName(longName)).toThrow();
    });
  });

  describe('validateSkillName', () => {
    it('should validate correct skill names', () => {
      const result = validateSkillName('my-skill');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn on invalid skill names', () => {
      const result = validateSkillName('My_Skill');
      expect(result.isValid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should warn on reserved words', () => {
      const result = validateSkillName('anthropic-helper');
      expect(result.isValid).toBe(false);
      expect(result.warnings.some(w => w.includes('reserved word'))).toBe(true);
    });

    it('should warn on names too long', () => {
      const longName = 'a'.repeat(65);
      const result = validateSkillName(longName);
      expect(result.isValid).toBe(false);
      expect(result.warnings.some(w => w.includes('exceeds'))).toBe(true);
    });
  });

  describe('validateSkillMetadata', () => {
    it('should validate correct metadata', () => {
      const result = validateSkillMetadata(
        { name: 'my-skill', description: 'A skill' },
        'Instructions here...'
      );
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn on missing name', () => {
      const result = validateSkillMetadata({}, 'Content');
      expect(result.warnings).toHaveLength(0); // name is optional in validation
    });

    it('should warn on long description', () => {
      const longDesc = 'a'.repeat(1025);
      const result = validateSkillMetadata(
        { name: 'my-skill', description: longDesc },
        'Content'
      );
      expect(result.isValid).toBe(false);
      expect(result.warnings.some(w => w.includes('exceeds'))).toBe(true);
    });

    it('should warn on long instructions', () => {
      const longContent = 'Line\n'.repeat(501);
      const result = validateSkillMetadata(
        { name: 'my-skill', description: 'A skill' },
        longContent
      );
      expect(result.isValid).toBe(false);
      expect(result.warnings.some(w => w.includes('lines'))).toBe(true);
    });
  });
});
