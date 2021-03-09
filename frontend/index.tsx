import React from 'react';
import ReactDOM from 'react-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { RecoilRoot } from 'recoil';
import App from './App';

window.React = React; // so that we do not need to import React in every .tsx just to be able to use JSX

// const theme = extendTheme({components: {Button: {defaultProps:{ size: "sm" }}}}); // use in ChakraProvider
import "focus-visible/dist/focus-visible"; // https://github.com/chakra-ui/chakra-ui/issues/3449

ReactDOM.render(
  <React.StrictMode>
    <ChakraProvider>
      <RecoilRoot>
        <App />
      </RecoilRoot>
    </ChakraProvider>
  </React.StrictMode>,
  document.getElementById('root'),
);

// Hot Module Replacement (HMR) - Remove this snippet to remove HMR.
// Learn more: https://snowpack.dev/concepts/hot-module-replacement
if (import.meta.hot) {
  import.meta.hot.accept();
}
