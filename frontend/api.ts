import type { Prisma, PrismaClient } from '@prisma/client';

// json REST api
const rest = async (method: 'GET' | 'POST' | 'PUT' | 'DELETE', json?: {}, url = 'todo') => // CRUD/REST: Create = POST, Read = GET, Update = PUT, Delete = DELETE
  await (await (fetch(url, {
    method,
    headers: { // compressed json is fine. no need for protobuf, BSON etc.
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(json),
  }))).json();

// We could just use rest() as defined above, but we want to have the actions with types from Prisma for type-safety and autocomplete!

// old customized concrete db functions on REST endpoint
export namespace db { // _deprecated
  type TodoOps = Prisma.TodoDelegate<true>; // true = rejectOnNotFound?
  export const findMany = (args => rest('GET', args)) as TodoOps['findMany'];
  const _create = (args => rest('POST', args)) as TodoOps['create'];
  const _update = (args => rest('PUT', args)) as TodoOps['update'];
  const _delete = (args => rest('DELETE', args)) as TodoOps['delete'];
  export const create = (data: Prisma.TodoCreateInput) => _create({ data }); // just for data, but more restrictive
  export const update = ({updatedAt, ...data}: Prisma.TodoWhereUniqueInput & Prisma.TodoUpdateInput) => _update({ data, where: { id: data.id } }); // remove updatedAt from object so that it is set by db!
  export const delete_ = (data: Prisma.TodoWhereUniqueInput) => _delete({ where: { id: data.id } });
  // TODO make generic. Can't limit data to interface ..WhereUniqueInput w/o sth like ts-transformer-keys; delete fails if we pass more than id (deleteMany accepts ..WhereInput).
  // export values for types: https://github.com/prisma/prisma/discussions/5291
  // limit fields to exactly the given type: https://gitter.im/Microsoft/TypeScript?at=60107e5d32e01b4f71560129
}

// Generically lift the calls over the network.
type model = Lowercase<keyof typeof Prisma.ModelName>;
// const models: model[] = Object.keys(Prisma.ModelName).map(s => s.toLowerCase() as model);
const models = ['todo', 'time'] as const;
const actions = ['findMany', 'create', 'update', 'delete', 'findUnique', 'findFirst', 'updateMany', 'upsert', 'deleteMany', 'aggregate', 'count'] as const; // these are the actions defined on each model. TODO get from prisma? PrismaAction is just a type.

// dbm('foo') is dbc.foo but over the network
const dbm = <M extends model> (model: M) => {
  type Actions = PrismaClient[M];
  type Action = Exclude<Prisma.PrismaAction, 'createMany' | 'executeRaw' | 'queryRaw'>; // why are these not in Actions?
  const lift = <A extends Action> (action: A) => ((args: {}) => rest('POST', args, `db/${model}/${action}`)) as Actions[A];
  // const findMany = lift('findMany');
  return Object.fromEntries(actions.map(s => [s, lift(s)])) as { [K in Action]: Actions[K] };
};

export const db_ = {
  'todo': dbm('todo'),
  'time': dbm('time'),
}
db_.todo.findMany();
// db.time.create({})
