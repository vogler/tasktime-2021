import React, { useState, useEffect } from 'react';
import { atom, selectorFamily, useRecoilState } from 'recoil';
import { Box, Button, ButtonGroup, Divider, Heading, HStack, Menu, MenuButton, MenuDivider, MenuItemOption, MenuList, MenuOptionGroup, Stack, Text, Tooltip, VStack } from '@chakra-ui/react';
import { FaRegEye, FaRegEyeSlash, FaSortAlphaDown, FaSortAlphaUp } from 'react-icons/fa';
import { useAsyncDepEffect } from './lib/react';
import { diff, equals, duration } from './lib/util';
import InputForm from './lib/InputForm';
import ThemeToggle from './lib/ThemeToggle';
import TodoItem from './TodoItem';
import { db } from './api'; // api to db on server
import { Todo, Time, include, dbTodoOrderBy, TimeMutation } from '../shared/db';
import { BrowserRouter as Router, Switch, Route, Link, NavLink, useRouteMatch, useLocation } from "react-router-dom";

// @ts-ignore
globalThis.db = db; // for direct db access in Chrome console, TODO remove

// initial data from db replaced by the server:
const dbTodos: Todo[] = [];
const dbTimes: Time[] = [];

// global time since load
const gtime = atom({
  key: 'gtime',
  default: 0,
});
// shared global time for running timers. just using gtime would lead to re-render even if local timer is not running.
export const rgtime = selectorFamily({
  key: 'rgtime',
  get: (running: boolean) => ({get}) =>
     running ? get(gtime) : 0
});

function Timer() { // put in its own componenent, otherwise the whole app rerenders every second
  const [time, setTime] = useRecoilState(gtime);
  useEffect(() => {
    const timer = setTimeout(() => setTime(time + 1), 1000); // + 1 every second
    return () => clearTimeout(timer);
  }, [time]);

  return (<>{time}</>);
}
export default function () {
  const [todos, setTodos] = useState(dbTodos);
  const [showDone, setShowDone] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [orderBy, setOrderBy] = useState(dbTodoOrderBy); // this can sort by multiple fields, below we just sort by one
  const orderField = () => Object.keys(orderBy)[0];
  const orderOrder = () => Object.values(orderBy)[0];

  // no need for extra fetch anymore since server already sets initialTodos from db
  useAsyncDepEffect(async () => {
    console.log(orderBy);
    setTodos(await db.todo.findMany({include, orderBy}));
  }, [orderBy]); // TODO sort locally?

  const addTodo = async (text: string) => {
    if (text == '') return 'Task is empty';
    // if (todos.includes(value)) return 'Todo exists';
    // await delay(1000);
    const todo = await db.todo.create({data: {text}, include});
    setTodos([...todos, todo]);
    console.log('addTodo', todo, todos); // todos not updated yet here
  };

  const delTodo = (index: number) => async () => {
    const todo = todos[index];
    const count = await db.time.count({where: {todoId: todo.id}});
    if (count && confirm(`There are ${count} times recorded for this item. Delete all?`)) {
      await db.time.deleteMany({where: {todoId: todo.id}});
    }
    await db.todo.delete({where: {id: todo.id}});
    const newTodos = [...todos];
    newTodos.splice(index, 1); // delete element at index
    setTodos(newTodos);
    console.log('delTodo', todo);
  };

  // TODO make generic and pull out list component
  const setTodo = (index: number) => async ({id, updatedAt, ...todo}: Todo, times?: TimeMutation) => { // omit updatedAt so that it's updated by the db
    const data = diff(todos[index], todo);
    console.log('setTodo: diff:', data, 'times:', times);
    if (equals(data, {}) && !times) return;
    data.times = times;
    const newTodo = await db.todo.update({data, where: {id}, include});
    console.log('setTodo: db:', newTodo);
    const newTodos = [...todos];
    newTodos[index] = newTodo;
    setTodos(newTodos);
  };

  const filteredTodos = !showDone ? todos.filter(todo => !todo.done) : todos;

  const Tasks = () => ( // Collect
    <>
      <InputForm submit={addTodo} inputProps={{placeholder: 'new task...', autoComplete: 'off', autoFocus: true /* does nothing*/}} />
      <Box shadow="md" borderWidth="1px" m="3" p="2">
        { filteredTodos.length
          ? filteredTodos.map((todo, index) => <TodoItem todo={todo} key={todo.id} del={delTodo(index)} set={setTodo(index)} showDetails={showDetails} />) // do not use index as key since it changes with the order of the list and on deletion
          : "Nothing to show..."
        }
      </Box>
      <HStack mb={2}>
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
      <Divider />
      <VStack color="gray.500">
        <Text>Usage: click an item to edit it (escape to cancel, enter/blur to save).</Text>
        <Text>Page has been open for <code><Timer /></code> seconds.</Text>
        <a href="#" onClick={_ => console.table(todos)}>console.table(todos)</a>
      </VStack>
      <ThemeToggle />
    </>
  );

  const History = () => {
    const [times, setTimes] = useState(dbTimes);
    let curDate: string;
    return (<Box>
      {times.map((time, index) => {
          if (!time.end) return;
          const startDate = new Date(time.start);
          const endDate = new Date(time.end);
          const date = endDate.toLocaleDateString(navigator.language);
          const toTime = (d: Date) => d.toLocaleTimeString(navigator.language);
          const seconds = Math.round((endDate.getTime() - startDate.getTime()) / 1000);
          const key = time.todoId + ' ' + time.start.toString();
          return <Box key={key}>
            {curDate != date && (curDate = date) && <Heading size="lg">{date}</Heading>}
            {/* <p>{JSON.stringify(time)}</p> */}
            <p><Tooltip hasArrow label={toTime(endDate)}>{toTime(startDate)}</Tooltip> for {duration.format(seconds)} - {time.todo.text}</p>
          </Box>;
        }
      )}
    </Box>);
  };

  const Navigation = () => {
    const location = useLocation();
    // console.log('location', location); // re-executes on e.g. setTodo (also if component definition is moved out)
    useEffect(() => {
      document.title = 'track-time' + ' - ' + (location.pathname == '/' ? 'tasks' : location.pathname.replace(/^\//, ''));
    }, [location]);
    const NavButton = ({ text, to = '/'+text.toLowerCase() } : { text: string, to?: string }) =>
      <Button as={Link} to={to} isActive={location.pathname == to} borderTopRadius="0">{text}</Button>;
    return (
      <ButtonGroup isAttached variant="outline" >
        <NavButton text="Tasks" to="/" />
        <NavButton text="History" />
      </ButtonGroup>
    );
  }

  return (
    <Router>
      <VStack>
        <Navigation />
        <Switch>
          <Route exact path="/">
            <Tasks />
          </Route>
          <Route path="/history">
            <History />
          </Route>
        </Switch>
      </VStack>
    </Router>
  );
}
