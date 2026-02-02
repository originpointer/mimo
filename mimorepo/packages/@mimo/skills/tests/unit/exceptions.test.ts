/**
 * Unit tests for exceptions.
 */

import { describe, it, expect } from 'vitest';
import {
  SkillException,
  SkillNotFoundError,
  SkillValidationError,
  SkillResourceNotFoundError,
  SkillResourceLoadError,
  SkillScriptNotFoundError,
  SkillScriptExecutionError
} from '../../src/exceptions.js';

describe('exceptions', () => {
  describe('SkillException', () => {
    it('should create base exception', () => {
      const error = new SkillException('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('SkillException');
    });
  });

  describe('SkillNotFoundError', () => {
    it('should create not found error', () => {
      const error = new SkillNotFoundError('my-skill');
      expect(error.message).toBe("Skill 'my-skill' not found");
      expect(error.name).toBe('SkillNotFoundError');
      expect(error instanceof SkillException).toBe(true);
    });
  });

  describe('SkillValidationError', () => {
    it('should create validation error', () => {
      const error = new SkillValidationError('Invalid name');
      expect(error.message).toBe('Invalid name');
      expect(error.name).toBe('SkillValidationError');
      expect(error instanceof SkillException).toBe(true);
    });
  });

  describe('SkillResourceNotFoundError', () => {
    it('should create resource not found error', () => {
      const error = new SkillResourceNotFoundError('schema.md', 'my-skill');
      expect(error.message).toContain('schema.md');
      expect(error.message).toContain('my-skill');
      expect(error.name).toBe('SkillResourceNotFoundError');
    });

    it('should create without skill name', () => {
      const error = new SkillResourceNotFoundError('schema.md');
      expect(error.message).toContain('schema.md');
      expect(error.name).toBe('SkillResourceNotFoundError');
    });
  });

  describe('SkillResourceLoadError', () => {
    it('should create load error with cause', () => {
      const cause = new Error('File not found');
      const error = new SkillResourceLoadError('schema.md', cause);
      expect(error.message).toContain('schema.md');
      expect(error.cause).toBe(cause);
      expect(error.name).toBe('SkillResourceLoadError');
    });
  });

  describe('SkillScriptNotFoundError', () => {
    it('should create script not found error', () => {
      const error = new SkillScriptNotFoundError('search.py', 'arxiv-search');
      expect(error.message).toContain('search.py');
      expect(error.name).toBe('SkillScriptNotFoundError');
    });
  });

  describe('SkillScriptExecutionError', () => {
    it('should create execution error with cause', () => {
      const cause = new Error('Timeout');
      const error = new SkillScriptExecutionError('search.py', cause);
      expect(error.message).toContain('search.py');
      expect(error.cause).toBe(cause);
      expect(error.name).toBe('SkillScriptExecutionError');
    });
  });
});
