import React, { useState } from 'react';
import { HStack, Input, Button } from "@chakra-ui/react"
// import { css, jsx } from '@emotion/react'

export default function InputForm({ resetInput = true, ...p }: {
      placeholder?: string,
      submit?: (value: string) => void,
      resetInput?: boolean
    }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    alert(`value: ${value}`);
    if (p.submit) p.submit(value);
    if (resetInput) setValue('');
  };

  return (
    <form onSubmit={handleSubmit}>
        <HStack maxW="420px">
          <Input placeholder={p.placeholder} value={value} onChange={event => setValue(event.currentTarget.value)} autoFocus={true} /> // autoFocus does not work
          <Button type="submit">add</Button>
        </HStack>
      </form>
  )
}
