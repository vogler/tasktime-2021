import { Box, Button, Stack, Text } from '@chakra-ui/react';
import React, { useState, useEffect } from 'react';
import './App.css';
import InputForm from './lib/InputForm';
import ThemeToggle from './lib/ThemeToggle';
import TodoItem from './TodoItem';
import type { Todo, Prisma } from '@prisma/client'; // import default export instead of named exports
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa';

// const delay = (time: number) => new Promise(res => setTimeout(res, time));
const rest = async (method: 'GET' | 'POST' | 'PUT' | 'DELETE', json?: {}, url = 'todo') => // CRUD/REST: Create = POST, Read = GET, Update = PUT, Delete = DELETE
  await (await (fetch(url, {
    method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(json),
  }))).json();

namespace db { // could also just use rest() as defined above, but this is type-safe
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

// initial data replaced by the server:
const initialTodos: Todo[] = [];

export default function () {
  const [todos, setTodos] = useState(initialTodos);
  const [showDone, setShowDone] = useState(true);

  // replacement by server is somehow not done on HMR, so we just keep this for now
  useEffect(() => { // can't use async here since it always returns a Promise; could make a wrapper for the Promise<void> case, but not for the unmount-function case. could use https://github.com/rauldeheer/use-async-effect
    (async () => {
      setTodos(await db.findMany());
    })();
  }, []);

  const addTodo = async (text: string) => {
    if (text == '') return 'Todo is empty';
    // if (todos.includes(value)) return 'Todo exists';
    // await delay(1000);
    const todo = await db.create({ text });
    setTodos([...todos, todo]);
    console.log(todo, todos); // todos not updated yet here
  };

  const delTodo = (index: number) => async () => {
    await db.delete_(todos[index]);
    const newTodos = [...todos];
    newTodos.splice(index, 1); // delete element at index
    console.log(`delTodo(${index}):`, newTodos);
    setTodos(newTodos);
  };

  // TODO make generic and pull out list component
  const setTodo = (index: number) => async (x: Todo) => {
    await db.update(x);
    const newTodos = [...todos];
    newTodos[index] = x;
    setTodos(newTodos);
  };

  const [count, setCount] = useState(0);
  useEffect(() => { // count + 1 every second
    const timer = setTimeout(() => setCount(count + 1), 1000);
    return () => clearTimeout(timer);
  }, [count]);

  const filteredTodos = !showDone ? todos.filter(todo => !todo.done) : todos;

  return (
    <div className="App">
      <InputForm submit={addTodo} inputProps={{placeholder: 'new todo...', autoComplete: 'off', autoFocus: true /* does nothing*/}} />
      <Box shadow="md" borderWidth="1px" m="3" p="2">
        { filteredTodos.length
          ? filteredTodos.map((todo, index) => <TodoItem todo={todo} key={todo.id} del={delTodo(index)} set={setTodo(index)} />) // do not use index as key since it changes with the order of the list and on deletion
          : "Nothing to show..."
        }
      </Box>
      <Button size="sm" leftIcon={showDone ? <FaRegEyeSlash /> : <FaRegEye />} onClick={_ => setShowDone(!showDone)}>{showDone ? 'hide' : 'show'} done</Button>
      <Stack color="gray.500" align="center">
        <Text>Usage: click an item to edit it.</Text>
        <Text>Page has been open for <code>{count}</code> seconds.</Text>
        <a href="#" onClick={_ => console.table(todos)}>console.table(todos)</a>
      </Stack>
      <ThemeToggle />
    </div>
  );
}
