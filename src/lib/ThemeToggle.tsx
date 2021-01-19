import { useColorMode, IconButton } from '@chakra-ui/react';
import { FaMoon, FaSun } from 'react-icons/fa';

// light/dark mode is saved in localStorage.
// When refreshing the page in dark mode, light mode flashes up first.
// This did not help: https://chakra-ui.com/docs/features/color-mode#add-colormodescript

export default function ThemeToggle() {
  const { colorMode, toggleColorMode } = useColorMode();
  return (
    <IconButton
      icon={colorMode === 'light' ? <FaMoon /> : <FaSun />}
      aria-label="toggle light/dark mode"
      onClick={toggleColorMode}
      variant="ghost"
    />
  )
}
