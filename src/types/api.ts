// API envelope types mirroring the Java backend's ApiResponseDto / PaginatedResponseDto
// (field names verified against the Spring DTOs) so the refactored TS routes stay
// wire-compatible with the contract the existing frontend consumes.

export interface ApiResponse<T> {
  success: boolean;
  /** Omitted by the Java backend when null (Jackson NON_NULL). */
  message?: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
