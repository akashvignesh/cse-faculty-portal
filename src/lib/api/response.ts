import { NextResponse } from "next/server";
import type { ApiResponse, PaginatedResponse } from "@/types/api";

export function ok<T>(message: string, data: T, init?: ResponseInit): NextResponse {
  const body: ApiResponse<T> = { success: true, message, data };
  return NextResponse.json(body, init);
}

export function fail(status: number, message: string): NextResponse {
  const body: ApiResponse<never> = { success: false, message };
  return NextResponse.json(body, { status });
}

export function paginate<T>(
  content: T[],
  page: number,
  size: number,
  totalElements: number
): PaginatedResponse<T> {
  const totalPages = size > 0 ? Math.ceil(totalElements / size) : totalElements > 0 ? 1 : 0;
  return {
    content,
    page,
    size,
    totalElements,
    totalPages,
    hasNext: page + 1 < totalPages,
    hasPrevious: page > 0,
  };
}
