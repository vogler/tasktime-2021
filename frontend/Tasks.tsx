
import React, { useState, useEffect } from 'react';
import { atom, selectorFamily, useRecoilState } from 'recoil';
import { Box, Button, Divider, HStack, Menu, MenuButton, MenuDivider, MenuItemOption, MenuList, MenuOptionGroup, Text, VStack } from '@chakra-ui/react';
import { FaRegEye, FaRegEyeSlash, FaSortAlphaDown, FaSortAlphaUp } from 'react-icons/fa';
import { useAsyncDepEffect } from './lib/react';
import { cmpBy, diff, equals } from './lib/util';
import InputForm from './lib/InputForm';
import TodoItem from './TodoItem';
import { db } from './api'; // api to db on server
import { Todo, include, todoOrderBy, TimeMutation } from '../shared/db';
import { maxW, user } from './App';
import Autocomplete from './lib/Autocomplete';

// initial data from db replaced by the server:
const dbTodos: Todo[] = [];


// global time since load
const gtime = atom({
  key: 'gtime',
  default: 0,
});
// shared global time for running timers. just using gtime would lead to re-render even if local timer is not running.
export const rgtime = selectorFamily({
  key: 'rgtime',
  get: (running: boolean) => ({ get }) => running ? get(gtime) : 0,
});
function Timer() { // this is its own componenent, otherwise the whole app rerenders every second
  const [time, setTime] = useRecoilState(gtime);
  useEffect(() => {
    const timer = setTimeout(() => setTime(time + 1), 1000); // + 1 every second
    return () => clearTimeout(timer);
  }, [time]);

  return <>{time}</>;
}

const atodos = atom({ key: 'todos', default: dbTodos }); // recoil atom instead of useState since AddTodo should not rerender after addTodo and therefore must not be in/under some component that has the todos via useState

function AddTodo() {
  const [todos, setTodos] = useRecoilState(atodos);

  const addTodo = async (text: string) => {
    if (text == '') return 'Task is empty';
    // if (todos.includes(value)) return 'Todo exists';
    // await delay(1000);
    const todo = await db.todo.create({data: {text, mutations: {create: {text}}, user: {connect: {id: user?.id}}}, include});
    setTodos([...todos, todo]);
    console.log('addTodo', todo, todos); // todos not updated yet here
  };

  return <InputForm submit={addTodo} inputProps={{placeholder: 'new task...', autoComplete: 'off', autoFocus: true /* does nothing */}} />;
}

export default function Tasks() { // Collect
  const [todos, setTodos] = useRecoilState(atodos);
  const [showDone, setShowDone] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [orderBy, setOrderBy] = useState(todoOrderBy); // this can sort by multiple fields, below we just sort by one
  const order = {
    field: Object.keys(orderBy)[0] as keyof Todo,
    order: (Object.values(orderBy)[0] ?? 'asc') as 'asc' | 'desc', // TODO type-safe
  };

  // no need for extra fetch anymore since server already sets initialTodos from db
  useAsyncDepEffect(async () => {
    console.log(orderBy);
    // setTodos(await db.todo.findMany({include, orderBy, where: {userId: user?.id}}));
    // we sort locally now, see orderedTodos below
  }, [orderBy]);

  const delTodo = (todo: Todo) => async () => {
    const count = await db.time.count({where: {todoId: todo.id}});
    if (count) {
      if (confirm(`There are ${count} time entries recorded for this item. Do you want to delete this item and all its history?`)) {
        await db.time.deleteMany({where: {todoId: todo.id}});
      } else return;
    }
    await db.todoMutation.deleteMany({where: {todoId: todo.id}});
    await db.todo.delete({where: {id: todo.id}});
    const newTodos = [...todos].filter(x => x.id != todo.id);
    setTodos(newTodos);
    console.log('delTodo', todo);
  };

  // TODO make generic and pull out list component
  const setTodo = (todo: Todo) => async ({id, createdAt, updatedAt, ...todo2}: Todo, times?: TimeMutation) => { // omit updatedAt so that it's updated by the db; omit createdAt because diff detects it as different because dates in todos are string insteada of Date TODO create Date in db wrapper
    const data = diff(todo, todo2); // entries from todo2 that are different from todo
    console.log('setTodo: diff:', data, 'times:', times);
    if (equals(data, {}) && !times) return; // no changes
    const {time, ...mutableData} = data; // need to filter out memoized fields. TODO generic pick of fields in TodoMutation?
    if (!equals(mutableData, {}))
      data.mutations = {create: {...mutableData}};
    data.times = times;
    const newTodo = await db.todo.update({data, where: {id}, include});
    console.log('setTodo: db:', newTodo);
    const newTodos = [...todos].map(x => x.id == newTodo.id ? newTodo : x);
    setTodos(newTodos);
  };

  const filteredTodos = !showDone ? todos.filter(todo => !todo.done) : todos;
  const orderedTodos = [...filteredTodos].sort(cmpBy(x => x[order.field], order.order));

  return (
    <>
      <VStack w='100%' maxW={maxW}>
        <AddTodo />
        <Autocomplete />
        <Box shadow="md" borderWidth="1px" my="2" p="1" w='100%' as="main">
          {orderedTodos.length
            ? orderedTodos.map(todo => (
                <TodoItem {...{ todo, showDetails }} key={todo.id} del={delTodo(todo)} set={setTodo(todo)} />
              )) // do not use index as key since it changes with the order of the list and on deletion
            : <Text px={2} py={1}>Nothing to show...</Text>}
        </Box>
      </VStack>
      <HStack mb={2}>
        <Button size="sm" leftIcon={showDone ? <FaRegEyeSlash /> : <FaRegEye />} onClick={_ => setShowDone(!showDone)}>{showDone ? 'hide' : 'show'} done</Button>
        <Button size="sm" leftIcon={showDetails ? <FaRegEyeSlash /> : <FaRegEye />} onClick={_ => setShowDetails(!showDetails)}>{showDetails ? 'hide' : 'show'} details</Button>
        <Menu closeOnSelect={false} closeOnBlur={true}>
          <MenuButton as={Button} size="sm" leftIcon={order.order == 'asc' ? <FaSortAlphaDown /> : <FaSortAlphaUp />}>
            order by
          </MenuButton>
          <MenuList minWidth="200px">
            <MenuOptionGroup defaultValue={order.field.toString()} title="Field" type="radio" onChange={s => setOrderBy({[s.toString()]: order.order})}>
              <MenuItemOption value="createdAt">createdAt</MenuItemOption>
              <MenuItemOption value="updatedAt">updatedAt</MenuItemOption>
              <MenuItemOption value="text">text</MenuItemOption>
              <MenuItemOption value="time">time</MenuItemOption>
            </MenuOptionGroup>
            <MenuDivider />
            <MenuOptionGroup defaultValue={order.order.toString()} title="Order" type="radio" onChange={s => setOrderBy({[order.field]: s})}>
              <MenuItemOption value="asc">Ascending</MenuItemOption>
              <MenuItemOption value="desc">Descending</MenuItemOption>
            </MenuOptionGroup>
          </MenuList>
        </Menu>
      </HStack>
      <Divider />
      <VStack color="gray.500" as="footer">
        <Text>Usage: click an item to edit it (escape to cancel, enter/blur to save).</Text>
        <Text>Marking as completed stops the timer; starting a completed task marks it as uncompleted.</Text>
        <Text>Page has been open for <code><Timer /></code> seconds.</Text>
        <a href="#" onClick={_ => console.table(todos)}>console.table(todos)</a>
      </VStack>
    </>
  );
}
