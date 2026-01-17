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

/**
 * Enable/disable logging for specific modules at runtime
 * Usage: setDebugModules(['TypewriterLine', 'TerminalInterface'])
 */
export function setDebugModules(modules: string[]): void {
  config.modules = new Set(modules);
}

/**
 * Enable all debug modules
 */
export function enableAllDebug(): void {
  config.modules = new Set([
    'TypewriterLine',
    'TerminalInterface',
    'ResponseTracking',
    'Animation',
  ]);
}

/**
 * Disable all debug modules
 */
export function disableAllDebug(): void {
  config.modules.clear();
}

/**
 * Set minimum log level to display
 */
export function setMinLogLevel(level: LogLevel): void {
  config.minLevel = level;
}

/**
 * Get current debug configuration (for inspection)
 */
export function getDebugConfig(): DebugConfig {
  return { ...config, modules: new Set(config.modules) };
}
