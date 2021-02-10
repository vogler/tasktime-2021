import type { Prisma, Todo } from "@prisma/client";

export const include = {times: true};
export type TodoFlat = Todo;
type TodoFull = Prisma.TodoGetPayload<{include: typeof include}>;
export {TodoFull as Todo};

export type TimeData = Prisma.TimeUpdateManyWithoutTodoInput;

export const initialTodoOrderBy: Prisma.TodoOrderByInput = { createdAt: 'asc' };
