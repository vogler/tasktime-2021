import React, { useState, useEffect } from 'react';
import { Box, Button, Divider, HStack, Stack, Text } from '@chakra-ui/react';
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa';
import './App.css';
import InputForm from './lib/InputForm';
import ThemeToggle from './lib/ThemeToggle';
import TodoItem from './TodoItem';
import { db } from './api';
import type { Todo } from '@prisma/client';

// const delay = (time: number) => new Promise(res => setTimeout(res, time));

// initial data replaced by the server:
const initialTodos: Todo[] = [];

export default function () {
  const [todos, setTodos] = useState(initialTodos);
  const [showDone, setShowDone] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  // no need for extra fetch anymore since server already sets initialTodos from db
  // useEffect(() => { // can't use async here since it always returns a Promise; could make a wrapper for the Promise<void> case, but not for the unmount-function case. could use https://github.com/rauldeheer/use-async-effect
  //   (async () => {
  //     setTodos(await db.findMany());
  //   })();
  // }, []);

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
    x = await db.update(x);
    const newTodos = [...todos];
    newTodos[index] = x;
    setTodos(newTodos);
  };

  const [time, setTime] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setTime(time + 1), 1000); // + 1 every second
    return () => clearTimeout(timer);
  }, [time]);

  const filteredTodos = !showDone ? todos.filter(todo => !todo.done) : todos;

  return (
    <div className="App">
      <InputForm submit={addTodo} inputProps={{placeholder: 'new todo...', autoComplete: 'off', autoFocus: true /* does nothing*/}} />
      <Box shadow="md" borderWidth="1px" m="3" p="2">
        { filteredTodos.length
          ? filteredTodos.map((todo, index) => <TodoItem todo={todo} key={todo.id} del={delTodo(index)} set={setTodo(index)} global_time={time} showDetails={showDetails} />) // do not use index as key since it changes with the order of the list and on deletion
          : "Nothing to show..."
        }
      </Box>
      <HStack>
        <Button size="sm" leftIcon={showDone ? <FaRegEyeSlash /> : <FaRegEye />} onClick={_ => setShowDone(!showDone)}>{showDone ? 'hide' : 'show'} done</Button>
        <Button size="sm" leftIcon={showDetails ? <FaRegEyeSlash /> : <FaRegEye />} onClick={_ => setShowDetails(!showDetails)}>{showDetails ? 'hide' : 'show'} details</Button>
      </HStack>
      <Divider my={3} />
      <Stack color="gray.500" align="center">
        <Text>Usage: click an item to edit it.</Text>
        <Text>Page has been open for <code>{time}</code> seconds.</Text>
        <a href="#" onClick={_ => console.table(todos)}>console.table(todos)</a>
      </Stack>
      <ThemeToggle />
    </div>
  );
}
