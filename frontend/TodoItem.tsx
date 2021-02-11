import React, { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { Box, Button, ButtonGroup, Checkbox, Editable, EditableInput, EditablePreview, Flex, IconButton, IconButtonProps, Spacer, Tag, Tooltip, useEditableState } from '@chakra-ui/react';
import { FaCheck, FaGripVertical, FaPlay, FaRegCheckCircle, FaRegCircle, FaRegClock, FaRegEdit, FaRegTrashAlt, FaStop, FaStopwatch, FaTimes } from 'react-icons/fa';
import { formatDistance } from 'date-fns'; // TODO remove, but Intl.RelativeTimeFormat does not pick unit, see https://github.com/you-dont-need/You-Dont-Need-Momentjs#time-from-now
import { rgtime } from './App';
import type { Todo, TimeData } from '../shared/db';

namespace duration { // formatDuration from date-fns has no way to customize units, default e.g. 7 days 5 hours 9 minutes 30 seconds
  // duration as shortest string given units xs, leading zero only for tail
  let fmt = (t: number, xs: number[]) : string => {
    const [d,...ds] = xs;
    return d
      ? (t >= d ? fmt(Math.floor(t/d), ds) + ':' + (t%d+'').padStart(2, '0') : t.toString())
      : t.toString();
  }
  // up to d:hh:mm:ss, head unit w/o leading zero
  export const format = (s: number) => fmt(s, [60,60,24]);
}

// IconButton2 with defaults size="sm" variant="ghost"
function IconButton2(props: IconButtonProps) {
  const {size = "sm", variant = "ghost", ...rest} = props;
  return (<IconButton size={size} variant={variant} {...rest}></IconButton>);
}

function EditableControls() { // TODO pull out into lib
  const p = useEditableState();
  return p.isEditing ? (
    <ButtonGroup size="sm" isAttached variant="outline">
      <IconButton onClick={p.onSubmit} aria-label="submit" icon={<FaCheck />} />
      {/* <IconButton onClick={p.onCancel} aria-label="cancel" icon={<FaTimes />} /> */}
    </ButtonGroup>
  ) : (
    // <IconButton2 onClick={p.onEdit} aria-label="edit" icon={<FaRegEdit />} />
    <></>
  );
}

// e.g. "prefix 5 days ago" with precise datetime as tooltop on hover
function DateDist(p: {date: Date, prefix?: string}) {
  const date = new Date(p.date); // the value from the db is a date's toISOString(), not a real Date
  const dist = formatDistance(date, new Date(), {includeSeconds: true, addSuffix: true});
  const text = (p.prefix ?? '') + ' ' + dist;
  return (<Tooltip hasArrow label={date.toLocaleString(navigator.language)}>
    {text}
  </Tooltip>);
}

type set = (todo: Todo, times?: TimeData) => void;

function Timer({ todo, set }: { todo: Todo, set: set }) {
  const [running, setRunning] = useState(false);
  const gtime = useRecoilValue(rgtime(running)); // 0 if not running to avoid re-renders
  const [hover, setHover] = useState(false);
  const [time, setTime] = useState(todo.time);
  const [startTime, setStartTime] = useState(0); // calc diff since timer is not reliable
  useEffect(() => { // run every second if running
    if (running && Date.now() - startTime >= 1000) { // might hit start at x.9s global_time -> wait at least 1s before first count
      setTime(time => time + 1);
      // setTime(todo.time + Math.round((Date.now() - startTime) / 1000)); // do this to avoid drift due to delayed timer?
    }
    // console.log(`time: ${todo.text}`); // should only be output for running timers
  }, [gtime]); // gtime will only update if running to avoid useless calls!
  const timer = () => {
    if (!running) {
      setStartTime(Date.now());
      set(todo, { create: { } });
    } else {
      const diff = Math.round((Date.now() - startTime) / 1000);
      console.log(`timer stop: time: ${time - todo.time}, diff: ${diff}`);
      const newTodo = {...todo}; // need to make a shallow copy of the item to mutate, otherwise it's not detected as updated
      newTodo.time += diff;
      set(newTodo, { updateMany: { data: { end: new Date() }, where: { end: null } } }); // TODO is there a symbol for now() on the server? local end time might be not in sync with server start time... https://github.com/prisma/prisma/discussions/5582
      setTime(newTodo.time); // correct accumulated time (prob. too low since it counts every >1s) with precise time from diff
    }
    setRunning(!running);
  };

  return (
    <Button aria-label={running ? 'stop time' : 'start time'}
      leftIcon={running ? <FaStop /> : hover ? <FaPlay /> : <FaRegClock />}
      size="sm" variant="ghost" w={24} justifyContent="left"
      onClick={timer} onMouseEnter={_ => setHover(true)} onMouseLeave={_ => setHover(false)}>{duration.format(time)}
    </Button>
  );
}

export default function TodoItem({ todo, del, set, showDetails }: { todo: Todo, del: () => void, set: set, showDetails: boolean }) {
  const toggle = (done: boolean) => set({...todo, done});
  const submit = (text: string) => {
    if (text == todo.text) return;
    console.log(`Editable.submit: ${text}`);
    set({...todo, text});
  };
  // useEffect(() => { console.log('todo changed', todo); }, [todo]);
  // submitOnBlur true (default) will also submit on Esc (only with Surfingkeys enabled) and when clicking the cancel button, see https://github.com/chakra-ui/chakra-ui/issues/3198
  return (
    <Flex opacity={todo.done ? '40%' : '100%'} >
      {/* <IconButton2 aria-label="drag to reorder" icon={<FaGripVertical />} /> */}
      <Checkbox mr={2} isChecked={todo.done} onChange={e => toggle(e.target.checked)} colorScheme="green" />
      {/* <IconButton2 onClick={e => {todo.done = !todo.done; set(todo);}} aria-label="done" icon={todo.done ? <FaRegCheckCircle /> : <FaRegCircle />} isRound={true} /> */}
      <Editable defaultValue={todo.text} submitOnBlur={true} w="300px" onSubmit={submit} onCancel={e => console.log('Editable.cancel:', e)}>
        {(p) => (<>
          <Flex>
            <Box w="260px" onClick={p.onEdit}>
              <EditablePreview />
              <EditableInput />
            </Box>
            <Spacer />
            <EditableControls />
          </Flex>
          { showDetails && <Box><DateDist prefix="created" date={todo.createdAt}/>, <DateDist prefix="updated" date={todo.updatedAt}/></Box> }
        </>)}
      </Editable>
      <Spacer />
      {/* <IconButton2 onClick={e => console.log(e)} aria-label="edit" icon={<FaRegEdit />} /> */}
      <IconButton2 onClick={del} aria-label="delete" icon={<FaRegTrashAlt />} />
      <Timer todo={todo} set={set} />
    </Flex>
  )
}
