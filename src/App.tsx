import { Box, Stack, Text } from '@chakra-ui/react';
import React, { useState, useEffect } from 'react';
import './App.css';
import InputForm from './lib/InputForm';
import ThemeToggle from './lib/ThemeToggle';
import TodoItem from './TodoItem';

// const delay = (time: number) => new Promise(res => setTimeout(res, time));

export default function App() {
  const [todos, setTodos] = useState<string[]>(['test 1', 'test 2']);

  const addTodo = async (value: string) => {
    if (value == '') return 'Todo is empty';
    if (todos.includes(value)) return 'Todo exists';
    // await delay(1000);
    setTodos([...todos, value]);
    console.log(value, todos); // todos not updated yet here
  };

  const [count, setCount] = useState(0);
  useEffect(() => { // count + 1 every second
    const timer = setTimeout(() => setCount(count + 1), 1000);
    return () => clearTimeout(timer);
  }, [count]);

  return (
    <div className="App">
      <InputForm placeholder='new todo...' submit={addTodo} />
      <Box shadow="md" borderWidth="1px" m="3" p="2">
        { todos.length
          ? todos.map(todo => <TodoItem todo={todo} key={todo} />)
          : "No todos yet..."
        }
      </Box>
      <Stack color="gray.500" align="center">
        <Text>Usage: click an item to edit it.</Text>
        <Text>Page has been open for <code>{count}</code> seconds.</Text>
      </Stack>
      <ThemeToggle />
    </div>
  );
}
