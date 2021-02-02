import type { Prisma } from "@prisma/client";

export const initialTodoOrderBy: Prisma.TodoOrderByInput = { createdAt: 'asc' };
