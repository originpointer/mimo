import { describe, it, expect } from 'vitest';
import { generateUUID, generateNanoId, isValidUUID, validateUUID } from '../../src/utils/uuid';

describe('UUID Utils', () => {
  describe('generateUUID', () => {
    it('should generate a valid UUID v4', () => {
      const uuid = generateUUID();

      expect(uuid).toBeDefined();
      expect(typeof uuid).toBe('string');
      expect(isValidUUID(uuid)).toBe(true);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();

      expect(uuid1).not.toBe(uuid2);
    });

    it('should generate UUIDs with correct format', () => {
      const uuid = generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate multiple unique UUIDs', () => {
      const uuids = new Set<string>();

      for (let i = 0; i < 1000; i++) {
        uuids.add(generateUUID());
      }

      expect(uuids.size).toBe(1000);
    });
  });

  describe('generateNanoId', () => {
    it('should generate a string ID', () => {
      const id = generateNanoId();

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should generate unique IDs', () => {
      const id1 = generateNanoId();
      const id2 = generateNanoId();

      expect(id1).not.toBe(id2);
    });

    it('should respect custom size parameter', () => {
      const id = generateNanoId(21);

      expect(id.length).toBe(21);
    });

    it('should use URL-safe characters by default', () => {
      const id = generateNanoId();
      const urlSafeRegex = /^[A-Za-z0-9_-]+$/;

      expect(id).toMatch(urlSafeRegex);
    });

    it('should generate multiple unique IDs', () => {
      const ids = new Set<string>();

      for (let i = 0; i < 1000; i++) {
        ids.add(generateNanoId());
      }

      expect(ids.size).toBe(1000);
    });
  });

  describe('isValidUUID', () => {
    it('should return true for valid UUID v4', () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
        '00000000-0000-4000-8000-000000000000',
        'ffffffff-ffff-4fff-bfff-ffffffffffff',
      ];

      validUUIDs.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(true);
      });
    });

    it('should return false for invalid UUIDs', () => {
      const invalidUUIDs = [
        '',
        'not-a-uuid',
        '550e8400-e29b-41d4-a716',
        '550e8400-e29b-41d4-a716-446655440000-extra',
        '550e8400-e29b-41d4-a716-44665544000g', // 'g' is not valid hex
        '550e8400-e29b-41d4-a716-44665544000', // too short
      ];

      invalidUUIDs.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(false);
      });
    });

    it('should return false for non-string input', () => {
      expect(isValidUUID(null as any)).toBe(false);
      expect(isValidUUID(undefined as any)).toBe(false);
      expect(isValidUUID(123 as any)).toBe(false);
      expect(isValidUUID({} as any)).toBe(false);
      expect(isValidUUID([] as any)).toBe(false);
    });
  });

  describe('validateUUID', () => {
    it('should return the UUID for valid input', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const result = validateUUID(validUUID);

      expect(result).toBe(validUUID);
    });

    it('should throw error for invalid UUID', () => {
      const invalidUUID = 'not-a-uuid';

      expect(() => validateUUID(invalidUUID)).toThrow();
    });

    it('should include error message in thrown error', () => {
      const invalidUUID = 'invalid';

      try {
        validateUUID(invalidUUID);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Invalid UUID');
      }
    });
  });

  describe('Integration Tests', () => {
    it('should validate generated UUIDs', () => {
      for (let i = 0; i < 100; i++) {
        const uuid = generateUUID();
        expect(isValidUUID(uuid)).toBe(true);
        expect(validateUUID(uuid)).toBe(uuid);
      }
    });

    it('should work with generated NanoIds', () => {
      for (let i = 0; i < 100; i++) {
        const id = generateNanoId();
        expect(id).toBeDefined();
        expect(id.length).toBeGreaterThan(0);
      }
    });
  });
});
