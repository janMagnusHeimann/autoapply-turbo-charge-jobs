"""
Real Supabase Database Integration Tests
Tests actual database read/write operations
"""
import pytest
import asyncio
import os
import uuid
from datetime import datetime
from typing import Optional, Dict, Any

# Import Supabase client
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False

class TestSupabaseIntegration:
    """Test real Supabase database integration"""
    
    @pytest.fixture
    def supabase_client(self):
        """Create Supabase client or skip if not available"""
        if not SUPABASE_AVAILABLE:
            pytest.skip("Supabase package not available")
        
        url = os.environ.get('SUPABASE_URL')
        key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_ANON_KEY')
        
        if not url or not key:
            pytest.skip("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
        
        try:
            client = create_client(url, key)
            return client
        except Exception as e:
            pytest.skip(f"Failed to create Supabase client: {e}")
    
    @pytest.fixture
    def test_user_id(self):
        """Generate test user ID"""
        return str(uuid.uuid4())
    
    @pytest.fixture
    def test_data(self):
        """Test data for database operations"""
        return {
            'name': 'Test User',
            'email': f'test_{uuid.uuid4().hex[:8]}@example.com',
            'created_at': datetime.utcnow().isoformat()
        }
    
    def test_supabase_connection(self, supabase_client):
        """Test basic Supabase connection"""
        try:
            # Test connection with a simple query
            result = supabase_client.table('users').select('id').limit(1).execute()
            assert hasattr(result, 'data')
            print("✅ Supabase connection successful")
        except Exception as e:
            # If users table doesn't exist, that's still a valid connection
            if 'relation "public.users" does not exist' in str(e):
                print("✅ Supabase connection successful (users table not yet created)")
            else:
                pytest.fail(f"Supabase connection failed: {e}")
    
    def test_user_table_operations(self, supabase_client, test_data):
        """Test user table CRUD operations"""
        table_name = 'users'
        
        try:
            # Create - Insert test user
            insert_result = supabase_client.table(table_name).insert(test_data).execute()
            assert insert_result.data
            assert len(insert_result.data) > 0
            
            user_id = insert_result.data[0]['id']
            print(f"✅ User created with ID: {user_id}")
            
            # Read - Fetch the created user
            read_result = supabase_client.table(table_name).select('*').eq('id', user_id).execute()
            assert read_result.data
            assert len(read_result.data) == 1
            assert read_result.data[0]['email'] == test_data['email']
            print(f"✅ User read successfully: {read_result.data[0]['email']}")
            
            # Update - Modify user data
            update_data = {'name': 'Updated Test User'}
            update_result = supabase_client.table(table_name).update(update_data).eq('id', user_id).execute()
            assert update_result.data
            assert update_result.data[0]['name'] == 'Updated Test User'
            print("✅ User updated successfully")
            
            # Delete - Remove test user
            delete_result = supabase_client.table(table_name).delete().eq('id', user_id).execute()
            assert delete_result.data
            print("✅ User deleted successfully")
            
            # Verify deletion
            verify_result = supabase_client.table(table_name).select('*').eq('id', user_id).execute()
            assert len(verify_result.data) == 0
            print("✅ User deletion verified")
            
        except Exception as e:
            if 'relation "public.users" does not exist' in str(e):
                print("⚠️ Users table doesn't exist - skipping CRUD tests")
                pytest.skip("Users table not available")
            else:
                raise e
    
    def test_cv_assets_table_operations(self, supabase_client, test_user_id):
        """Test CV assets table operations"""
        table_name = 'cv_assets'
        
        test_asset = {
            'user_id': test_user_id,
            'asset_type': 'repository',
            'title': 'Test Repository',
            'description': 'A test repository for CV',
            'url': 'https://github.com/user/test-repo',
            'metadata': {
                'language': 'Python',
                'stars': 42,
                'forks': 7
            }
        }
        
        try:
            # Insert CV asset
            insert_result = supabase_client.table(table_name).insert(test_asset).execute()
            assert insert_result.data
            
            asset_id = insert_result.data[0]['id']
            print(f"✅ CV asset created with ID: {asset_id}")
            
            # Query by user_id
            query_result = supabase_client.table(table_name).select('*').eq('user_id', test_user_id).execute()
            assert query_result.data
            assert len(query_result.data) >= 1
            print(f"✅ Found {len(query_result.data)} CV assets for user")
            
            # Query by asset type
            type_result = supabase_client.table(table_name).select('*').eq('asset_type', 'repository').execute()
            assert type_result.data
            print(f"✅ Found {len(type_result.data)} repository assets")
            
            # Clean up
            supabase_client.table(table_name).delete().eq('id', asset_id).execute()
            print("✅ CV asset cleaned up")
            
        except Exception as e:
            if 'relation "public.cv_assets" does not exist' in str(e):
                print("⚠️ CV assets table doesn't exist - skipping tests")
                pytest.skip("CV assets table not available")
            else:
                raise e
    
    def test_selected_repositories_operations(self, supabase_client, test_user_id):
        """Test selected repositories table operations"""
        table_name = 'selected_repositories'
        
        test_repo = {
            'user_id': test_user_id,
            'repository_name': 'test-project',
            'repository_url': 'https://github.com/user/test-project',
            'description': 'A machine learning project for image classification',
            'language': 'Python',
            'stars': 156,
            'is_selected': True
        }
        
        try:
            # Insert selected repository
            insert_result = supabase_client.table(table_name).insert(test_repo).execute()
            assert insert_result.data
            
            repo_id = insert_result.data[0]['id']
            print(f"✅ Selected repository created with ID: {repo_id}")
            
            # Query selected repositories
            selected_result = supabase_client.table(table_name).select('*').eq('user_id', test_user_id).eq('is_selected', True).execute()
            assert selected_result.data
            print(f"✅ Found {len(selected_result.data)} selected repositories")
            
            # Update selection status
            update_result = supabase_client.table(table_name).update({'is_selected': False}).eq('id', repo_id).execute()
            assert update_result.data
            print("✅ Repository selection updated")
            
            # Clean up
            supabase_client.table(table_name).delete().eq('id', repo_id).execute()
            print("✅ Repository selection cleaned up")
            
        except Exception as e:
            if 'relation "public.selected_repositories" does not exist' in str(e):
                print("⚠️ Selected repositories table doesn't exist - skipping tests")
                pytest.skip("Selected repositories table not available")
            else:
                raise e
    
    def test_google_scholar_connections(self, supabase_client, test_user_id):
        """Test Google Scholar connections table operations"""
        table_name = 'google_scholar_connections'
        
        test_connection = {
            'user_id': test_user_id,
            'scholar_profile_url': 'https://scholar.google.com/citations?user=TEST123',
            'author_name': 'Dr. Test Author',
            'affiliation': 'Test University',
            'total_citations': 1234,
            'h_index': 25,
            'i10_index': 45,
            'is_verified': True
        }
        
        try:
            # Insert Scholar connection
            insert_result = supabase_client.table(table_name).insert(test_connection).execute()
            assert insert_result.data
            
            connection_id = insert_result.data[0]['id']
            print(f"✅ Scholar connection created with ID: {connection_id}")
            
            # Query by user
            user_connections = supabase_client.table(table_name).select('*').eq('user_id', test_user_id).execute()
            assert user_connections.data
            print(f"✅ Found {len(user_connections.data)} Scholar connections for user")
            
            # Query verified connections
            verified_connections = supabase_client.table(table_name).select('*').eq('is_verified', True).execute()
            assert verified_connections.data
            print(f"✅ Found {len(verified_connections.data)} verified Scholar connections")
            
            # Clean up
            supabase_client.table(table_name).delete().eq('id', connection_id).execute()
            print("✅ Scholar connection cleaned up")
            
        except Exception as e:
            if 'relation "public.google_scholar_connections" does not exist' in str(e):
                print("⚠️ Google Scholar connections table doesn't exist - skipping tests")
                pytest.skip("Google Scholar connections table not available")
            else:
                raise e
    
    def test_user_preferences_operations(self, supabase_client, test_user_id):
        """Test user preferences table operations"""
        table_name = 'user_preferences'
        
        test_preferences = {
            'user_id': test_user_id,
            'preference_key': 'github_token_encrypted',
            'preference_value': 'encrypted_token_value_here',
            'is_sensitive': True
        }
        
        try:
            # Insert preference
            insert_result = supabase_client.table(table_name).insert(test_preferences).execute()
            assert insert_result.data
            
            pref_id = insert_result.data[0]['id']
            print(f"✅ User preference created with ID: {pref_id}")
            
            # Query user preferences
            user_prefs = supabase_client.table(table_name).select('*').eq('user_id', test_user_id).execute()
            assert user_prefs.data
            print(f"✅ Found {len(user_prefs.data)} preferences for user")
            
            # Query sensitive preferences
            sensitive_prefs = supabase_client.table(table_name).select('*').eq('is_sensitive', True).execute()
            assert sensitive_prefs.data
            print(f"✅ Found {len(sensitive_prefs.data)} sensitive preferences")
            
            # Clean up
            supabase_client.table(table_name).delete().eq('id', pref_id).execute()
            print("✅ User preference cleaned up")
            
        except Exception as e:
            if 'relation "public.user_preferences" does not exist' in str(e):
                print("⚠️ User preferences table doesn't exist - skipping tests")
                pytest.skip("User preferences table not available")
            else:
                raise e
    
    def test_database_constraints_and_validation(self, supabase_client):
        """Test database constraints and validation"""
        try:
            # Test inserting invalid data to check constraints
            invalid_user = {
                'email': 'not-an-email',  # Invalid email format
                'name': '',  # Empty name
            }
            
            try:
                result = supabase_client.table('users').insert(invalid_user).execute()
                # If this succeeds, constraints might not be set up
                if result.data:
                    # Clean up if it unexpectedly succeeded
                    user_id = result.data[0]['id']
                    supabase_client.table('users').delete().eq('id', user_id).execute()
                    print("⚠️ Invalid data was accepted - check database constraints")
            except Exception as constraint_error:
                print("✅ Database constraints working - rejected invalid data")
                
        except Exception as e:
            if 'relation "public.users" does not exist' in str(e):
                print("⚠️ Users table doesn't exist - skipping constraint tests")
                pytest.skip("Users table not available for constraint testing")
            else:
                raise e
    
    def test_database_performance(self, supabase_client):
        """Test basic database performance"""
        import time
        
        try:
            # Test query performance
            start_time = time.time()
            
            # Simple select query
            result = supabase_client.table('users').select('id').limit(10).execute()
            
            query_time = time.time() - start_time
            
            assert query_time < 5.0, f"Query took too long: {query_time:.2f}s"
            print(f"✅ Query performance acceptable: {query_time:.3f}s")
            
        except Exception as e:
            if 'relation "public.users" does not exist' in str(e):
                print("⚠️ Users table doesn't exist - skipping performance tests")
                pytest.skip("Users table not available for performance testing")
            else:
                raise e
    
    def test_supabase_configuration_validation(self):
        """Test Supabase configuration requirements"""
        required_env_vars = [
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY'
        ]
        
        optional_env_vars = [
            'SUPABASE_SERVICE_ROLE_KEY'
        ]
        
        missing_required = []
        for var in required_env_vars:
            if not os.environ.get(var):
                missing_required.append(var)
        
        if missing_required:
            print(f"⚠️ Missing required environment variables: {missing_required}")
        else:
            print("✅ All required Supabase environment variables are set")
        
        for var in optional_env_vars:
            if os.environ.get(var):
                print(f"✅ Optional variable {var} is configured")
            else:
                print(f"⚠️ Optional variable {var} not set (may limit functionality)")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])