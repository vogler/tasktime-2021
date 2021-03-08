import React, { Suspense, useEffect } from 'react';
import { Avatar, Button, ButtonGroup, Center, Flex, Menu, MenuButton, MenuItem, MenuList, Spacer, VStack } from '@chakra-ui/react';
import { BrowserRouter as Router, Switch, Route, Link, useLocation } from 'react-router-dom';
import type { User } from '@prisma/client';

// replaced by server:
export const user: User | undefined = undefined;

export const maxW = 420;

function Navigation() {
  const location = useLocation();
  // console.log('location', location); // re-executes on e.g. setTodo (also if component definition is moved out)
  useEffect(() => {
    document.title = 'track-time' + ' - ' + (location.pathname == '/' ? 'tasks' : location.pathname.replace(/^\//, '').replace(/\/$/, ''));
  }, [location]);
  const NavButton = ({ text, to = '/'+encodeURIComponent(text.toLowerCase()) } : { text: string, to?: string }) =>
    <Button as={Link} to={to} isActive={location.pathname.replace(/\/$/, '') == to.replace(/\/$/, '')} borderTopRadius="0">{text}</Button>; // heroku adds a trailing slash on reload, so we strip it before checking
  return (
    <Flex w='100%' maxW={maxW}>
      <ButtonGroup isAttached variant="outline">
        <NavButton text="Tasks" to="/" />
        <NavButton text="History" />
      </ButtonGroup>
      <Spacer />
      <Center><UserMenu /></Center>
    </Flex>
  );
}

import { FaSignOutAlt } from 'react-icons/fa';
function UserMenu() {
  return (!user ? <></> :
    <Menu>
      <MenuButton>
        {/* <img alt="photo" title={`${user.name} (${user.email})`} src={user.picture ? user.picture : "https://eu.ui-avatars.com/api/?name="+user.name} width="32" style={{verticalAlign: 'middle', borderRadius: '50%'}} /> */}
        <Avatar name={user.name} src={user.picture ?? undefined} size="sm" bg='gray.200' textColor='gray.800' />
      </MenuButton>
      <MenuList>
        <MenuItem icon={<FaSignOutAlt />} as="a" href="/logout">Logout</MenuItem>
        <MenuItem icon={<FaSignOutAlt />} as="a" href="/logout?revoke=1">Logout and revoke OAuth</MenuItem>
      </MenuList>
    </Menu>
  );
}

function App() {
  // https://reactjs.org/docs/code-splitting.html#route-based-code-splitting
  // SSR: https://loadable-components.com/docs/loadable-vs-react-lazy/
  const Tasks = React.lazy(() => import('./Tasks'));
  const History = React.lazy(() => import('./History'));
  return (
    <Router>
      <VStack mx={2}>
        <Navigation />
        <Suspense fallback={<div>Loading...</div>}>
          <Switch>
            <Route exact path="/">
              <Tasks />
            </Route>
            <Route path="/history">
              <History />
            </Route>
          </Switch>
        </Suspense>
      </VStack>
    </Router>
  );
}

import Auth from './lib/Auth';
function LandingPage() {
  return (
    <VStack>
      <Auth />
    </VStack>
  );
}

export default function () {
  // if we use React.lazy for LandingPage, we need to put Supsense here, but then you actually see 'Loading...'
  return user ? <App /> : <LandingPage />;
}
