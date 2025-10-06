import { createServer } from 'vite';

async function startDevServer() {
  try {
    const server = await createServer();
    await server.listen();
    server.printUrls();
    console.log('\nAgent Lee dev server is running. Press Ctrl+C to stop.');
  } catch (error) {
    console.error('Failed to start Vite dev server:', error);
    process.exit(1);
  }
}

startDevServer();
