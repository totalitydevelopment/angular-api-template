export interface ValidationError {
  readonly field: string;
  readonly messages: readonly string[];
}

export interface ApiError {
  readonly status: number;
  readonly message: string;
  readonly validationErrors: readonly ValidationError[];
}
