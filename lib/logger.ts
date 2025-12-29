/**
 * Structured logging utility for the application.
 *
 * Provides consistent logging across the codebase with:
 * - Log levels (debug, info, warn, error)
 * - Structured metadata
 * - Environment-aware output (debug disabled in production)
 * - Type-safe interfaces
 *
 * @example
 * ```typescript
 * import { logger } from '@/lib/logger';
 *
 * logger.info('User logged in', { userId: '123', email: 'user@example.com' });
 * logger.error('Payment failed', error, { orderId: '456' });
 * ```
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMetadata {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isTest = process.env.NODE_ENV === 'test';

  /**
   * Log debug information (development only)
   */
  debug(message: string, metadata?: LogMetadata): void {
    if (this.isDevelopment && !this.isTest) {
      this.log('debug', message, metadata);
    }
  }

  /**
   * Log informational messages
   */
  info(message: string, metadata?: LogMetadata): void {
    this.log('info', message, metadata);
  }

  /**
   * Log warning messages
   */
  warn(message: string, metadata?: LogMetadata): void {
    this.log('warn', message, metadata);
  }

  /**
   * Log error messages
   */
  error(message: string, error?: Error | unknown, metadata?: LogMetadata): void {
    const errorData: LogMetadata = {};

    if (error instanceof Error) {
      errorData.error = {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
      };
    } else if (error) {
      errorData.error = error;
    }

    this.log('error', message, { ...errorData, ...metadata });
  }

  private log(level: LogLevel, message: string, metadata?: LogMetadata): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...metadata,
    };

    // In development, use pretty console output
    if (this.isDevelopment || this.isTest) {
      const consoleMethod = level === 'error' ? console.error :
                           level === 'warn' ? console.warn :
                           level === 'info' ? console.info :
                           console.log;

      if (metadata && Object.keys(metadata).length > 0) {
        consoleMethod(`[${logEntry.level}]`, message, metadata);
      } else {
        consoleMethod(`[${logEntry.level}]`, message);
      }
    } else {
      // In production, use structured JSON logging
      // This can be easily parsed by log aggregation services
      console.log(JSON.stringify(logEntry));
    }
  }
}

export const logger = new Logger();
