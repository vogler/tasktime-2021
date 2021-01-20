import { Box, ButtonGroup, Checkbox, Editable, EditableInput, EditablePreview, Flex, Icon, IconButton, Spacer, useEditableState } from '@chakra-ui/react';
import React from 'react';
import { FaCheck, FaGripVertical, FaPlay, FaRegCheckCircle, FaRegCircle, FaRegClock, FaRegEdit, FaRegTrashAlt, FaStop, FaStopwatch, FaTimes } from 'react-icons/fa';
import type * as todo from '../model/todo';

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


export default function TodoItem({ todo, del, set }: { todo: todo.t, del: () => void, set: (x: todo.t) => void }) {
  const submit = (text: string) => {
    console.log(`submit: ${text}`);
    todo.text = text;
    set(todo);
  };
  // submitOnBlur true (default) will also submit on Esc and when clicking the cancel button
  return (
    <Flex opacity={todo.done ? '40%' : '100%'} >
      {/* <IconButton aria-label="drag to reorder" icon={<FaGripVertical />} size="sm" variant="ghost" /> */}
      <Checkbox mr={2} isChecked={todo.done} onChange={e => {todo.done = e.target.checked; set(todo);}} colorScheme="green" />
      {/* <IconButton onClick={e => {todo.done = !todo.done; set(todo);}} aria-label="done" icon={todo.done ? <FaRegCheckCircle /> : <FaRegCircle />} size="sm" variant="ghost" isRound={true} /> */}
      <Editable defaultValue={todo.text} submitOnBlur={false} w="300px"
        onSubmit={submit}>
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

      <IconButton aria-label="duration" icon={<FaStopwatch />} size="sm" variant="ghost" />
      <IconButton aria-label="duration" icon={<FaRegClock />} size="sm" variant="ghost" />
      <IconButton aria-label="duration" icon={<FaPlay />} size="sm" variant="ghost" />
      <IconButton aria-label="duration" icon={<FaStop />} size="sm" variant="ghost" />
    </Flex>
  )
}