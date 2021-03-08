import React, { useState } from 'react';
import { FormControl, HStack, Input, Button, IconButton, ButtonProps, FormErrorMessage, InputProps, Box, ChakraComponent, ChakraProps } from '@chakra-ui/react';
// import { css, jsx } from '@emotion/react'
import type { IconType } from 'react-icons';
import { FaArrowRight } from 'react-icons/fa';

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

  // could just use <form>, but want to be able to use chakra style props
  function Form(props: React.ComponentProps<'form'> & ChakraProps) { // https://github.com/chakra-ui/chakra-ui/issues/518
    const FormBox = Box as ChakraComponent<'form'>;
    return <FormBox as="form" {...props}>{props.children}</FormBox>;
  }

  return (
    <Form onSubmit={handleSubmit} w='100%'>
      <FormControl isRequired isInvalid={error != ''}>
        <HStack>
          <Input {...{value}} onChange={event => setValue(event.currentTarget.value)} {...p.inputProps} />
          { (typeof IconOrText === 'string') // using just Button with rightIcon and no text instead of IconButton has wrong spacing
              ? <Button type="submit" isLoading={isLoading} {...p.buttonProps}>{IconOrText}</Button>
              : <IconButton type="submit" isLoading={isLoading} aria-label="submit" icon={<IconOrText />} {...p.buttonProps} />
          }
        </HStack>
        <FormErrorMessage>{error}</FormErrorMessage>
      </FormControl>
    </Form>
  );
}
