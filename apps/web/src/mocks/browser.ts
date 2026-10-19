import { setupWorker } from 'msw/browser';

import { serverHandlers } from './handlers/server';

export const worker = setupWorker(...serverHandlers);
