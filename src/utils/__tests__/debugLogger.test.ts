/**
 * Tests for Debug Logger Utility
 *
 * Validates:
 * - Module-specific logging control
 * - Log level filtering
 * - Runtime configuration
 * - Console method delegation
 * - Development mode behavior
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createLogger,
  setDebugModules,
  enableAllDebug,
  disableAllDebug,
  setMinLogLevel,
  getDebugConfig,
} from '../debugLogger';

describe('Debug Logger Utility', () => {
  beforeEach(() => {
    // Reset to default state
    enableAllDebug();
    setMinLogLevel('debug');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Logger Creation', () => {
    it('should create logger for a module', () => {
      const logger = createLogger('TestModule');

      expect(logger).toBeDefined();
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should return logger with all methods', () => {
      const logger = createLogger('MyModule');

      const methods = ['debug', 'info', 'warn', 'error'];
      methods.forEach((method) => {
        expect(method in logger).toBe(true);
        expect(typeof logger[method as keyof typeof logger]).toBe('function');
      });
    });

    it('should allow creating multiple loggers for different modules', () => {
      const logger1 = createLogger('Module1');
      const logger2 = createLogger('Module2');
      const logger3 = createLogger('Module3');

      expect(logger1).not.toBe(logger2);
      expect(logger2).not.toBe(logger3);
      expect(logger1).not.toBe(logger3);
    });
  });

  describe('Log Methods', () => {
    it('debug logger should call console.log with module name prefix', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
      setDebugModules(['TestModule']);
      const logger = createLogger('TestModule');

      logger.debug('test message', { key: 'value' });

      expect(consoleSpy).toHaveBeenCalledWith('[TestModule]', 'test message', {
        key: 'value',
      });
      consoleSpy.mockRestore();
    });

    it('info logger should call console.info with module name prefix', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation();
      setDebugModules(['TestModule']);
      const logger = createLogger('TestModule');

      logger.info('info message');

      expect(consoleSpy).toHaveBeenCalledWith('[TestModule]', 'info message');
      consoleSpy.mockRestore();
    });

    it('warn logger should call console.warn with module name prefix', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();
      setDebugModules(['TestModule']);
      const logger = createLogger('TestModule');

      logger.warn('warning message');

      expect(consoleSpy).toHaveBeenCalledWith('[TestModule]', 'warning message');
      consoleSpy.mockRestore();
    });

    it('error logger should call console.error with module name prefix', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();
      const logger = createLogger('TestModule');

      logger.error('error message');

      expect(consoleSpy).toHaveBeenCalledWith('[TestModule]', 'error message');
      consoleSpy.mockRestore();
    });

    it('should support multiple arguments in debug', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
      setDebugModules(['TestModule']);
      const logger = createLogger('TestModule');

      logger.debug('msg1', 'msg2', { obj: 'value' });

      expect(consoleSpy).toHaveBeenCalledWith('[TestModule]', 'msg1', 'msg2', {
        obj: 'value',
      });
      consoleSpy.mockRestore();
    });
  });

  describe('Module-Specific Logging Control', () => {
    it('should only log for enabled modules', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      setDebugModules(['Module1', 'Module2']);

      const logger1 = createLogger('Module1');
      const logger3 = createLogger('Module3');

      logger1.debug('should log');
      logger3.debug('should not log');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      consoleSpy.mockRestore();
    });

    it('should not log for disabled modules', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      setDebugModules([]);

      const logger = createLogger('AnyModule');
      logger.debug('should not log');

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should allow setting debug modules at runtime', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
      const logger1 = createLogger('Module1');
      const logger2 = createLogger('Module2');

      setDebugModules(['Module1']);
      logger1.debug('log this');
      logger2.debug('not this');

      expect(consoleSpy).toHaveBeenCalledTimes(1);

      setDebugModules(['Module2']);
      consoleSpy.mockClear();
      logger1.debug('not this');
      logger2.debug('log this');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      consoleSpy.mockRestore();
    });
  });

  describe('Debug Module Management', () => {
    it('should enable all debug modules', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      enableAllDebug();

      const logger1 = createLogger('TypewriterLine');
      const logger2 = createLogger('TerminalInterface');
      const logger3 = createLogger('ResponseTracking');
      const logger4 = createLogger('Animation');

      logger1.debug('1');
      logger2.debug('2');
      logger3.debug('3');
      logger4.debug('4');

      expect(consoleSpy).toHaveBeenCalledTimes(4);
      consoleSpy.mockRestore();
    });

    it('should disable all debug modules', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      disableAllDebug();

      const logger = createLogger('AnyModule');
      logger.debug('should not log');

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should allow setting specific modules after disabling all', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      disableAllDebug();
      setDebugModules(['Module1']);

      const logger1 = createLogger('Module1');
      const logger2 = createLogger('Module2');

      logger1.debug('log this');
      logger2.debug('not this');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      consoleSpy.mockRestore();
    });
  });

  describe('Log Level Filtering', () => {
    it('should respect minimum log level', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation();

      setMinLogLevel('warn');
      setDebugModules(['TestModule']);

      const logger = createLogger('TestModule');

      logger.debug('debug - should not log');
      logger.info('info - should not log');
      logger.warn('warn - should log');
      logger.error('error - should log');

      expect(logSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledTimes(1);

      logSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('should allow setting different log levels', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation();

      setDebugModules(['TestModule']);
      const logger = createLogger('TestModule');

      // Start with debug level
      setMinLogLevel('debug');
      logger.debug('debug message');
      expect(consoleSpy).toHaveBeenCalledTimes(1);

      consoleSpy.mockClear();

      // Change to warn level
      setMinLogLevel('warn');
      logger.debug('debug message');
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
      warnSpy.mockRestore();
    });

    it('should have correct level ordering', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
      const infoSpy = vi.spyOn(console, 'info').mockImplementation();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation();

      setDebugModules(['TestModule']);
      const logger = createLogger('TestModule');

      // At 'info' level: debug should not log, info/warn/error should
      setMinLogLevel('info');
      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(consoleSpy).not.toHaveBeenCalled(); // debug uses console.log
      expect(infoSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
      infoSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('Configuration Management', () => {
    it('should get current debug configuration', () => {
      enableAllDebug();
      setMinLogLevel('warn');

      const config = getDebugConfig();

      expect(config.enabled).toBe(true);
      expect(config.minLevel).toBe('warn');
      expect(config.modules instanceof Set).toBe(true);
      expect(config.modules.has('TypewriterLine')).toBe(true);
      expect(config.modules.has('TerminalInterface')).toBe(true);
    });

    it('should return a copy of modules set', () => {
      enableAllDebug();

      const config1 = getDebugConfig();
      const config2 = getDebugConfig();

      expect(config1.modules).not.toBe(config2.modules);
      expect(config1.modules).toEqual(config2.modules);
    });

    it('should reflect configuration changes in getDebugConfig', () => {
      let config = getDebugConfig();
      expect(config.minLevel).toBe('debug');

      setMinLogLevel('error');
      config = getDebugConfig();
      expect(config.minLevel).toBe('error');

      setMinLogLevel('debug');
      config = getDebugConfig();
      expect(config.minLevel).toBe('debug');
    });
  });

  describe('Error Logger Special Behavior', () => {
    it('error logger should always log when enabled, regardless of module list', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

      disableAllDebug();

      const logger = createLogger('UnknownModule');
      logger.error('error message');

      expect(consoleSpy).toHaveBeenCalledWith('[UnknownModule]', 'error message');
      consoleSpy.mockRestore();
    });

    it('error logger should log for any module when enabled', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

      disableAllDebug();

      const logger1 = createLogger('Module1');
      const logger2 = createLogger('Module2');
      const logger3 = createLogger('AnyModule');

      logger1.error('error1');
      logger2.error('error2');
      logger3.error('error3');

      expect(consoleSpy).toHaveBeenCalledTimes(3);
      consoleSpy.mockRestore();
    });
  });

  describe('Development Mode Behavior', () => {
    it('should have enabled status matching DEV environment', () => {
      const config = getDebugConfig();
      expect(config.enabled).toBe(import.meta.env.DEV);
    });

    it('should have default modules configured', () => {
      enableAllDebug();
      const config = getDebugConfig();

      expect(config.modules.has('TypewriterLine')).toBe(true);
      expect(config.modules.has('TerminalInterface')).toBe(true);
      expect(config.modules.has('ResponseTracking')).toBe(true);
      expect(config.modules.has('Animation')).toBe(true);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle rapid module configuration changes', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      const logger1 = createLogger('Module1');
      const logger2 = createLogger('Module2');

      for (let i = 0; i < 5; i++) {
        setDebugModules(['Module1']);
        logger1.debug(`message ${i}`);

        setDebugModules(['Module2']);
        logger2.debug(`message ${i}`);
      }

      expect(consoleSpy).toHaveBeenCalledTimes(10);
      consoleSpy.mockRestore();
    });

    it('should handle multiple loggers with same module name', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      const logger1a = createLogger('Module1');
      const logger1b = createLogger('Module1');

      setDebugModules(['Module1']);

      logger1a.debug('message from logger1a');
      logger1b.debug('message from logger1b');

      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith('[Module1]', 'message from logger1a');
      expect(consoleSpy).toHaveBeenCalledWith('[Module1]', 'message from logger1b');

      consoleSpy.mockRestore();
    });

    it('should maintain state consistency across operations', () => {
      const config1 = getDebugConfig();

      setDebugModules(['Module1']);
      setMinLogLevel('warn');

      const config2 = getDebugConfig();

      expect(config2.minLevel).toBe('warn');
      expect(config2.modules.has('Module1')).toBe(true);
      expect(config2.modules.has('TypewriterLine')).toBe(false);

      enableAllDebug();

      const config3 = getDebugConfig();
      expect(config3.modules.has('TypewriterLine')).toBe(true);
    });
  });
});
