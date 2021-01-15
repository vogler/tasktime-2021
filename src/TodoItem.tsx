import { Editable, EditableInput, EditablePreview } from "@chakra-ui/react"

type todo = string
export default function InputForm({ todo }: { todo: todo }) {
  return (
    <Editable defaultValue={todo}>
      <EditablePreview />
      <EditableInput />
    </Editable>
  )
}
