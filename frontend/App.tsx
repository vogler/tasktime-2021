import React, { useEffect } from 'react';
import { Button, ButtonGroup, VStack } from '@chakra-ui/react';
import { BrowserRouter as Router, Switch, Route, Link, useLocation } from 'react-router-dom';
import Tasks from './Tasks';
import History from './History';

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

export default function () {
  const user = {
    "name": "Ralf Vogler",
    "given_name": "Ralf",
    "family_name": "Vogler",
    "picture": "https://lh3.googleusercontent.com/a-/AOh14GhXmtSBB2KRw7SqW66l7oWE0R6X5jRwD6OX0_CwQcc=s96-c",
    "email": "ralf.vogler@gmail.com",
    "email_verified": true,
    "locale": "en-GB"
  };
  return (
    <Router>
      <VStack>
        <Navigation />
        <a href="/connect/google">Login</a>
        <a href="/logout">Logout</a>
        <img alt="user photo" title="{user.displayName} ({user.email})" src={user.picture ? user.picture : "https://eu.ui-avatars.com/api/?name="+user.name} width="32" style={{verticalAlign: 'middle', borderRadius: '50%'}} />
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
