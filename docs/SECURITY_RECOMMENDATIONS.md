# Security Configuration Recommendations

## Supabase Auth Configuration Warnings

This document addresses the remaining security warnings from Supabase that require configuration changes in the Supabase dashboard rather than code changes.

### 1. OTP Expiry Configuration

**Issue:** OTP expiry is set to more than 1 hour
**Risk Level:** Warning
**Current Setting:** > 1 hour

**Recommendation:**
- Go to Supabase Dashboard → Authentication → Settings → Email Auth
- Set OTP expiry to **30 minutes** or less
- This reduces the window for potential OTP abuse while maintaining usability

**Benefits:**
- Reduces attack window for intercepted OTPs
- Follows security best practices
- Maintains reasonable user experience

### 2. Leaked Password Protection

**Issue:** Leaked password protection is disabled
**Risk Level:** Warning
**Current Setting:** Disabled

**Recommendation:**
- Go to Supabase Dashboard → Authentication → Settings → Password Protection
- Enable "Check against HaveIBeenPwned database"
- This prevents users from using compromised passwords

**Benefits:**
- Prevents use of known compromised passwords
- Integrates with HaveIBeenPwned.org database
- Enhances overall account security
- No performance impact on login

### Implementation Steps

1. **Access Supabase Dashboard:**
   - Go to https://supabase.com/dashboard
   - Select your project: `scvqgfkslffykgtnvrdo`

2. **Configure OTP Expiry:**
   ```
   Authentication → Settings → Email Auth
   └── OTP expiry: 30 minutes (or less)
   ```

3. **Enable Password Protection:**
   ```
   Authentication → Settings → Password Protection
   └── ☑ Check against HaveIBeenPwned database
   ```

### Database Security Status

✅ **RESOLVED** - All RLS (Row Level Security) issues have been fixed via migration `20250719000000_security_rls_fixes.sql`:

- **Companies & Job Listings:** RLS enabled (remain publicly readable)
- **User Data Tables:** RLS enabled with user-scoped policies
  - user_profiles
  - cv_generations  
  - github_projects
  - user_skills
  - publications
  - work_experiences
- **Function Security:** Search path vulnerabilities fixed
  - handle_new_user
  - update_updated_at_column

### Verification

After applying the migration and dashboard changes, run the Supabase linter again to verify all security issues are resolved:

```bash
# In Supabase Dashboard
Project → Settings → Database → Database Linter
```

All security errors should be resolved, with only informational items remaining.