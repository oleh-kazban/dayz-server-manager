import { z } from 'zod';

export const apiErrorCodeSchema = z.enum([
  'AUTH_INVALID_CREDENTIALS',
  'AUTH_TOKEN_MISSING_OR_INVALID',
  'AUTH_TOKEN_TYPE_INVALID',
  'AUTH_REFRESH_TOKEN_INVALID',
  'AUTH_USER_NOT_FOUND',
  'AUTH_FORBIDDEN_ADMIN_REQUIRED',
  'AUTH_RATE_LIMIT_EXCEEDED',
  'AUTH_PASSWORD_MISMATCH',
  'AUTH_SESSION_INVALID',
  'AUTH_SESSION_EXPIRED',
  'AUTH_SESSION_NOT_FOUND',
  'VALIDATION_FAILED',
  'SERVER_NOT_FOUND',
  'SERVER_NAME_CONFLICT',
  'SERVER_PORT_COLLISION',
  'SERVER_PORTS_NOT_DISTINCT',
  'SERVER_RUNNING_CONFIG_LOCKED',
  'SERVER_RUNNING_DELETE_LOCKED',
  'INTERNAL_SERVER_ERROR',
]);
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

export const apiErrorParamsSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean()]),
);
export type ApiErrorParams = z.infer<typeof apiErrorParamsSchema>;

export const apiFieldErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  params: apiErrorParamsSchema.optional(),
});
export type ApiFieldError = z.infer<typeof apiFieldErrorSchema>;

export const apiFieldErrorsMapSchema = z.record(z.string(), apiFieldErrorSchema);
export type ApiFieldErrorsMap = z.infer<typeof apiFieldErrorsMapSchema>;

export const apiErrorResponseSchema = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  errorCode: apiErrorCodeSchema,
  message: z.string(),
  params: apiErrorParamsSchema.optional(),
  fieldErrors: apiFieldErrorsMapSchema.optional(),
});
export type ApiErrorResponseDto = z.infer<typeof apiErrorResponseSchema>;
