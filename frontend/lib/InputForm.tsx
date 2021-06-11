import React, { useState } from 'react';
import { FormControl, HStack, Input, Button, IconButton, ButtonProps, FormErrorMessage, InputProps, Box, ChakraComponent, ChakraProps, InputGroup, InputRightElement } from '@chakra-ui/react';
// import { css, jsx } from '@emotion/react'
import type { IconType } from 'react-icons';
import { FaArrowRight, FaTimes } from 'react-icons/fa';

export default function InputForm({
  IconOrText = FaArrowRight,
  resetInput = true,
  debug = false,
  ...p
}: {
  submit?: (value: string) => Promise<void | string>;
  inputProps?: InputProps;
  IconOrText?: IconType | string; // needs to be uppercase, otherwise React assumes it's an HTML element
  buttonProps?: ButtonProps;
  resetInput?: boolean;
  debug?: boolean;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      } else {
        if (resetInput) setValue('');
      }
    }
  };

  // allows to use chakra style props, but with it Input loses focus on every change: https://github.com/chakra-ui/chakra-ui/issues/518#issuecomment-801266531
  // no focus problem when using <form>
  function Form(props: React.ComponentProps<'form'> & ChakraProps) {
    const FormBox = Box as ChakraComponent<'form'>;
    return <FormBox as="form" {...props}>{props.children}</FormBox>;
  }

  return (
    <form onSubmit={handleSubmit} style={{width: '100%'}}>
      <FormControl isRequired isInvalid={error != ''}>
        <HStack>
          <InputGroup>
            <Input {...{value}} onChange={event => setValue(event.currentTarget.value)} {...p.inputProps} />
            {value && <InputRightElement>
              {/* we need as="a" since without it, pressing enter will 'click' this button instead of submitting the form (even if tabIndex is set to 0 or -1) */}
              <IconButton as="a" size="sm" icon={<FaTimes />} variant="ghost" aria-label="delete input" onClick={_ => setValue('')} />
            </InputRightElement>}
          </InputGroup>
          { (typeof IconOrText === 'string') // using just Button with rightIcon and no text instead of IconButton has wrong spacing
              ? <Button type="submit" isLoading={isLoading} {...p.buttonProps}>{IconOrText}</Button>
              : <IconButton type="submit" isLoading={isLoading} aria-label="submit" icon={<IconOrText />} {...p.buttonProps} />
          }
        </HStack>
        <FormErrorMessage>{error}</FormErrorMessage>
      </FormControl>
    </form>
  );
}
