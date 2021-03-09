// using chakra:
// not good: https://github.com/Fedeorlandau/chakra-ui-simple-autocomplete
// looks ok: https://github.com/koolamusic/chakra-ui-autocomplete
  // but tab key breaks autocomplete: https://github.com/koolamusic/chakra-ui-autocomplete/issues/30

// https://material-ui.com/components/autocomplete/#multiple-values
// https://github.com/i-like-robots/react-tags
// https://github.com/celebryts/react-autocomplete-tags
// https://github.com/ejmudi/react-autocomplete-hint

import React, { useState } from "react";
import { VStack, HStack, Flex, Input, IconButton, Text, Button, InputRightElement, InputGroup, Menu, MenuButton, MenuItem, MenuOptionGroup, MenuList, VisuallyHidden, MenuItemOption } from "@chakra-ui/react";
import { FaArrowDown, FaArrowRight, FaArrowUp, FaChevronDown, FaChevronUp } from "react-icons/fa";

const items = ['Apfel', 'Birne', 'Hund', 'Katze'];

const suggestions = (item: string) => items.filter(x => x.toLowerCase().indexOf(item.toLowerCase()) > -1);

export default function() {
  const [value, setValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [inputFocus, setInputFocus] = useState(false);

  const menuOpts = {matchWidth: false};

  return (
    <Flex w='100%' direction="column">
      <HStack w='100%'>
        <InputGroup>
          <Input {...{value}} placeholder="tags..." onChange={event => setValue(event.currentTarget.value)} onFocus={_ => {setInputFocus(true); setShow(true);}} onBlur={_ => setInputFocus(false)} />
          <InputRightElement> {/* width="4.5rem" */}
            {/* <Button h="1.75rem" size="sm" onClick={_ => setShow(!show)}>
              {show ? "hide" : "show"}
            </Button> */}
            <IconButton size="sm" icon={show ? <FaChevronUp /> : <FaChevronDown />} aria-label="toggle suggestions" onClick={_ => setShow(!show)} />
          </InputRightElement>
        </InputGroup>
        {/* <IconButton type="submit" isLoading={isLoading} aria-label="submit" icon={<FaArrowRight />} /> */}
      </HStack>
      <Menu isOpen={show} {...menuOpts} onOpen={() => console.log('open')} onClose={() => setShow(inputFocus)}>
        {/* <VisuallyHidden><MenuButton as={Button}>Items</MenuButton></VisuallyHidden> */}
        <MenuButton as="span" />
        <MenuList mt={-2} minW={100}>
          <MenuOptionGroup type="checkbox">
            {suggestions(value).map(item => <MenuItemOption key={item} value={item}>{item}</MenuItemOption>)}
          </MenuOptionGroup>
        </MenuList>
      </Menu>
      {/* <Text>{(show || value) && suggestions(value)}</Text> */}
    </Flex>
  );
}
