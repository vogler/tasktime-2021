import { Box, ButtonGroup, Editable, EditableInput, EditablePreview, Flex, IconButton, Spacer, useEditableState } from '@chakra-ui/react';
import React from 'react';
import { FaCheck, FaRegEdit, FaRegTrashAlt, FaTimes } from 'react-icons/fa';

type todo = string;

function EditableControls() { // TODO pull out into lib
  const p = useEditableState();
  return p.isEditing ? (
    <ButtonGroup size="sm" isAttached variant="outline">
      <IconButton icon={<FaCheck />} onClick={p.onSubmit} aria-label="submit" />
      <IconButton icon={<FaTimes />} onClick={p.onCancel} aria-label="cancel" />
    </ButtonGroup>
  ) : (
    <IconButton size="sm" icon={<FaRegEdit />} onClick={p.onEdit} aria-label="edit" variant="ghost" />
  );
}

export default function ({ todo }: { todo: todo }) {
  // submitOnBlur true (default) will also submit on Esc and when clicking the cancel button
  return (
    <Flex>
      <Editable defaultValue={todo} submitOnBlur={false} w="300px"
        onCancel={p => console.log(`cancel: ${p}`)}
        onSubmit={v => console.log(`submit: ${v}`)}>
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
      <IconButton aria-label="delete" icon={<FaRegTrashAlt />} size="sm" variant="ghost" />
    </Flex>
  )
}
