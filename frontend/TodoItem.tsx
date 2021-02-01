import React, { useEffect, useState } from 'react';
import { Box, Button, ButtonGroup, Checkbox, Editable, EditableInput, EditablePreview, Flex, IconButton, Spacer, Tag, useEditableState } from '@chakra-ui/react';
import { FaCheck, FaGripVertical, FaPlay, FaRegCheckCircle, FaRegCircle, FaRegClock, FaRegEdit, FaRegTrashAlt, FaStop, FaStopwatch, FaTimes } from 'react-icons/fa';
import type { Todo } from '@prisma/client';
// import { formatDuration } from 'date-fns'; // no nice way to customize

namespace duration {
  // duration as shortest string given units xs, leading zero only for tail
  let fmt = (t: number, xs: number[]) : string => {
    const [d,...ds] = xs;
    return d
      ? (t >= d ? fmt(Math.floor(t/d), ds) + ':' + (t%d+'').padStart(2, '0') : t.toString())
      : t.toString();
  }
  // hh:mm:ss
  export const format = (s: number) => fmt(s, [60,60,24]);
}

function EditableControls() { // TODO pull out into lib
  const p = useEditableState();
  return p.isEditing ? (
    <ButtonGroup size="sm" isAttached variant="outline">
      <IconButton onClick={p.onSubmit} aria-label="submit" icon={<FaCheck />} />
      <IconButton onClick={p.onCancel} aria-label="cancel" icon={<FaTimes />} />
    </ButtonGroup>
  ) : (
    <IconButton onClick={p.onEdit} aria-label="edit" icon={<FaRegEdit />} size="sm" variant="ghost" />
  );
}


export default function TodoItem({ todo, del, set, global_time }: { todo: Todo, del: () => void, set: (x: Todo) => void, global_time: number }) {
  const submit = (text: string) => {
    console.log(`Editable.submit: ${text}`);
    todo.text = text;
    set(todo);
  };
  const [running, setRunning] = useState(false);
  const [hover, setHover] = useState(false);
  const [time, setTime] = useState(todo.time);
  const [startTime, setStartTime] = useState(0); // calc diff since timer is not reliable
  useEffect(() => { // run every second if running
    if (running && Date.now() - startTime >= 1000) { // might hit start at x.9s global_time -> wait at least 1s before first count
      setTime(time + 1);
      // setTime(todo.time + Math.round((Date.now() - startTime) / 1000)); // do this to avoid drift due to delayed timer?
    }
    // console.log(`time: ${todo.text}`); // should only be output for running timers
  }, [running && global_time]); // only depend on global_time if running to avoid useless calls!
  const timer = () => {
    if (!running) {
      setStartTime(Date.now());
    } else {
      const diff = Math.round((Date.now() - startTime) / 1000);
      console.log(`time: ${time - todo.time}, diff: ${diff}`);
      const newTodo = {...todo}; // need to make a shallow copy of the item to mutate, otherwise it's not detected as updated
      newTodo.time += diff;
      set(newTodo);
      setTime(newTodo.time); // correct accumulated time (prob. too low since it counts every >1s) with precise time from diff
    }
    setRunning(!running);
  };
  // useEffect(() => { console.log('todo changed', todo); }, [todo]);
  // submitOnBlur true (default) will also submit on Esc (only with Surfingkeys enabled) and when clicking the cancel button, see https://github.com/chakra-ui/chakra-ui/issues/3198
  return (
    <Flex opacity={todo.done ? '40%' : '100%'} >
      {/* <IconButton aria-label="drag to reorder" icon={<FaGripVertical />} size="sm" variant="ghost" /> */}
      <Checkbox mr={2} isChecked={todo.done} onChange={e => {todo.done = e.target.checked; set(todo);}} colorScheme="green" />
      {/* <IconButton onClick={e => {todo.done = !todo.done; set(todo);}} aria-label="done" icon={todo.done ? <FaRegCheckCircle /> : <FaRegCircle />} size="sm" variant="ghost" isRound={true} /> */}
      <Editable defaultValue={todo.text} submitOnBlur={false} w="300px" onSubmit={submit}>
        <Flex>
          <Box w="240px">
            <EditablePreview />
            <EditableInput />
          </Box>
          <Spacer />
          <EditableControls />
        </Flex>
      </Editable>
      <Spacer />
      <IconButton onClick={del} aria-label="delete" icon={<FaRegTrashAlt />} size="sm" variant="ghost" />

      {/* <IconButton aria-label="duration" icon={<FaStopwatch />} size="sm" variant="ghost" />
      <Tag size="sm" variant="subtle" borderRadius="full">00:00</Tag> */}
      <Button aria-label={running ? 'stop time' : 'start time'} leftIcon={running ? <FaStop /> : hover ? <FaPlay /> : <FaRegClock />} size="sm" variant="ghost" w={24} justifyContent="left" onClick={timer} onMouseEnter={_ => setHover(true)} onMouseLeave={_ => setHover(false)}>{duration.format(time)}</Button>
    </Flex>
  )
}
