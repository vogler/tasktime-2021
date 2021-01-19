import { useState, useRef } from 'react';
import { FormControl, HStack, Input, Button, IconButton, ButtonProps, FormErrorMessage } from '@chakra-ui/react';
// import { css, jsx } from '@emotion/react'
import type { IconType } from 'react-icons';
import { FaArrowRight } from 'react-icons/fa';

export const useFocus = () => {
	const htmlElRef = useRef<HTMLInputElement>(null);
  const setFocus = () => htmlElRef.current && htmlElRef.current.focus();
	return [htmlElRef, setFocus] as const;
}

export default function ({ IconOrText = FaArrowRight, resetInput = true, debug = false, ...p }: {
      submit?: (value: string) => Promise<void | string>,
      placeholder?: string,
      IconOrText?: IconType | string, // needs to be uppercase, otherwise React assumes it's an HTML element
      buttonProps?: ButtonProps,
      resetInput?: boolean,
      debug?: boolean
    }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inputRef, setInputFocus] = useFocus();

  // use React Hook Form? https://chakra-ui.com/guides/integrations/with-hook-form
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (debug) console.log(`InputForm.value = ${value}`);
    if (p.submit) {
      setError('');
      setIsLoading(true);
      const e = await p.submit(value);
      setIsLoading(false);
      if (typeof e === 'string') {
        setError(e);
        setInputFocus();
      } else {
        if (resetInput) setValue('');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormControl isRequired isInvalid={error != ''} w={332}>
        <HStack>
          <Input placeholder={p.placeholder} value={value} onChange={event => setValue(event.currentTarget.value)} ref={inputRef} autoFocus={true} /> // autoFocus does not work
          { (typeof IconOrText === 'string') // using just Button with rightIcon and no text instead of IconButton has wrong spacing
              ? <Button type="submit" isLoading={isLoading} {...p.buttonProps}>{IconOrText}</Button>
              : <IconButton type="submit" isLoading={isLoading} aria-label="submit" icon={<IconOrText /> } {...p.buttonProps} />
          }
        </HStack>
        <FormErrorMessage>{error}</FormErrorMessage>
      </FormControl>
      </form>
  );
}
