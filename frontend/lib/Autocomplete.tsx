// using chakra:
// not good: https://github.com/Fedeorlandau/chakra-ui-simple-autocomplete
// looks ok: https://github.com/koolamusic/chakra-ui-autocomplete
  // but tab key breaks autocomplete: https://github.com/koolamusic/chakra-ui-autocomplete/issues/30

// https://material-ui.com/components/autocomplete/#multiple-values
// https://github.com/i-like-robots/react-tags
// https://github.com/celebryts/react-autocomplete-tags
// https://github.com/ejmudi/react-autocomplete-hint

import React, { useState } from "react";
import { VStack, HStack, Flex, Input, IconButton, Text, Button, InputRightElement, InputGroup, Menu, MenuButton, MenuItem, MenuOptionGroup, MenuList, VisuallyHidden, MenuItemOption, InputLeftElement, Badge, Tag, TagLabel, TagCloseButton } from "@chakra-ui/react";
import { FaArrowDown, FaArrowRight, FaArrowUp, FaChevronDown, FaChevronUp, FaPlus } from "react-icons/fa";

// options for chakra's colorScheme (minus "whiteAlpha" | "blackAlpha")
const colors = ['gray', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'cyan', 'purple', 'pink', 'linkedin', 'facebook', 'messenger', 'whatsapp', 'twitter', 'telegram'];

const items = colors;

const suggestions = (item: string) => items.filter(x => x.toLowerCase().indexOf(item.toLowerCase()) > -1);

export default function() {
  const [value, setValue] = useState('');
  const [selected, setSelected] = useState(['Birne', 'Katze'] as string[]);
  const [show, setShow] = useState(false);
  const [inputFocus, setInputFocus] = useState(false);

  const onKey: React.KeyboardEventHandler<HTMLInputElement> = e => {
    // e.key: Enter, Tab, ArrowDown, ArrowUp
    console.log(e.key, e.code, e.metaKey, e.shiftKey, e.altKey, e.ctrlKey);
  };

  const unselect = (item: string) => setSelected(selected.filter(x => x != item));

  const props = {tags: {show: true, closeButton: true}, menu: {matchWidth: false}};
  return (
    <Flex w='100%' direction="column">
      <HStack w='100%'>
        {props.tags.show && <HStack>
          {selected.map((item, index) =>
            <Tag key={item} onClick={_ => unselect(item)} cursor="pointer" colorScheme={colors[index % colors.length]}>
              {item}{props.tags.closeButton && <TagCloseButton ml={1} onClick={_ => unselect(item)} />}
            </Tag>)}
        </HStack>}
        <InputGroup>
          <Input {...{value}} placeholder="tags..." onChange={e => setValue(e.target.value)} onKeyDown={onKey} onFocus={_ => {console.log('onFocus'); setInputFocus(true); setShow(true);}} onBlur={e => {console.log('onBlur'); setInputFocus(false);}} />
          <InputRightElement> {/* width="4.5rem" */}
            {/* <Button h="1.75rem" size="sm" onClick={_ => setShow(!show)}>
              {show ? "hide" : "show"}
            </Button> */}
            <IconButton size="sm" icon={show ? <FaChevronUp /> : <FaChevronDown />} aria-label="toggle suggestions" onClick={_ => setShow(!show)} />
          </InputRightElement>
        </InputGroup>
      </HStack>
      <Menu isOpen={show} autoSelect={false} {...props.menu} onOpen={() => console.log('onOpen')} onClose={() => {console.log('onClose'); setShow(inputFocus);}}>
        {/* <VisuallyHidden><MenuButton as={Button}>Items</MenuButton></VisuallyHidden> */}
        <MenuButton as="span" />
        <MenuList mt={-2} minW={100}>
          <MenuOptionGroup type="checkbox" value={selected} onChange={xs => {console.log('MenuOptionGroup.onChange', xs); setSelected([xs].flat());}}>
            {suggestions(value).map(item => <MenuItemOption key={item} value={item}>{item}</MenuItemOption>)}
            {value && !suggestions(value).includes(value) && <MenuItem icon={<FaPlus />} color="green.500">Create {value}</MenuItem>}
          </MenuOptionGroup>
        </MenuList>
      </Menu>
      {/* <Text>{(show || value) && suggestions(value)}</Text> */}
    </Flex>
  );
}
