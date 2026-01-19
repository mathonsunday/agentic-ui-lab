/**
 * Debug Logger Utility
 *
 * Provides centralized, module-specific debug logging that can be toggled
 * at runtime. Only active in development mode.
 *
 * Usage:
 *   import { createLogger } from '@/utils/debugLogger';
 *   const logger = createLogger('MyModule');
 *   logger.debug('Something happened', { value: 42 });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface DebugConfig {
  enabled: boolean;
  modules: Set<string>;
  minLevel: LogLevel;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const config: DebugConfig = {
  enabled: import.meta.env.DEV,
  modules: new Set([
    'TypewriterLine',
    'TerminalInterface',
    'ResponseTracking',
    'Animation',
  ]),
  minLevel: 'debug',
};

function shouldLog(level: LogLevel): boolean {
  if (!config.enabled) return false;
  return LEVEL_ORDER[level] >= LEVEL_ORDER[config.minLevel];
}

export function createLogger(moduleName: string) {
  return {
    debug: (...args: unknown[]) => {
      if (config.enabled && config.modules.has(moduleName) && shouldLog('debug')) {
        console.log(`[${moduleName}]`, ...args);
      }
    },
    info: (...args: unknown[]) => {
      if (config.enabled && config.modules.has(moduleName) && shouldLog('info')) {
        console.info(`[${moduleName}]`, ...args);
      }
    },
    warn: (...args: unknown[]) => {
      if (config.enabled && config.modules.has(moduleName) && shouldLog('warn')) {
        console.warn(`[${moduleName}]`, ...args);
      }
    },
    error: (...args: unknown[]) => {
      if (config.enabled && shouldLog('error')) {
        console.error(`[${moduleName}]`, ...args);
      }
    },
  };
}

