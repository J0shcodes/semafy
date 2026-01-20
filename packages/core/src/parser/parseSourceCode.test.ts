import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseSourceCode } from './parseSourceCode';

describe('parseSourceCode', () => {
  // Mock console.error to avoid noise in test output
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Valid nested JSON', () => {
    it('should parse valid nested JSON with sources object', () => {
      const nestedJson = {
        sources: {
          'Contract.sol': {
            content: 'pragma solidity ^0.8.0; contract Test {}',
          },
        },
      };
      const input = `{${JSON.stringify(nestedJson)}}`;

      const result = parseSourceCode(input);

      expect(result).toEqual(nestedJson.sources);
    });

    it('should parse nested JSON with multiple source files', () => {
      const nestedJson = {
        sources: {
          'Contract.sol': { content: 'contract A {}' },
          'Library.sol': { content: 'library B {}' },
          'Interface.sol': { content: 'interface C {}' },
        },
      };
      const input = `{${JSON.stringify(nestedJson)}}`;

      const result = parseSourceCode(input);

      expect(result).toEqual(nestedJson.sources);
      expect(Object.keys(result)).toHaveLength(3);
    });

    it('should handle nested JSON with empty sources object', () => {
      const nestedJson = { sources: {} };
      const input = `{${JSON.stringify(nestedJson)}}`;

      const result = parseSourceCode(input);

      expect(result).toEqual({});
    });

    it('should handle nested JSON with additional metadata', () => {
      const nestedJson = {
        language: 'Solidity',
        sources: {
          'Contract.sol': { content: 'contract Test {}' },
        },
        settings: { optimizer: { enabled: true } },
      };
      const input = `{${JSON.stringify(nestedJson)}}`;

      const result = parseSourceCode(input);

      expect(result).toEqual(nestedJson.sources);
    });
  });

  describe('Invalid or malformed input', () => {
    it('should return empty string for malformed JSON', () => {
      const input = '{{invalid json}}';

      const result = parseSourceCode(input);

      expect(result).toBe('');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to parse nested source JSON',
      );
    });

    it('should return empty string when sources property is missing', () => {
      const nestedJson = { language: 'Solidity' };
      const input = `{${JSON.stringify(nestedJson)}}`;

      const result = parseSourceCode(input);

      expect(result).toBeUndefined();
    });

    it('should return empty string for empty string input', () => {
      const result = parseSourceCode('');

      expect(result).toBe('');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to parse nested source JSON',
      );
    });

    it('should return empty string for single curly brace', () => {
      const result = parseSourceCode('{');

      expect(result).toBe('');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to parse nested source JSON',
      );
    });

    it('should return empty string for incomplete nested structure', () => {
      const input = '{{';

      const result = parseSourceCode(input);

      expect(result).toBe('');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to parse nested source JSON',
      );
    });

    it('should handle JSON with unescaped characters', () => {
      const input = '{{sources: {invalid}}}';

      const result = parseSourceCode(input);

      expect(result).toBe('');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to parse nested source JSON',
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle sources property with null value', () => {
      const nestedJson = { sources: null };
      const input = `{${JSON.stringify(nestedJson)}}`;

      const result = parseSourceCode(input);

      expect(result).toBeNull();
    });

    it('should handle sources property with string value', () => {
      const nestedJson = { sources: 'string instead of object' };
      const input = `{${JSON.stringify(nestedJson)}}`;

      const result = parseSourceCode(input);

      expect(result).toBe('string instead of object');
    });

    it('should handle deeply nested source structure', () => {
      const nestedJson = {
        sources: {
          'contracts/utils/Contract.sol': {
            content: 'pragma solidity ^0.8.0;',
            metadata: { compiler: '0.8.20' },
          },
        },
      };
      const input = `{${JSON.stringify(nestedJson)}}`;

      const result = parseSourceCode(input);

      expect(result).toEqual(nestedJson.sources);
      expect(result['contracts/utils/Contract.sol']).toBeDefined();
    });

    it('should handle unicode characters in source code', () => {
      const nestedJson = {
        sources: {
          'Contract.sol': { content: '// Comment with émojis 🚀' },
        },
      };
      const input = `{${JSON.stringify(nestedJson)}}`;

      const result = parseSourceCode(input);

      expect(result).toEqual(nestedJson.sources);
    });
  });
});
