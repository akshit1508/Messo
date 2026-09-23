export interface ApiResponse {
  success: boolean;
  message: string;
}

export interface CsrfResponse {
  token: string;
  headerName: string;
  parameterName: string;
}

export interface ErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  details?: string[];
}

export class ApiError extends Error {
  status: number;
  error: string;
  details?: string[];
  timestamp?: string;

  constructor(data: ErrorResponse) {
    super(data.message || "An unexpected error occurred");
    this.name = "ApiError";
    this.status = data.status;
    this.error = data.error;
    this.details = data.details;
    this.timestamp = data.timestamp;
  }
}
