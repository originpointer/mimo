/**
 * Response types
 */

/**
 * Stream event types
 */
export enum StreamEventType {
  Data = "data",
  Error = "error",
  End = "end",
}

/**
 * MimoBus response structure
 */
export interface MimoResponse<T = unknown> {
  id: string;
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  timestamp: number;
  duration?: number;
}

/**
 * MimoBus stream event structure
 */
export interface MimoStreamEvent<T = unknown> {
  type: StreamEventType;
  data?: T;
  error?: string;
  id: string;
}
