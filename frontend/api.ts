import type { Prisma } from '@prisma/client';

const rest = async (method: 'GET' | 'POST' | 'PUT' | 'DELETE', json?: {}, url = 'todo') => // CRUD/REST: Create = POST, Read = GET, Update = PUT, Delete = DELETE
  await (await (fetch(url, {
    method,
    headers: { // compressed json is fine. no need for protobuf, BSON etc.
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(json),
  }))).json();

export namespace db { // could also just use rest() as defined above, but this is type-safe
  export const findMany = (args => rest('GET', args)) as Prisma.TodoDelegate['findMany'];
  const _create = (args => rest('POST', args)) as Prisma.TodoDelegate['create'];
  const _update = (args => rest('PUT', args)) as Prisma.TodoDelegate['update'];
  const _delete = (args => rest('DELETE', args)) as Prisma.TodoDelegate['delete'];
  export const create = (data: Prisma.TodoCreateInput) => _create({ data }); // just for data, but more restrictive
  export const update = (data: Prisma.TodoWhereUniqueInput) => _update({ data, where: { id: data.id } });
  export const delete_ = (data: Prisma.TodoWhereUniqueInput) => _delete({ where: { id: data.id } });
  // TODO make generic. Can't limit data to interface ..WhereUniqueInput w/o sth like ts-transformer-keys; delete fails if we pass more than id (deleteMany accepts ..WhereInput).
  // export values for types: https://github.com/prisma/prisma/discussions/5291
  // limit fields to exactly the given type: https://gitter.im/Microsoft/TypeScript?at=60107e5d32e01b4f71560129
}
