import React, { useState } from 'react';
import { HStack, Input, Button, IconButton, ButtonProps } from "@chakra-ui/react"
// import { css, jsx } from '@emotion/react'
import type { IconType } from 'react-icons';
import { FaArrowRight } from 'react-icons/fa';

export default function InputForm({ IconOrText = FaArrowRight, resetInput = true, debug = false, ...p }: {
      submit?: (value: string) => void,
      placeholder?: string,
      IconOrText?: IconType | string, // needs to be uppercase, otherwise React assumes it's an HTML element
      buttonProps?: ButtonProps,
      resetInput?: boolean,
      debug?: boolean
    }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (debug) console.log(`InputForm.value = ${value}`);
    if (p.submit) p.submit(value);
    if (resetInput) setValue('');
  };

  return (
    <form onSubmit={handleSubmit}>
        <HStack maxW="420px">
          <Input placeholder={p.placeholder} value={value} onChange={event => setValue(event.currentTarget.value)} autoFocus={true} /> // autoFocus does not work
          { (typeof IconOrText === 'string') // using just Button with rightIcon and no text instead of IconButton has wrong spacing
              ? <Button type="submit" {...p.buttonProps}>{IconOrText}</Button>
              : <IconButton type="submit" aria-label="submit" icon={<IconOrText /> } {...p.buttonProps} />
          }
        </HStack>
      </form>
  )
}
