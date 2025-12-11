/**
 * Centralized error handling for FDA MCP Server
 */

import { FdaError, FdaErrorType } from '../types/index.js';
import { logger } from '../logging/index.js';

export class ErrorHandler {
  private static instance: ErrorHandler;

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public createError(
    type: FdaErrorType,
    message: string,
    code: string,
    details?: Record<string, unknown>,
    cause?: Error,
    requestId?: string
  ): FdaError {
    const error = new Error(message) as FdaError;
    error.name = 'FdaError';
    error.type = type;
    error.code = code;
    error.details = details;
    error.requestId = requestId;
    error.cause = cause;

    if (cause) {
      error.stack = cause.stack;
    }

    return error;
  }

  public handleApiError(
    error: unknown,
    endpoint: string,
    requestId?: string
  ): FdaError {
    logger.error('FDA API error', error as Error, {
      component: 'ERROR_HANDLER',
      requestId,
      operation: 'handleApiError'
    });

    if (this.isFdaError(error)) {
      return error;
    }

    if (error instanceof Error) {
      // Handle specific HTTP errors
      if ('response' in error && typeof error.response === 'object' && error.response !== null) {
        const response = error.response as Record<string, unknown>;
        const status = response.status || response.statusCode;

        switch (status) {
          case 400:
            return this.createError(
              FdaErrorType.VALIDATION_ERROR,
              'Invalid request parameters',
              'FDA_BAD_REQUEST',
              { endpoint, originalError: error.message },
              error,
              requestId
            );

          case 401:
            return this.createError(
              FdaErrorType.API_ERROR,
              'FDA API authentication failed',
              'FDA_UNAUTHORIZED',
              { endpoint, originalError: error.message },
              error,
              requestId
            );

          case 403:
            return this.createError(
              FdaErrorType.API_ERROR,
              'FDA API access forbidden',
              'FDA_FORBIDDEN',
              { endpoint, originalError: error.message },
              error,
              requestId
            );

          case 404:
            return this.createError(
              FdaErrorType.API_ERROR,
              'FDA API endpoint not found',
              'FDA_NOT_FOUND',
              { endpoint, originalError: error.message },
              error,
              requestId
            );

          case 429:
            return this.createError(
              FdaErrorType.RATE_LIMIT_ERROR,
              'FDA API rate limit exceeded',
              'FDA_RATE_LIMITED',
              { endpoint, originalError: error.message },
              error,
              requestId
            );

          case 500:
          case 502:
          case 503:
          case 504:
            return this.createError(
              FdaErrorType.API_ERROR,
              'FDA API server error',
              'FDA_SERVER_ERROR',
              { endpoint, status, originalError: error.message },
              error,
              requestId
            );

          default:
            return this.createError(
              FdaErrorType.API_ERROR,
              `FDA API error: ${error.message}`,
              'FDA_API_ERROR',
              { endpoint, status, originalError: error.message },
              error,
              requestId
            );
        }
      }

      // Handle network errors
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        return this.createError(
          FdaErrorType.NETWORK_ERROR,
          'Unable to connect to FDA API',
          'FDA_CONNECTION_ERROR',
          { endpoint, originalError: error.message },
          error,
          requestId
        );
      }

      // Handle timeout errors
      if (error.message.includes('timeout') || error.name === 'TimeoutError') {
        return this.createError(
          FdaErrorType.TIMEOUT_ERROR,
          'FDA API request timeout',
          'FDA_TIMEOUT',
          { endpoint, originalError: error.message },
          error,
          requestId
        );
      }

      // Generic error
      return this.createError(
        FdaErrorType.API_ERROR,
        error.message,
        'FDA_UNKNOWN_ERROR',
        { endpoint, originalError: error.message },
        error,
        requestId
      );
    }

