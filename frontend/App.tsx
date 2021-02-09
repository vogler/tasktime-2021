import React, { useState, useEffect } from 'react';
import { Box, Button, Divider, HStack, Menu, MenuButton, MenuDivider, MenuItemOption, MenuList, MenuOptionGroup, Stack, Text } from '@chakra-ui/react';
import { FaRegEye, FaRegEyeSlash, FaSortAlphaDown, FaSortAlphaUp } from 'react-icons/fa';
import './App.css';
import { useAsyncDepEffect } from './lib/react';
import { diff, equals } from './lib/util';
import InputForm from './lib/InputForm';
import ThemeToggle from './lib/ThemeToggle';
import TodoItem from './TodoItem';
import { db } from './api';
import { Todo, include } from '../shared/db';
import { initialTodoOrderBy } from '../shared/db';

// initial data replaced by the server:
const initialTodos: Todo[] = [];

export default function () {
  const [todos, setTodos] = useState(initialTodos);
  const [showDone, setShowDone] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [orderBy, setOrderBy] = useState(initialTodoOrderBy); // this can sort by multiple fields, below we just sort by one
  const orderField = () => Object.keys(orderBy)[0];
  const orderOrder = () => Object.values(orderBy)[0];

  // no need for extra fetch anymore since server already sets initialTodos from db
  useAsyncDepEffect(async () => {
    console.log(orderBy);
    setTodos(await db.todo.findMany({include, orderBy}));
  }, [orderBy]); // TODO sort locally?

  const addTodo = async (text: string) => {
    if (text == '') return 'Todo is empty';
    // if (todos.includes(value)) return 'Todo exists';
    // await delay(1000);
    const todo = await db.todo.create({data: {text}, include});
    setTodos([...todos, todo]);
    console.log(todo, todos); // todos not updated yet here
  };

  const delTodo = (index: number) => async () => {
    await db.todo.delete({where: {id: todos[index].id}});
    const newTodos = [...todos];
    newTodos.splice(index, 1); // delete element at index
    console.log(`delTodo(${index}):`, newTodos);
    setTodos(newTodos);
  };

  // TODO make generic and pull out list component
  const setTodo = (index: number) => async ({id, updatedAt, ...todo}: Todo) => { // omit updatedAt so that it's updated by the db
    const data = diff(todos[index], todo);
    console.log('diff:', data);
    if (equals(data, {})) return;
    const newTodo = await db.todo.update({data, where: {id}, include});
    const newTodos = [...todos];
    newTodos[index] = newTodo;
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
        <Menu closeOnSelect={false} closeOnBlur={true}>
          <MenuButton as={Button} size="sm" leftIcon={orderOrder() == 'asc' ? <FaSortAlphaDown /> : <FaSortAlphaUp />}>
            order by
          </MenuButton>
          <MenuList minWidth="200px">
            <MenuOptionGroup defaultValue={orderField()} title="Field" type="radio" onChange={s => setOrderBy({[s.toString()]: orderOrder()})}>
              <MenuItemOption value="createdAt">createdAt</MenuItemOption>
              <MenuItemOption value="updatedAt">updatedAt</MenuItemOption>
              <MenuItemOption value="text">text</MenuItemOption>
            </MenuOptionGroup>
            <MenuDivider />
            <MenuOptionGroup defaultValue={orderOrder()} title="Order" type="radio" onChange={s => setOrderBy({[orderField()]: s})}>
              <MenuItemOption value="asc">Ascending</MenuItemOption>
              <MenuItemOption value="desc">Descending</MenuItemOption>
            </MenuOptionGroup>
          </MenuList>
        </Menu>
      </HStack>
      <Divider my={3} />
      <Stack color="gray.500" align="center">
        <Text>Usage: click an item to edit it (escape to cancel, enter/blur to save).</Text>
        <Text>Page has been open for <code>{time}</code> seconds.</Text>
        <a href="#" onClick={_ => console.table(todos)}>console.table(todos)</a>
      </Stack>
      <ThemeToggle />
    </div>
  );
}
