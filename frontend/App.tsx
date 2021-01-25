import { Box, Button, Stack, Text } from '@chakra-ui/react';
import React, { useState, useEffect } from 'react';
import './App.css';
import InputForm from './lib/InputForm';
import ThemeToggle from './lib/ThemeToggle';
import TodoItem from './TodoItem';
import type { Todo } from '@prisma/client'; // import default export instead of named exports
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

// initial data replaced by the server:
const initialTodos: Todo[] = [];

export default function () {
  const [todos, setTodos] = useState(initialTodos);
  const [showDone, setShowDone] = useState(true);

  // replacement by server is somehow not done on HMR, so we just keep this for now
  useEffect(() => { // can't use async here since it always returns a Promise; could make a wrapper for the Promise<void> case, but not for the unmount-function case. could use https://github.com/rauldeheer/use-async-effect
    (async () => {
      setTodos(await rest('GET'));
    })();
  }, []);

  const addTodo = async (text: string) => {
    if (text == '') return 'Todo is empty';
    // if (todos.includes(value)) return 'Todo exists';
    // await delay(1000);
    const todo = await rest('POST', { text });
    setTodos([...todos, todo]);
    console.log(todo, todos); // todos not updated yet here
  };

  const delTodo = (index: number) => async () => {
    await rest('DELETE', { id: todos[index].id });
    const newTodos = [...todos];
    newTodos.splice(index, 1); // delete element at index
    console.log(`delTodo(${index}):`, newTodos);
    setTodos(newTodos);
  };

  // TODO make generic and pull out list component
  const setTodo = (index: number) => async (x: Todo) => {
    await rest('PUT', x);
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
