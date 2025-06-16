// Clear Google Scholar localStorage data
console.log('🧹 Clearing Google Scholar localStorage data...');

// Clear all Google Scholar related localStorage items
localStorage.removeItem('google_scholar_connection');
localStorage.removeItem('selected_publications');
localStorage.removeItem('github_access_token');
localStorage.removeItem('github_user_data');
localStorage.removeItem('selected_repositories');

console.log('✅ Cleared all localStorage data');
console.log('📝 Please refresh the page to see changes');

// Check what's left
console.log('🔍 Remaining localStorage items:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  console.log(`  ${key}: ${localStorage.getItem(key)?.substring(0, 50)}...`);
}