import type { Prisma, Todo } from "@prisma/client";
import prisma from '@prisma/client'; // values like Prisma.ModelName via default import since CJS does not support named import

// generic definitions for ./backend/server and ./frontend/api
export type model = Uncapitalize<keyof typeof Prisma.ModelName>;
export const models = Object.keys(prisma.Prisma.ModelName).map(s => s[0].toLowerCase() + s.slice(1) as model);
export type action = Exclude<Prisma.PrismaAction, 'createMany' | 'executeRaw' | 'queryRaw'>; // why are these not defined on PrismaClient[model]?
export const actions = ['findMany', 'create', 'update', 'delete', 'findUnique', 'findFirst', 'updateMany', 'upsert', 'deleteMany', 'aggregate', 'count'] as const; // these are the actions defined on each model. TODO get from prisma? PrismaAction is just a type.


// specific to Todo/Time
export const include = {times: {orderBy: {start: 'desc' as const}}}; // {times: true} had no reliable order for times
// export type TodoFlat = Todo;
type TodoFull = Prisma.TodoGetPayload<{include: typeof include}>;
export {TodoFull as Todo};

export const timeInclude = {todo: {select: {text: true, time: true, done: true}}};
type TimeFull = Prisma.TimeGetPayload<{include: typeof timeInclude}>
export {TimeFull as Time};

export type TimeMutation = Prisma.TimeUpdateManyWithoutTodoInput;

export const dbTodoOrderBy: Prisma.TodoOrderByInput = { createdAt: 'asc' };
