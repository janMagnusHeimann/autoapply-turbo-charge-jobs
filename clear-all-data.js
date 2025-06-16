// Clear all localStorage data to force fresh scraping
console.log('🧹 Clearing all localStorage data...');

// Clear all items
localStorage.clear();

console.log('✅ All localStorage cleared!');
console.log('🔄 Please refresh the page and reconnect to see new publications');

// Check what's left (should be empty)
console.log('📊 localStorage items remaining:', localStorage.length);