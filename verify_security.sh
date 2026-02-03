#!/bin/bash
# Security Implementation Verification Tests

echo "🔐 Weggo Security Implementation - Verification Tests"
echo "=================================================="
echo ""

# Test 1: Verify hardcoded credentials removed
echo "Test 1: Checking for hardcoded admin credentials..."
if grep -r "not your average admin" app/api/admin/login/route.ts 2>/dev/null; then
    echo "❌ FAIL: Hardcoded credentials still present"
    exit 1
else
    echo "✅ PASS: Hardcoded credentials removed"
fi
echo ""

# Test 2: Verify CSRF implementation exists
echo "Test 2: Checking CSRF protection implementation..."
if [ ! -f "lib/csrf.ts" ]; then
    echo "❌ FAIL: CSRF library not found"
    exit 1
fi
if ! grep -q "generateCsrfToken\|validateCsrfRequest" lib/csrf.ts; then
    echo "❌ FAIL: CSRF functions not implemented"
    exit 1
fi
echo "✅ PASS: CSRF protection implemented"
echo ""

# Test 3: Verify middleware CSRF validation
echo "Test 3: Checking middleware CSRF validation..."
if ! grep -q "validateCsrf\|X-CSRF-Token" middleware.ts; then
    echo "❌ FAIL: Middleware CSRF validation missing"
    exit 1
fi
echo "✅ PASS: Middleware CSRF validation enabled"
echo ""

# Test 4: Verify ID documents moved to private directory
echo "Test 4: Checking ID document storage location..."
if ! grep -q 'join(process.cwd(), .private' lib/imageUpload.ts; then
    echo "❌ FAIL: ID documents still in public directory"
    exit 1
fi
echo "✅ PASS: ID documents stored in private directory"
echo ""

# Test 5: Verify password reset tokens are hashed
echo "Test 5: Checking password reset token hashing..."
if ! grep -q "createHash.*sha256" app/api/auth/forgot-password/route.ts; then
    echo "❌ FAIL: Password reset tokens not being hashed"
    exit 1
fi
if ! grep -q "createHash.*sha256" app/api/auth/reset-password/route.ts; then
    echo "❌ FAIL: Token hash comparison missing"
    exit 1
fi
echo "✅ PASS: Password reset tokens properly hashed"
echo ""

# Test 6: Verify CSRF helper utility exists
echo "Test 6: Checking CSRF client helper utility..."
if ! grep -q "withCsrfHeader" lib/utils.ts; then
    echo "❌ FAIL: CSRF helper utility not found"
    exit 1
fi
echo "✅ PASS: CSRF helper utility implemented"
echo ""

# Test 7: Verify admin login doesn't return token in body
echo "Test 7: Checking admin login response doesn't expose token..."
if grep -A 10 "success: true," app/api/admin/login/route.ts | grep -q "token:"; then
    echo "❌ FAIL: JWT token still returned in response body"
    exit 1
fi
echo "✅ PASS: JWT token not exposed in response body"
echo ""

# Test 8: Verify CSRF cookie is set on auth endpoints
echo "Test 8: Checking CSRF cookie is set on auth endpoints..."
if ! grep -q "setCsrfTokenCookie" app/api/auth/login/route.ts; then
    echo "❌ FAIL: CSRF cookie not set on login"
    exit 1
fi
if ! grep -q "setCsrfTokenCookie" app/api/auth/register/route.ts; then
    echo "❌ FAIL: CSRF cookie not set on register"
    exit 1
fi
echo "✅ PASS: CSRF cookies set on auth endpoints"
echo ""

echo "=================================================="
echo "✅ All security verification tests PASSED!"
echo "=================================================="
echo ""
echo "Summary of Security Fixes:"
echo "  ✓ Hardcoded admin credentials removed"
echo "  ✓ CSRF protection implemented (double-submit cookie)"
echo "  ✓ ID documents moved to private storage"
echo "  ✓ Password reset tokens hashed before storage"
echo "  ✓ JWT tokens not exposed in response bodies"
echo "  ✓ CSRF helper utility for client-side requests"
echo "  ✓ Middleware CSRF validation enabled"
echo "  ✓ Auth endpoints set CSRF cookies"
echo ""
