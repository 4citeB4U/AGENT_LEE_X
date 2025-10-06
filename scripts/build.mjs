import { build } from 'vite';

async function runBuild() {
  try {
    await build();
    console.log('\nVite production build complete.');
  } catch (error) {
    console.error('\nVite production build failed:', error);
    process.exit(1);
  }
}

runBuild();
