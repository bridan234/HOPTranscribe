/**
 * Console interceptor that sends console logs to the backend
 */

import { loggingService } from '../services/loggingService';

const originalConsole = {
  log: console.log,
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

let isIntercepting = false;

function extractSource(stack?: string): string {
  if (!stack) return 'Unknown';
  
  const lines = stack.split('\n');
  if (lines.length > 2) {
    const callerLine = lines[2];
    const match = callerLine.match(/at\s+(.+?)\s+\(/);
    if (match) {
      return match[1];
    }
    const fileMatch = callerLine.match(/\((.+?):(\d+):(\d+)\)/);
    if (fileMatch) {
      const filePath = fileMatch[1];
      const fileName = filePath.split('/').pop() || filePath;
      return fileName;
    }
  }
  
  return 'Console';
}

function formatArgs(args: any[]): { message: string; context?: any } {
  if (args.length === 0) {
    return { message: '' };
  }

  const message = String(args[0]);
  
  if (args.length > 1) {
    const context = args.slice(1).map(arg => {
      if (arg instanceof Error) {
        return {
          error: arg.message,
          stack: arg.stack,
        };
      }
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return arg;
    });
    
    return { message, context: context.length === 1 ? context[0] : context };
  }

  return { message };
}

function interceptLog(...args: any[]): void {
  originalConsole.log(...args);
  
  const { message, context } = formatArgs(args);
  const stack = new Error().stack;
  const source = extractSource(stack);
  
  loggingService.info(message, source, context);
}

function interceptDebug(...args: any[]): void {
  originalConsole.debug(...args);
  
  const { message, context } = formatArgs(args);
  const stack = new Error().stack;
  const source = extractSource(stack);
  
  loggingService.debug(message, source, context);
}

function interceptInfo(...args: any[]): void {
  originalConsole.info(...args);
  
  const { message, context } = formatArgs(args);
  const stack = new Error().stack;
  const source = extractSource(stack);
  
  loggingService.info(message, source, context);
}

function interceptWarn(...args: any[]): void {
  originalConsole.warn(...args);
  
  const { message, context } = formatArgs(args);
  const stack = new Error().stack;
  const source = extractSource(stack);
  
  loggingService.warn(message, source, context);
}

function interceptError(...args: any[]): void {
  originalConsole.error(...args);
  
  const { message, context } = formatArgs(args);
  const stack = new Error().stack;
  const source = extractSource(stack);
  
  const error = args[0] instanceof Error ? args[0] : undefined;
  
  loggingService.error(message, source, error, context);
}

export function startConsoleInterception(): void {
  if (isIntercepting) {
    return;
  }

  console.log = interceptLog;
  console.debug = interceptDebug;
  console.info = interceptInfo;
  console.warn = interceptWarn;
  console.error = interceptError;

  isIntercepting = true;
  
  originalConsole.info('[Console Interceptor] Started sending console logs to backend');
}

export function stopConsoleInterception(): void {
  if (!isIntercepting) {
    return;
  }

  console.log = originalConsole.log;
  console.debug = originalConsole.debug;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;

  isIntercepting = false;
  
  originalConsole.info('[Console Interceptor] Stopped sending console logs to backend');
}

export function isConsolInterceptionActive(): boolean {
  return isIntercepting;
}

export { originalConsole };
