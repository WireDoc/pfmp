import { setupServer } from 'msw/node';
import { defaultHandlers } from '../pfmp-frontend/src/tests/mocks/handlers.js';

console.time('setupServer');
const server = setupServer(...defaultHandlers);
console.timeEnd('setupServer');

console.time('listen');
server.listen();
console.timeEnd('listen');

console.time('reset');
server.resetHandlers();
console.timeEnd('reset');

console.time('close');
server.close();
console.timeEnd('close');
