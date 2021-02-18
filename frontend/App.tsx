import React, { useState, useEffect } from 'react';
import { atom, selectorFamily, useRecoilState } from 'recoil';
import { Box, Button, ButtonGroup, Divider, Flex, Heading, HStack, Icon, Menu, MenuButton, MenuDivider, MenuItemOption, MenuList, MenuOptionGroup, Stack, Tag, TagLabel, TagLeftIcon, Text, Tooltip, VStack } from '@chakra-ui/react';
import { FaRegCheckCircle, FaRegCircle, FaRegClock, FaRegEdit, FaRegEye, FaRegEyeSlash, FaSortAlphaDown, FaSortAlphaUp } from 'react-icons/fa';
import { useAsyncDepEffect, useAsyncEffect } from './lib/react';
import { diff, equals, duration, cmpBy, groupBy, toDateLS, toTimeLS } from './lib/util';
import InputForm from './lib/InputForm';
import ThemeToggle from './lib/ThemeToggle';
import TodoItem from './TodoItem';
import { db } from './api'; // api to db on server
import { Todo, Time, include, dbTodoOrderBy, TimeMutation, TodoMutation, timeInclude } from '../shared/db';
import { BrowserRouter as Router, Switch, Route, Link, useLocation } from "react-router-dom";

// @ts-ignore
globalThis.db = db; // for direct db access in Chrome console, TODO remove

// initial data from db replaced by the server:
const dbTodos: Todo[] = [];
const dbTimes: Time[] = [];
const dbTodoMutations: TodoMutation[] = [];

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
function Timer() { // this is its own componenent, otherwise the whole app rerenders every second
  const [time, setTime] = useRecoilState(gtime);
  useEffect(() => {
    const timer = setTimeout(() => setTime(time + 1), 1000); // + 1 every second
    return () => clearTimeout(timer);
  }, [time]);

  return (<>{time}</>);
}

const atodos = atom({ key: 'todos', default: dbTodos }); // recoil atom instead of useState since AddTodo should not rerender after addTodo and therefore must not be in/under some component that has the todos via useState

function AddTodo() {
  const [todos, setTodos] = useRecoilState(atodos);

  const addTodo = async (text: string) => {
    if (text == '') return 'Task is empty';
    // if (todos.includes(value)) return 'Todo exists';
    // await delay(1000);
    const todo = await db.todo.create({data: {text, mutations: {create: {text}}}, include});
    setTodos([...todos, todo]);
    console.log('addTodo', todo, todos); // todos not updated yet here
  };

  return <InputForm submit={addTodo} inputProps={{placeholder: 'new task...', autoComplete: 'off', autoFocus: true /* does nothing */}} />;
}

function Tasks() { // Collect
  const [todos, setTodos] = useRecoilState(atodos);
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

  const delTodo = (index: number) => async () => {
    const todo = todos[index];
    const count = await db.time.count({where: {todoId: todo.id}});
    if (count && confirm(`There are ${count} times recorded for this item. Delete all?`)) {
      await db.time.deleteMany({where: {todoId: todo.id}});
    }
    await db.todoMutation.deleteMany({where: {todoId: todo.id}});
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
    if (equals(data, {}) && !times) return; // no changes
    const {time, ...mutableData} = data; // need to filter out memoized fields. TODO generic pick of fields in TodoMutation?
    if (!equals(mutableData, {}))
      data.mutations = {create: {...mutableData}};
    data.times = times;
    const newTodo = await db.todo.update({data, where: {id}, include});
    console.log('setTodo: db:', newTodo);
    const newTodos = [...todos];
    newTodos[index] = newTodo;
    setTodos(newTodos);
  };

  const filteredTodos = !showDone ? todos.filter(todo => !todo.done) : todos;

  return (
    <>
      <AddTodo />
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
        <Text>Marking as completed stops the timer; starting a completed task marks it as uncompleted.</Text>
        <Text>Page has been open for <code><Timer /></code> seconds.</Text>
        <a href="#" onClick={_ => console.table(todos)}>console.table(todos)</a>
      </VStack>
      <ThemeToggle />
    </>
  );
}


