import { useState, useEffect } from 'react';
import './App.css';
import InputForm from './InputForm';
import ThemeToggle from './ThemeToggle';
import TodoItem from './TodoItem';

// const delay = (time: number) => new Promise(res => setTimeout(res, time));

export default function App() {
  const [todos, setTodos] = useState<string[]>([]);

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
  }, [count, setCount]);

  return (
    <div className="App">
      <InputForm placeholder='new todo...' submit={addTodo} />
      { todos.map(todo => <TodoItem todo={todo} key={todo} />) }
      <header className="App-header">
        <p>
          Page has been open for <code>{count}</code> seconds.
        </p>
      </header>
      <ThemeToggle />
    </div>
  );
}
