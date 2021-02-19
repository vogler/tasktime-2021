import React, { useEffect } from 'react';
import { Button, ButtonGroup, VStack } from '@chakra-ui/react';
import { BrowserRouter as Router, Switch, Route, Link, useLocation } from 'react-router-dom';
import Tasks from './Tasks';
import History from './History';

function Navigation() {
  const location = useLocation();
  // console.log('location', location); // re-executes on e.g. setTodo (also if component definition is moved out)
  useEffect(() => {
    document.title = 'track-time' + ' - ' + (location.pathname == '/' ? 'tasks' : location.pathname.replace(/^\//, ''));
  }, [location]);
  const NavButton = ({ text, to = '/'+text.toLowerCase() } : { text: string, to?: string }) =>
    <Button as={Link} to={to} isActive={location.pathname == to} borderTopRadius="0">{text}</Button>;
  return (
    <ButtonGroup isAttached variant="outline">
      <NavButton text="Tasks" to="/" />
      <NavButton text="History" />
    </ButtonGroup>
  );
}

export default function () {
  return (
    <Router>
      <VStack>
        <Navigation />
        <Switch>
          <Route exact path="/">
            <Tasks />
          </Route>
          <Route path="/history">
            <History />
          </Route>
        </Switch>
      </VStack>
    </Router>
  );
}
