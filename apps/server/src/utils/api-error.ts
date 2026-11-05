import type { FastifyReply } from 'fastify';
import type { ZodError } from 'zod';

import type {
  ApiErrorCode,
  ApiErrorParams,
  ApiErrorResponseDto,
  ApiFieldError,
  ApiFieldErrorsMap,
} from '@dsm/api-contracts';

const HTTP_STATUS_PHRASES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
};

const PORT_FIELDS = new Set(['gamePort', 'queryPort', 'rconPort']);

const MESSAGE_CODE_PATTERNS: { match: string; code: string }[] = [
  { match: 'distinct', code: 'PORTS_NOT_DISTINCT' },
  { match: 'conflict with one another', code: 'PORTS_NOT_DISTINCT' },
  { match: 'Path traversal', code: 'PATH_TRAVERSAL_FORBIDDEN' },
  { match: 'Null bytes', code: 'PATH_NULL_BYTES_FORBIDDEN' },
  { match: 'invalid filesystem characters', code: 'PATH_INVALID_CHARS' },
  { match: 'Colons are only permitted', code: 'PATH_INVALID_COLON' },
  { match: 'valid UUID', code: 'INVALID_UUID' },
];

function resolveCustomIssueCode(message: string): string | null {
  const found = MESSAGE_CODE_PATTERNS.find(entry => message.includes(entry.match));
  return found ? found.code : null;
}

interface RawZodIssue {
  code: string;
  message: string;
  minimum?: number;
  maximum?: number;
  origin?: string;
  type?: string;
}

function isNumericField(fieldKey: string, rawIssue: RawZodIssue): boolean {
  return rawIssue.origin === 'number' || rawIssue.type === 'number' || PORT_FIELDS.has(fieldKey);
}

function mapBoundIssue(fieldKey: string, rawIssue: RawZodIssue): ApiFieldError | null {
  const isNumber = isNumericField(fieldKey, rawIssue);

  if (rawIssue.code === 'too_small' && typeof rawIssue.minimum === 'number') {
    if (!isNumber && rawIssue.minimum === 1) {
      return { code: 'REQUIRED', message: rawIssue.message };
    }
    return {
      code: isNumber ? 'NUMBER_TOO_SMALL' : 'STRING_TOO_SHORT',
      message: rawIssue.message,
      params: { min: rawIssue.minimum },
    };
  }

  if (rawIssue.code === 'too_big' && typeof rawIssue.maximum === 'number') {
    return {
      code: isNumber ? 'NUMBER_TOO_LARGE' : 'STRING_TOO_LONG',
      message: rawIssue.message,
      params: { max: rawIssue.maximum },
    };
  }

  return null;
}

function mapZodIssueToFieldError(
  fieldKey: string,
  issue: ZodError['issues'][number],
): ApiFieldError {
  const customCode = resolveCustomIssueCode(issue.message);
  if (customCode) {
    return { code: customCode, message: issue.message };
  }

  const rawIssue = issue as unknown as RawZodIssue;
  const boundError = mapBoundIssue(fieldKey, rawIssue);
  if (boundError) {
    return boundError;
  }

  if (rawIssue.code === 'invalid_format' || rawIssue.code === 'invalid_string') {
    return { code: 'INVALID_UUID', message: issue.message };
  }

  if (rawIssue.code === 'invalid_type') {
    const lower = issue.message.toLowerCase();
    const isMissing = lower.includes('undefined') || lower.includes('required');
    return { code: isMissing ? 'REQUIRED' : 'INVALID_TYPE', message: issue.message };
  }

  return { code: 'INVALID_VALUE', message: issue.message };
}

export function formatZodFieldErrors(error: ZodError): ApiFieldErrorsMap {
  const fieldErrors: ApiFieldErrorsMap = {};

  for (const issue of error.issues) {
    const fieldKey = issue.path.length > 0 ? issue.path.map(String).join('.') : 'root';
    if (!fieldErrors[fieldKey]) {
      fieldErrors[fieldKey] = mapZodIssueToFieldError(fieldKey, issue);
    }
  }

  return fieldErrors;
}

export interface ApiErrorDetails {
  message: string;
  params?: ApiErrorParams;
  fieldErrors?: ApiFieldErrorsMap;
}

export function sendApiError(
  reply: FastifyReply,
  statusCode: number,
  errorCode: ApiErrorCode,
  details: string | ApiErrorDetails,
) {
  const normalized: ApiErrorDetails = typeof details === 'string' ? { message: details } : details;

  const payload: ApiErrorResponseDto = {
    statusCode,
    error: HTTP_STATUS_PHRASES[statusCode] ?? 'Error',
    errorCode,
    message: normalized.message,
    ...(normalized.params !== undefined ? { params: normalized.params } : {}),
    ...(normalized.fieldErrors !== undefined ? { fieldErrors: normalized.fieldErrors } : {}),
  };

  return reply.status(statusCode).send(payload);
}
