import { ZodError } from "zod";
import { fail } from "./response";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string) {
    super(400, message);
    this.name = "BadRequestError";
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string) {
    super(404, message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends ApiError {
  constructor(message: string) {
    super(409, message);
    this.name = "ConflictError";
  }
}

function isConnectionError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  return (
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "EHOSTUNREACH" ||
    code === "PROTOCOL_CONNECTION_LOST"
  );
}

type RouteHandler<Ctx> = (request: Request, context: Ctx) => Promise<Response>;

/**
 * Wraps a route handler with uniform error → HTTP mapping. Never leaks SQL or
 * stack traces to the client.
 */
export function withErrorHandler<Ctx>(handler: RouteHandler<Ctx>): RouteHandler<Ctx> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ApiError) {
        return fail(error.status, error.message);
      }
      if (error instanceof ZodError) {
        const details = error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; ");
        return fail(400, `Invalid request — ${details}`);
      }
      if (isConnectionError(error)) {
        return fail(
          503,
          "Database is unavailable — is the SSH tunnel to the university MySQL server up?"
        );
      }
      console.error(`[api] Unhandled error for ${request.method} ${request.url}:`, error);
      return fail(500, "Internal server error");
    }
  };
}
