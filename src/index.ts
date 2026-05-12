#!/usr/bin/env node
import { runLibrarian } from './harness.js';

const input = process.argv.slice(2).join(' ').trim();

if (input) {
  const result = await runLibrarian(input);

  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

const { render } = await import('ink');
const React = await import('react');
const { App } = await import('./tui/app.js');

render(React.createElement(App));
