import { startScheduler } from './scheduler';

// Initialize scheduler on server startup
if (typeof window === 'undefined') {
  startScheduler();
}

