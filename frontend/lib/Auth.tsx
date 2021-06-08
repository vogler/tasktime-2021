import React from 'react';
import { Text, Button, HStack, VStack, Link } from '@chakra-ui/react';
import { FaFacebook, FaGithub, FaGoogle, FaTwitter } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';

export default function LandingPage() {
  return (
    <VStack>
      <Text>Log in or sign up with</Text>
      <Button as="a" href="/connect/google" colorScheme="gray" leftIcon={<FcGoogle />}>Google</Button>
      <Button as="a" href="/connect/github" colorScheme="gray" leftIcon={<FaGithub />}>GitHub</Button>
      <Button as="a" href="/connect/facebook" colorScheme="facebook" leftIcon={<FaFacebook />}>Facebook</Button>
      <Button as="a" href="/connect/twitter" colorScheme="twitter" leftIcon={<FaTwitter />}>Twitter</Button>
      <br />
      <a href="privacy.html">Privacy Policy</a>
    </VStack>
  );
}
