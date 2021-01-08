import React, { useState, useEffect } from 'react';
import './App.css';
import InputForm from './InputForm';

interface AppProps {}
export default function App({}: AppProps) {
  const [count, setCount] = useState(0);
  // Create the counter (+1 every second).
  useEffect(() => {
    const timer = setTimeout(() => setCount(count + 1), 1000);
    return () => clearTimeout(timer);
  }, [count, setCount]);

  const [todos, setTodos] = useState<string[]>([]);
  const addTodo = (value: string) => {
    setTodos([...todos, value]);
    console.log(todos);
  };
  return (
    <div className="App">
      <InputForm placeholder='new todo...' submit={addTodo} />
      {todos.map(todo => <li>{todo}</li>)}
      <header className="App-header">
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <p>
          Page has been open for <code>{count}</code> seconds.
        </p>
      </header>
    </div>
  );
}
