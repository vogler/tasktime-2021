import React, { Suspense, useEffect } from 'react';
import { Button, ButtonGroup, VStack } from '@chakra-ui/react';
import { BrowserRouter as Router, Switch, Route, Link, useLocation } from 'react-router-dom';
import type { User } from '@prisma/client';

// replaced by server:
export const user: User | undefined = undefined;

function Navigation() {
  const location = useLocation();
  // console.log('location', location); // re-executes on e.g. setTodo (also if component definition is moved out)
  useEffect(() => {
    document.title = 'track-time' + ' - ' + (location.pathname == '/' ? 'tasks' : location.pathname.replace(/^\//, '').replace(/\/$/, ''));
  }, [location]);
  const NavButton = ({ text, to = '/'+encodeURIComponent(text.toLowerCase()) } : { text: string, to?: string }) =>
    <Button as={Link} to={to} isActive={location.pathname.replace(/\/$/, '') == to.replace(/\/$/, '')} borderTopRadius="0">{text}</Button>; // heroku adds a trailing slash on reload, so we strip it before checking
  return (
    <ButtonGroup isAttached variant="outline">
      <NavButton text="Tasks" to="/" />
      <NavButton text="History" />
    </ButtonGroup>
  );
}

function App({user} : {user: User}) {
  // https://reactjs.org/docs/code-splitting.html#route-based-code-splitting
  // SSR: https://loadable-components.com/docs/loadable-vs-react-lazy/
  const Tasks = React.lazy(() => import('./Tasks'));
  const History = React.lazy(() => import('./History'));
  return (
    <Router>
      <VStack>
        <Navigation />
        <img alt="photo" title={`${user.name} (${user.email})`} src={user.picture ? user.picture : "https://eu.ui-avatars.com/api/?name="+user.name} width="32" style={{verticalAlign: 'middle', borderRadius: '50%'}} />
        <a href="/logout">Logout</a>
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

function LandingPage() {
  return (
    <VStack>
      <a href="/connect/google">Login with Google</a>
    </VStack>
  );
}
export default function () {
  return user ? <App {...{user}} /> : <LandingPage />;
}
