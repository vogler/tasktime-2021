import { CheckIcon, CloseIcon, EditIcon } from "@chakra-ui/icons";
import { Box, ButtonGroup, Editable, EditableInput, EditablePreview, Flex, IconButton, Spacer } from "@chakra-ui/react"
import React from "react";
import { FaTrash } from 'react-icons/fa';

type todo = string

function EditableControls({ isEditing, onSubmit, onCancel, onEdit }) {
  return isEditing ? (
    <ButtonGroup justifyContent="center" size="sm">
      <IconButton icon={<CheckIcon />} onClick={onSubmit} aria-label="submit" />
      <IconButton icon={<CloseIcon />} onClick={onCancel} aria-label="cancel" />
    </ButtonGroup>
  ) : (
    <IconButton size="sm" icon={<EditIcon />} onClick={onEdit} aria-label="edit" />
  )
}
export default function InputForm({ todo }: { todo: todo }) {
  // submitOnBlur true (default) will also submit on Esc
  return (
    <Flex>
      <Editable defaultValue={todo} w="300px">
        {(props) => (
          <Flex>
            <Box w="240px">
              <EditablePreview />
              <EditableInput />
            </Box>
            <Spacer />
            <EditableControls {...props} />
          </Flex>
        )}
      </Editable>
      <Spacer />
      <IconButton aria-label='delete' icon={<FaTrash />} size="sm" isRound={true} variant="ghost" />
    </Flex>
  )
}
