import { describe, it, expect } from 'vitest';
import { generateUuidV4, isValidUuidV4 } from '../../utils/uuid';

describe('UUID Utilities', () => {
  describe('generateUuidV4', () => {
    it('should generate a valid UUID v4', () => {
      const uuid = generateUuidV4();
      expect(uuid).toBeTruthy();
      expect(typeof uuid).toBe('string');
      expect(isValidUuidV4(uuid)).toBe(true);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUuidV4();
      const uuid2 = generateUuidV4();
      expect(uuid1).not.toBe(uuid2);
    });

    it('should generate UUIDs with correct format', () => {
      const uuid = generateUuidV4();
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      // where y is one of [8, 9, a, b]
      const parts = uuid.split('-');
      expect(parts).toHaveLength(5);
      expect(parts[0]).toHaveLength(8);
      expect(parts[1]).toHaveLength(4);
      expect(parts[2]).toHaveLength(4);
      expect(parts[2][0]).toBe('4'); // Version 4
      expect(parts[3]).toHaveLength(4);
      expect(['8', '9', 'a', 'b']).toContain(parts[3][0].toLowerCase()); // Variant
      expect(parts[4]).toHaveLength(12);
    });

    it('should generate 100 unique UUIDs without collisions', () => {
      const uuids = new Set();
      for (let i = 0; i < 100; i++) {
        uuids.add(generateUuidV4());
      }
      expect(uuids.size).toBe(100);
    });
  });

  describe('isValidUuidV4', () => {
    it('should validate correct UUID v4', () => {
      const validUuids = [
        '550e8400-e29b-41d4-a716-446655440000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '7d444840-9dc0-11d1-b245-5ffdce74fad2'.replace('11d1', '41d1') // Fix to v4
      ];
      
      validUuids.forEach(uuid => {
        expect(isValidUuidV4(uuid)).toBe(true);
      });
    });

    it('should reject invalid UUID formats', () => {
      const invalidUuids = [
        '', // empty
        'not-a-uuid',
        '550e8400-e29b-11d4-a716-446655440000', // wrong version (1)
        '550e8400-e29b-21d4-a716-446655440000', // wrong version (2)
        '550e8400-e29b-31d4-a716-446655440000', // wrong version (3)
        '550e8400e29b41d4a716446655440000', // missing dashes
        '550e8400-e29b-41d4-c716-446655440000', // wrong variant
        '550e8400-e29b-41d4-d716-446655440000', // wrong variant
        '550e8400-e29b-41d4-e716-446655440000', // wrong variant
        '550e8400-e29b-41d4-f716-446655440000'  // wrong variant
      ];
      
      invalidUuids.forEach(uuid => {
        expect(isValidUuidV4(uuid)).toBe(false);
      });
    });

    it('should validate generated UUIDs', () => {
      for (let i = 0; i < 10; i++) {
        const uuid = generateUuidV4();
        expect(isValidUuidV4(uuid)).toBe(true);
      }
    });
  });
});
