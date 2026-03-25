/**
 * Centralized Error Handling and Logging
 * Provides consistent error handling across the application
 */

import { supabase } from './supabase';

export interface ErrorLog {
  message: string;
  code?: string;
  context?: string;
  timestamp: string;
  userAgent: string;
}

/**
 * Log an error to the database for monitoring
 */
export async function logErrorToDatabase(error: Error | string, context: string = 'unknown') {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const errorLog: Omit<ErrorLog, 'id'> = {
      message: error instanceof Error ? error.message : String(error),
      code: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    // Store in a logs table (you'll need to create this table in Supabase)
    const { error: dbError } = await supabase.from('error_logs').insert({
      ...errorLog,
      user_id: user?.id,
      org_id: user?.user_metadata?.org_id,
    });
    if (dbError) {
      console.warn('Error logs table not available:', dbError.message);
    }
  } catch (err) {
    console.error('Failed to log error:', err);
  }
}

/**
 * Handle and log an error with optional user notification
 */
export function handleError(
  error: Error | string,
  context: string = 'unknown',
  shouldLog: boolean = true
): string {
  const message = error instanceof Error ? error.message : String(error);
  
  if (shouldLog) {
    console.error(`[${context}] ${message}`);
    logErrorToDatabase(error, context);
  }

  // Return user-friendly message
  if (error instanceof Error && error.message.includes('auth')) {
    return 'Authentication error. Please log in again.';
  }

  if (error instanceof Error && error.message.includes('permission')) {
    return 'You do not have permission to perform this action.';
  }

  if (error instanceof Error && error.message.includes('network')) {
    return 'Network error. Please check your connection.';
  }

  return 'An error occurred. Please try again.';
}

/**
 * Assert a condition and throw an error if false
 */
export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}
