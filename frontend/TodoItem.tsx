import React, { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { Box, Button, ButtonGroup, Checkbox, Editable, EditableInput, EditablePreview, Flex, IconButton, IconButtonProps, Spacer, Tooltip, useEditableState } from '@chakra-ui/react';
import { FaCheck, FaGripVertical, FaPlay, FaRegCheckCircle, FaRegCircle, FaRegClock, FaRegEdit, FaRegTrashAlt, FaStop, FaStopwatch, FaTimes } from 'react-icons/fa';
import { formatDistance } from 'date-fns'; // TODO remove, but Intl.RelativeTimeFormat does not pick unit, see https://github.com/you-dont-need/You-Dont-Need-Momentjs#time-from-now
import { duration } from './lib/util';
import { useDepEffect } from './lib/react';
import { rgtime } from './Tasks';
import type { Todo, TimeMutation } from '../shared/db';

// IconButton with defaults size="sm" variant="ghost"
function IconButtonSG(props: IconButtonProps) {
  const { size = 'sm', variant = 'ghost', ...rest } = props;
  return <IconButton size={size} variant={variant} {...rest}></IconButton>;
}

function EditableControls() { // TODO pull out into lib
  const p = useEditableState();
  return p.isEditing ? (
    <ButtonGroup size="sm" isAttached variant="outline">
      <IconButton onClick={p.onSubmit} aria-label="submit" icon={<FaCheck />} />
      {/* <IconButton onClick={p.onCancel} aria-label="cancel" icon={<FaTimes />} /> */}
    </ButtonGroup>
  ) : (
    // <IconButtonSG onClick={p.onEdit} aria-label="edit" icon={<FaRegEdit />} />
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

type set = (todo: Todo, times?: TimeMutation) => void;

function Timer({ todo, set, done }: { todo: Todo, set: set, done: boolean }) {
  const lastTime = todo.times[0]; // relies on times being orderBy: {at: 'desc'}
  const [running, setRunning] = useState(lastTime?.end === null);
  const gtime = useRecoilValue(rgtime(running)); // 0 if not running to avoid re-renders
  const [startTime, setStartTime] = useState(lastTime ? Date.parse(lastTime.at.toString()) : 0); // calc diff since timer is not reliable
  const interval = Math.round((Date.now() - startTime) / 1000); // time the current interval has been running
  const [time, setTime] = useState(todo.time + (running ? interval : 0)); // total time
  useEffect(() => { // run every second if running
    if (running && Date.now() - startTime >= 1000) { // might hit start at x.9s global_time -> wait at least 1s before first count
      setTime(time => time + 1);
      // setTime(todo.time + Math.round((Date.now() - startTime) / 1000)); // do this to avoid drift due to delayed timer?
    }
    // console.log(`time: ${todo.text}`); // should only be output for running timers
  }, [gtime]); // gtime will only update if running to avoid useless calls!
  useDepEffect(() => {
    if (done && running) {
      console.log('Timer: stop on done!');
      setRunning(false);
    } else {
      set({...todo, done}); // just update done
    }
  }, [done]);
  useDepEffect(() => {
    let newTodo = {...todo, done}; // need to make a shallow copy of the item to mutate, otherwise it's not detected as updated
    if (running) {
      if (done) {
        console.log('Timer: mark undone on start!');
        newTodo.done = false;
      }
      setStartTime(Date.now());
      set(newTodo, { create: { } });
    } else if (time - todo.time) { // to ignore trigger from HMR
      console.log(`timer stop: interval from counter: ${time - todo.time}, interval from startTime: ${interval}`);
      newTodo.time += interval;
      set(newTodo, { updateMany: { data: { end: new Date() }, where: { end: null } } }); // TODO is there a symbol for now() on the server? local end time might be not in sync with server start time... https://github.com/prisma/prisma/discussions/5582
      setTime(newTodo.time); // correct accumulated time (prob. too low since it counts every >1s) with precise time from diff
    }
  }, [running]);
  const [hover, setHover] = useState(false);

  return (
    <Button aria-label={running ? 'stop time' : 'start time'}
      leftIcon={running ? <FaStop /> : hover ? <FaPlay /> : <FaRegClock />}
      size="sm" variant="ghost" w={24} justifyContent="left"
      onClick={_ => setRunning(!running)} onMouseEnter={_ => setHover(true)} onMouseLeave={_ => setHover(false)}>
        {duration.format(time)}
    </Button>
  );
}

export default function TodoItem({ todo, del, set, showDetails }: { todo: Todo, del: () => void, set: set, showDetails: boolean }) {
  const [done, setDone] = useState(todo.done); // to keep (done => !running && running => !done) we need to let Timer know about done
  useDepEffect(() => setDone(todo.done), [todo]); // when Timer sets !done on running, the change comes through todo, but the above useState alone does not update
  const toggle = (done: boolean) => {
    setDone(done);
    // set({...todo, done}); // this was enough to just update done; now Timer handles updates to keep running/done in sync
  };
  const submit = (text: string) => {
    if (text == todo.text) return;
    console.log(`Editable.submit: ${text}`);
    set({...todo, text});
  };
  // useEffect(() => { console.log('todo changed', todo); }, [todo]);
  // submitOnBlur true (default) will also submit on Esc (only with Surfingkeys enabled) and when clicking the cancel button, see https://github.com/chakra-ui/chakra-ui/issues/3198
  return (
    <Flex opacity={todo.done ? '40%' : '100%'}>
      {/* <IconButtonSG aria-label="drag to reorder" icon={<FaGripVertical />} /> */}
      <Checkbox m={2} alignSelf="start" isChecked={todo.done} onChange={e => toggle(e.target.checked)} colorScheme="green" />
      {/* <IconButtonSG onClick={e => {todo.done = !todo.done; set(todo);}} aria-label="done" icon={todo.done ? <FaRegCheckCircle /> : <FaRegCircle />} isRound={true} /> */}
      <Editable defaultValue={todo.text} submitOnBlur={true} w="100%" onSubmit={submit} onCancel={e => console.log('Editable.cancel:', e)}>
        {(p) => (<>
          <Flex>
            <Box w='100%' pr={1} onClick={p.onEdit}>
              <EditablePreview />
              <EditableInput />
            </Box>
            <Spacer />
            <EditableControls />
          </Flex>
          { showDetails && <Box><DateDist prefix="created" date={todo.createdAt}/><br/><DateDist prefix="updated" date={todo.updatedAt}/></Box> }
        </>)}
      </Editable>
      <Spacer />
      {/* <IconButtonSG onClick={e => console.log(e)} aria-label="edit" icon={<FaRegEdit />} /> */}
      <IconButtonSG onClick={del} aria-label="delete" icon={<FaRegTrashAlt />} />
      <Timer {...{todo, done, set}} />
    </Flex>
  );
}
