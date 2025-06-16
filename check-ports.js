// Check which ports are in use and provide solution
import fetch from 'node-fetch';

async function checkPort(port, description) {
  try {
    const response = await fetch(`http://localhost:${port}/health`, { timeout: 2000 });
    console.log(`✅ Port ${port} (${description}): Running`);
    return true;
  } catch (error) {
    console.log(`❌ Port ${port} (${description}): Not running`);
    return false;
  }
}

async function checkViteServer(port) {
  try {
    const response = await fetch(`http://localhost:${port}`, { timeout: 2000 });
    if (response.status === 200) {
      console.log(`✅ Port ${port} (Vite Frontend): Running`);
      return true;
    }
  } catch (error) {
    console.log(`❌ Port ${port} (Vite Frontend): Not running`);
    return false;
  }
  return false;
}

console.log('🔍 Checking port status...\n');

const proxyRunning = await checkPort(3001, 'Proxy Server');
const vite8080 = await checkViteServer(8080);
const vite8083 = await checkViteServer(8083);

console.log('\n📊 Analysis:');

if (!proxyRunning) {
  console.log('❌ Proxy server not running - this is why scraping fails');
  console.log('🔧 Solution: Run "npm run proxy" in another terminal');
}

if (vite8083 && !vite8080) {
  console.log('⚠️  Frontend running on port 8083, but Vite proxy expects 8080');
  console.log('🔧 Solution: Stop current Vite server and run "npm run dev" (should use port 8080)');
} else if (vite8080) {
  console.log('✅ Frontend running on correct port (8080) - proxy should work');
} else {
  console.log('❌ Frontend not running on expected ports');
  console.log('🔧 Solution: Run "npm run dev"');
}

console.log('\n🚀 Recommended fix:');
if (!proxyRunning && (vite8083 || vite8080)) {
  console.log('1. Start proxy server: npm run proxy');
  if (vite8083) {
    console.log('2. Restart frontend on port 8080: npm run dev');
  }
  console.log('3. Or use combined command: npm run dev:full');
} else if (!proxyRunning) {
  console.log('Use: npm run dev:full (starts both proxy and frontend)');
} else {
  console.log('Both servers should be working - check browser console for errors');
}