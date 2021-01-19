import { Box, ButtonGroup, Editable, EditableInput, EditablePreview, Flex, IconButton, Spacer, useEditableState } from '@chakra-ui/react';
import React from 'react';
import { FaCheck, FaRegEdit, FaRegTrashAlt, FaTimes } from 'react-icons/fa';
import type * as todo from './model/todo';

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


export default function ({ todo, remove, change }: { todo: todo.t, remove: () => void, change: (x: todo.t) => void }) {
  const submit = (text: string) => {
    console.log(`submit: ${text}`);
    todo.text = text;
    change(todo);
  };
  // submitOnBlur true (default) will also submit on Esc and when clicking the cancel button
  return (
    <Flex>
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
      <IconButton onClick={remove} aria-label="remove" icon={<FaRegTrashAlt />} size="sm" variant="ghost" />
    </Flex>
  )
}