const date = (x: Time | TodoMutation) => ('start' in x ? x.start : x.at).toString();
let i = 0;
const mergeSort = (times: Time[], mutations: TodoMutation[]) => { // O(n*log(n))?
  // TODO: more efficient merge sort since both are already sorted, see https://wsvincent.com/javascript-merge-two-sorted-arrays/
  console.time(`concat+sort ${i}`);
  const r = [...times, ...mutations].sort(cmpBy(date, 'desc'));
  console.timeEnd(`concat+sort ${i}`);
  i++;
  return r;
};
const toDate = (x: Time | TodoMutation) => toDateLS(new Date(date(x))); // new not composable?
const dbHistory = groupBy(toDate, mergeSort(dbTimes, dbTodoMutations)); // If we do this in History, it is executed 4 times instead of once. However, here it is always executed, not just when History is mounted.

const calcPreMu = (mutations: TodoMutation[]) => { // O(n)
  // hashtable to lookup the previous mutation's text to show diff
  let preMu: { [todoId: number]: {at: string; text: string}[] } = {};
  // fill lookup hashtable preMu
  mutations.forEach(m => {
    if (m.text !== null) { // only care about text since done is just inverted
      if (!preMu[m.todoId]) preMu[m.todoId] = [];
      preMu[m.todoId].push({at: m.at.toString(), text: m.text});
    }
  });
  return preMu;
}
const dbPreMu = calcPreMu(dbTodoMutations);

const TimeDetail = ({time}: {time: Time}) => {
  const startDate = new Date(time.start);
  const endDate = new Date(time.end ?? Date.now());
  const seconds = Math.round((endDate.getTime() - startDate.getTime()) / 1000);
  const running = !time.end ? '(running)' : '';
  return <>
    <Tag variant="outline">
      <TagLeftIcon as={FaRegClock} />
      <TagLabel>
        <Tooltip hasArrow label={`until ${toTimeLS(endDate)}`}>{`${duration.format(seconds)}`}</Tooltip>
      </TagLabel>
    </Tag>
    <Text>{running}</Text>
  </>;
};
function HistoryEntry({timu, preMu}: {timu: Time | TodoMutation, preMu: typeof dbPreMu}) {
  const MutationDetail = ({mutation, text = false}: {mutation: TodoMutation, text?: boolean}) => { // could pull out, but would need to add timu, preMu
    if (text) {
      const index = preMu[mutation.todoId]?.findIndex(({at,..._}) => at == mutation.at.toString());
      const oldText = preMu[mutation.todoId][index+1]?.text ?? '';
      const now = mutation.text != timu.todo.text ? `(now ${timu.todo.text})` : '';
      return <>{`${oldText} -> ${mutation.text} ${now}`}</>;
    }
    return (<>
      {mutation.done !== null && <Icon as={mutation.done ? FaRegCheckCircle : FaRegCircle} />}
      {mutation.text !== null && <Icon as={FaRegEdit} />}
    </>);
  };
  const time = toTimeLS(new Date(date(timu)));
  return <Flex>
    <Box w={82} fontFamily="'Courier New', monospace">{time}</Box>
    <Box w={95} textAlign="center">
      {'start' in timu
        ? <TimeDetail time={timu} />
        : <MutationDetail mutation={timu} />
      }
    </Box>
    {'text' in timu && timu.text !== null
      ? <MutationDetail mutation={timu} text={true} />
      : timu.todo.text
    }
  </Flex>;
}

function History() {
  // const [times, setTimes] = useState(dbTimes);
  // const [todoMutations, setTodoMutations] = useState(dbTodoMutations);
  const [history, setHistory] = useState(dbHistory);
  const [preMu, setPreMu] = useState(dbPreMu);
  useAsyncEffect(async () => {
    const times = await db.time.findMany({include: timeInclude, orderBy: {start: 'desc'}});
    const mutations = await db.todoMutation.findMany({include: timeInclude, orderBy: {at: 'desc'}});
    setPreMu(calcPreMu(mutations));
    setHistory(groupBy(toDate, mergeSort(times, mutations)));
    console.log('History reloaded');
  }, []);
  return (<Box>
    {history.map((group, _) =>
      <React.Fragment key={group.group}>
        <Heading size="lg" mt={3}>{group.group}</Heading>
        <Box shadow="md" borderWidth="1px">
          {group.entries.map(timu =>
            <HistoryEntry timu={timu} preMu={preMu} key={timu.todoId+date(timu)} />
          )}
        </Box>
      </React.Fragment>
    )}
  </Box>);
}

function Navigation() {
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

export default function () {
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
