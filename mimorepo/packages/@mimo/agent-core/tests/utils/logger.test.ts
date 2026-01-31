import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, LogLevel, createLogger, setGlobalLogLevel, resetGlobalLogLevel } from '../../src/utils/logger';

describe('Logger', () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    resetGlobalLogLevel();
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create logger with default context', () => {
      const logger = new Logger();

      expect(logger).toBeInstanceOf(Logger);
    });

    it('should create logger with custom context', () => {
      const logger = new Logger('TestContext');

      expect(logger).toBeInstanceOf(Logger);
    });

    it('should create logger with custom log level', () => {
      const logger = new Logger('TestContext', LogLevel.WARN);

      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('Logging Methods', () => {
    it('should log debug message', () => {
      const logger = new Logger('Test');
      logger.debug('Debug message');

      expect(consoleSpy.debug).toHaveBeenCalled();
    });

    it('should log info message', () => {
      const logger = new Logger('Test');
      logger.info('Info message');

      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('should log warning message', () => {
      const logger = new Logger('Test');
      logger.warn('Warning message');

      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('should log error message', () => {
      const logger = new Logger('Test');
      logger.error('Error message');

      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should include context in log message', () => {
      const logger = new Logger('MyContext');
      logger.info('Test message');

      const call = consoleSpy.info.mock.calls[0];
      const message = call[0];

      expect(message).toContain('MyContext');
    });
  });

  describe('Log Levels', () => {
    it('should respect log level threshold', () => {
      const logger = new Logger('Test', LogLevel.WARN);

      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warning');
      logger.error('Error');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should not log below ERROR level', () => {
      const logger = new Logger('Test', LogLevel.ERROR);

      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warning');
      logger.error('Error');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should log all messages at DEBUG level', () => {
      const logger = new Logger('Test', LogLevel.DEBUG);

      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warning');
      logger.error('Error');

      expect(consoleSpy.debug).toHaveBeenCalled();
      expect(consoleSpy.info).toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should allow changing log level dynamically', () => {
      const logger = new Logger('Test', LogLevel.ERROR);

      logger.info('Should not log');

      logger.setLevel(LogLevel.INFO);
      logger.info('Should log');

      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
    });
  });

  describe('Extra Data', () => {
    it('should log with extra data', () => {
      const logger = new Logger('Test');
      logger.info('Message', { userId: '123', action: 'test' });

      const call = consoleSpy.info.mock.calls[0];

      expect(call.length).toBeGreaterThan(1);
    });

    it('should handle error objects', () => {
      const logger = new Logger('Test');
      const error = new Error('Test error');
      logger.error('Error occurred', error);

      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should handle null and undefined extra data', () => {
      const logger = new Logger('Test');

      expect(() => logger.info('Message', null)).not.toThrow();
      expect(() => logger.info('Message', undefined)).not.toThrow();
    });
  });

  describe('createLogger', () => {
    it('should create logger with context', () => {
      const logger = createLogger('MyContext');

      expect(logger).toBeInstanceOf(Logger);
    });

    it('should create logger with context and level', () => {
      const logger = createLogger('MyContext', LogLevel.WARN);

      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('setGlobalLogLevel', () => {
    it('should affect all loggers', () => {
      const logger1 = new Logger('Test1');
      const logger2 = new Logger('Test2');

      setGlobalLogLevel(LogLevel.ERROR);

      logger1.info('Should not log');
      logger2.info('Should not log');

      expect(consoleSpy.info).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty context', () => {
      const logger = new Logger('');
      logger.info('Test');

      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('should handle special characters in context', () => {
      const logger = new Logger('Context/With\\Special:Chars');
      logger.info('Test');

      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('should handle very long messages', () => {
      const logger = new Logger('Test');
      const longMessage = 'x'.repeat(10000);

      expect(() => logger.info(longMessage)).not.toThrow();
    });

    it('should handle objects with circular references', () => {
      const logger = new Logger('Test');
      const obj: any = { a: 1 };
      obj.self = obj;

      expect(() => logger.info('Message', obj)).not.toThrow();
    });
  });
});
