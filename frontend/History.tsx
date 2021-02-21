
import React, { useState } from 'react';
import { Box, Flex, Heading, Icon, Tag, TagLabel, TagLeftIcon, Text, Tooltip } from '@chakra-ui/react';
import { FaRegCheckCircle, FaRegCircle, FaRegClock, FaRegEdit } from 'react-icons/fa';
import { useAsyncEffect } from './lib/react';
import { duration, cmpBy, groupBy, toDateLS, toTimeLS } from './lib/util';
import { db } from './api'; // api to db on server
import { Time, TodoMutation, historyOpt } from '../shared/db';

// initial data from db replaced by the server:
const dbTimes: Time[] = [];
const dbTodoMutations: TodoMutation[] = [];


// we want to have the union of (Time and TodoMutation) ordered by date desc
// below we merge the two sorted lists from the server into one
// if we want to do it with a query on the server, the following works (but not supported by Prisma):
  // select *, null as "text", null as "done" from "Time" union all select "todoId", "at", null as "end", "text", "done" from "TodoMutation" order by "at" desc;
// -> not good since 'union' requires the same number of fields and compatible types, so we have to replace fields of other tables with null
  // select * from (select *, 'Time' as "table" from "Time") as "t1"
  // natural full join (select *, 'TodoMutation' as "table" from "TodoMutation") as "t2" order by "at" desc;
// -> better because it works generically (but requires extra field to avoid accidental joins)
// can prefix with 'explain analyze' to see execution plan

const at = (x: Time | TodoMutation) => x.at.toString();
let i = 0;
const mergeSort = (times: Time[], mutations: TodoMutation[]) => { // O(n*log(n))?
  // TODO: more efficient merge sort since both are already sorted, see https://wsvincent.com/javascript-merge-two-sorted-arrays/
  console.time(`concat+sort ${i}`);
  const r = [...times, ...mutations].sort(cmpBy(at, 'desc'));
  console.timeEnd(`concat+sort ${i}`);
  i++;
  return r;
};
const toDate = (x: Time | TodoMutation) => toDateLS(new Date(at(x))); // new not composable?
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
  const startDate = new Date(time.at);
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
      const index = preMu[mutation.todoId]?.findIndex(({at}) => at == mutation.at.toString());
      const oldText = preMu[mutation.todoId][index+1]?.text ?? '';
      const now = mutation.text != timu.todo.text ? `(now ${timu.todo.text})` : '';
      return <>{`${oldText} -> ${mutation.text} ${now}`}</>;
    }
    return (<>
      {mutation.done !== null && <Icon as={mutation.done ? FaRegCheckCircle : FaRegCircle} />}
      {mutation.text !== null && <Icon as={FaRegEdit} />}
    </>);
  };
  const time = toTimeLS(new Date(at(timu)));
  return <Flex>
    <Box w={82} fontFamily="'Courier New', monospace">{time}</Box>
    <Box w={95} textAlign="center">
      {'end' in timu
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

export default function History() {
  // const [times, setTimes] = useState(dbTimes);
  // const [todoMutations, setTodoMutations] = useState(dbTodoMutations);
  const [history, setHistory] = useState(dbHistory);
  const [preMu, setPreMu] = useState(dbPreMu);
  useAsyncEffect(async () => {
    const times = await db.time.findMany(historyOpt);
    const mutations = await db.todoMutation.findMany(historyOpt);
    setPreMu(calcPreMu(mutations));
    setHistory(groupBy(toDate, mergeSort(times, mutations)));
    console.log('History reloaded');
  }, []);
  return (<Box>
    {history.map((group, _) =>
      <React.Fragment key={group.group}>
        <Heading size="lg" mt={3}>{group.group}</Heading>
        <Box shadow="md" borderWidth="1px">
          {group.entries.length
            ? group.entries.map(timu => <HistoryEntry timu={timu} preMu={preMu} key={timu.todoId + ('end' in timu ? 't' : 'm') + at(timu)} />)
            : 'Nothing to show...'
          }
        </Box>
      </React.Fragment>
    )}
  </Box>);
}