    // Handle non-Error objects
    return this.createError(
      FdaErrorType.API_ERROR,
      'Unknown FDA API error',
      'FDA_UNKNOWN_ERROR',
      { endpoint, originalError: String(error) },
      undefined,
      requestId
    );
  }

  public handleValidationError(
    validationErrors: string[],
    requestId?: string
  ): FdaError {
    const message = `Validation failed: ${validationErrors.join(', ')}`;

    logger.warn('Validation error', {
      validationErrors
    }, {
      component: 'ERROR_HANDLER',
      requestId,
      operation: 'handleValidationError'
    });

    return this.createError(
      FdaErrorType.VALIDATION_ERROR,
      message,
      'VALIDATION_FAILED',
      { validationErrors },
      undefined,
      requestId
    );
  }

  public handleNetworkError(
    error: Error,
    endpoint: string,
    requestId?: string
  ): FdaError {
    logger.error('Network error', error, {
      component: 'ERROR_HANDLER',
      requestId,
      operation: 'handleNetworkError'
    });

    return this.createError(
      FdaErrorType.NETWORK_ERROR,
      `Network error accessing ${endpoint}: ${error.message}`,
      'NETWORK_ERROR',
      { endpoint, originalError: error.message },
      error,
      requestId
    );
  }

  public handleTimeoutError(
    timeout: number,
    endpoint: string,
    requestId?: string
  ): FdaError {
    logger.warn('Request timeout', {
      timeout: `${timeout}ms`,
      endpoint
    }, {
      component: 'ERROR_HANDLER',
      requestId,
      operation: 'handleTimeoutError'
    });

    return this.createError(
      FdaErrorType.TIMEOUT_ERROR,
      `Request timeout after ${timeout}ms for ${endpoint}`,
      'REQUEST_TIMEOUT',
      { timeout, endpoint },
      undefined,
      requestId
    );
  }

  public handleRateLimitError(
    limit: number,
    window: number,
    requestId?: string
  ): FdaError {
    logger.warn('Rate limit exceeded', {
      limit,
      window: `${window}ms`
    }, {
      component: 'ERROR_HANDLER',
      requestId,
      operation: 'handleRateLimitError'
    });

    return this.createError(
      FdaErrorType.RATE_LIMIT_ERROR,
      `Rate limit exceeded: ${limit} requests per ${window}ms`,
      'RATE_LIMIT_EXCEEDED',
      { limit, window },
      undefined,
      requestId
    );
  }

  public handleUnexpectedError(
    error: unknown,
    context: string,
    requestId?: string
  ): FdaError {
    logger.error('Unexpected error', error as Error, {
      component: 'ERROR_HANDLER',
      requestId,
      operation: 'handleUnexpectedError'
    });

    if (this.isFdaError(error)) {
      return error;
    }

    if (error instanceof Error) {
      return this.createError(
        FdaErrorType.API_ERROR,
        `Unexpected error in ${context}: ${error.message}`,
        'UNEXPECTED_ERROR',
        { context, originalError: error.message },
        error,
        requestId
      );
    }

    return this.createError(
      FdaErrorType.API_ERROR,
      `Unexpected error in ${context}: ${String(error)}`,
      'UNEXPECTED_ERROR',
      { context, originalError: String(error) },
      undefined,
      requestId
    );
  }

  public isFdaError(error: unknown): error is FdaError {
    return error instanceof Error &&
           'type' in error &&
           'code' in error &&
           Object.values(FdaErrorType).includes((error as FdaError).type);
  }

  public isRetryableError(error: FdaError): boolean {
    switch (error.type) {
      case FdaErrorType.NETWORK_ERROR:
      case FdaErrorType.TIMEOUT_ERROR:
        return true;

      case FdaErrorType.API_ERROR:
        // Retry on server errors (5xx)
        if ((error.details as any)?.status >= 500) {
          return true;
        }
        return false;

      case FdaErrorType.RATE_LIMIT_ERROR:
        return true; // Can retry after waiting

      case FdaErrorType.VALIDATION_ERROR:
        return false; // Don't retry validation errors

      default:
        return false;
    }
  }

  public getRetryDelay(error: FdaError, attempt: number): number {
    switch (error.type) {
      case FdaErrorType.RATE_LIMIT_ERROR:
        // Exponential backoff for rate limits
        return Math.min(1000 * Math.pow(2, attempt), 30000);

      case FdaErrorType.NETWORK_ERROR:
      case FdaErrorType.TIMEOUT_ERROR:
        // Linear backoff for network issues
        return Math.min(1000 + (attempt * 1000), 10000);

      case FdaErrorType.API_ERROR:
        // Conservative backoff for API errors
        return Math.min(500 * Math.pow(2, attempt), 5000);

      default:
        return 1000;
    }
  }

  public sanitizeErrorForResponse(error: FdaError): {
    message: string;
    code: string;
    type: string;
    details?: Record<string, unknown>;
  } {
    // Remove sensitive information for client responses
    const sanitizedDetails = error.details ? { ...error.details } : undefined;
    if (sanitizedDetails) {
      delete sanitizedDetails.originalError;
      delete sanitizedDetails.stack;
    }

    return {
      message: error.message,
      code: error.code,
      type: error.type,
      details: sanitizedDetails
    };
  }
}

export const errorHandler = ErrorHandler.getInstance();