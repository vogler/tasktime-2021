import React, { useState, useEffect } from 'react';
import './App.css';
import InputForm from './InputForm';

// const delay = (time: number) => new Promise(res => setTimeout(res, time));

export default function App() {
  const [count, setCount] = useState(0);
  // Create the counter (+1 every second).
  useEffect(() => {
    const timer = setTimeout(() => setCount(count + 1), 1000);
    return () => clearTimeout(timer);
  }, [count, setCount]);

  const [todos, setTodos] = useState<string[]>([]);
  const addTodo = async (value: string) => {
    if (value == '') return 'Todo is empty';
    if (todos.includes(value)) return 'Todo exists';
    // await delay(1000);
    setTodos([...todos, value]);
    console.log(value, todos); // todos not updated yet here
  };
  return (
    <div className="App">
      <InputForm placeholder='new todo...' submit={addTodo} />
      { todos.map(todo => <li key={todo}>{todo}</li>) }
      <header className="App-header">
        <p>
          Page has been open for <code>{count}</code> seconds.
        </p>
      </header>
    </div>
  );
}
