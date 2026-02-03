"""
Test PWA and QR Code Features for CivicFix Platform
Tests: manifest.json, service-worker.js, /api/proof/{caseId} endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPWAManifest:
    """PWA manifest.json configuration tests"""
    
    def test_manifest_accessible(self):
        """Test manifest.json is accessible at /manifest.json"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200, f"Manifest not accessible: {response.status_code}"
        print("✓ manifest.json is accessible")
    
    def test_manifest_valid_json(self):
        """Test manifest.json is valid JSON"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict), "Manifest is not a valid JSON object"
        print("✓ manifest.json is valid JSON")
    
    def test_manifest_required_fields(self):
        """Test manifest.json has required PWA fields"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        data = response.json()
        
        required_fields = ['name', 'short_name', 'start_url', 'display', 'icons']
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        print(f"✓ manifest.json has all required fields: {required_fields}")
    
    def test_manifest_display_standalone(self):
        """Test manifest.json has display: standalone for PWA"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        data = response.json()
        assert data.get('display') == 'standalone', f"Display should be 'standalone', got: {data.get('display')}"
        print("✓ manifest.json has display: standalone")
    
    def test_manifest_icons_present(self):
        """Test manifest.json has icons array with proper sizes"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        data = response.json()
        icons = data.get('icons', [])
        assert len(icons) > 0, "No icons defined in manifest"
        
        # Check for required icon sizes (192x192 and 512x512 are required for PWA)
        sizes = [icon.get('sizes') for icon in icons]
        assert '192x192' in sizes, "Missing 192x192 icon"
        assert '512x512' in sizes, "Missing 512x512 icon"
        print(f"✓ manifest.json has {len(icons)} icons including required sizes")
    
    def test_manifest_theme_color(self):
        """Test manifest.json has theme_color set"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        data = response.json()
        assert 'theme_color' in data, "Missing theme_color"
        assert data['theme_color'] == '#14532d', f"Expected theme_color #14532d, got: {data['theme_color']}"
        print(f"✓ manifest.json has theme_color: {data['theme_color']}")


class TestServiceWorker:
    """Service worker tests"""
    
    def test_service_worker_accessible(self):
        """Test service-worker.js is accessible"""
        response = requests.get(f"{BASE_URL}/service-worker.js")
        assert response.status_code == 200, f"Service worker not accessible: {response.status_code}"
        print("✓ service-worker.js is accessible")
    
    def test_service_worker_content(self):
        """Test service-worker.js has proper content"""
        response = requests.get(f"{BASE_URL}/service-worker.js")
        content = response.text
        
        # Check for essential service worker events
        assert 'install' in content, "Service worker missing install event"
        assert 'activate' in content, "Service worker missing activate event"
        assert 'fetch' in content, "Service worker missing fetch event"
        print("✓ service-worker.js has install, activate, and fetch events")
    
    def test_service_worker_no_api_caching(self):
        """Test service worker does NOT cache API requests"""
        response = requests.get(f"{BASE_URL}/service-worker.js")
        content = response.text
        
        # Verify API requests are not cached
        assert '/api' in content, "Service worker should reference /api paths"
        # Check for network-only or skip caching for API
        assert 'NEVER cache API' in content or "url.pathname.startsWith('/api')" in content, \
            "Service worker should explicitly handle API requests without caching"
        print("✓ service-worker.js properly excludes API from caching")


class TestProofPackAPI:
    """Proof Pack API endpoint tests - NO AUTH REQUIRED"""
    
    def test_proof_pack_accessible_without_auth(self):
        """Test /api/proof/{caseId} is accessible without authentication"""
        response = requests.get(f"{BASE_URL}/api/proof/case-demo-1")
        assert response.status_code == 200, f"Proof pack should be accessible without auth: {response.status_code}"
        print("✓ /api/proof/case-demo-1 accessible without authentication")
    
    def test_proof_pack_returns_case_data(self):
        """Test proof pack returns complete case data"""
        response = requests.get(f"{BASE_URL}/api/proof/case-demo-1")
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert 'case' in data, "Missing 'case' field"
        assert 'submissions' in data, "Missing 'submissions' field"
        assert 'verifications' in data, "Missing 'verifications' field"
        assert 'verificationCounts' in data, "Missing 'verificationCounts' field"
        assert 'supportersCount' in data, "Missing 'supportersCount' field"
        assert 'generatedAt' in data, "Missing 'generatedAt' field"
        print("✓ Proof pack returns all required fields")
    
    def test_proof_pack_case_details(self):
        """Test proof pack case has required details for QR code display"""
        response = requests.get(f"{BASE_URL}/api/proof/case-demo-1")
        data = response.json()
        case = data.get('case', {})
        
        required_case_fields = ['id', 'title', 'category', 'description', 'status', 
                                'severity', 'lat', 'lng', 'daysIgnored', 'neglectScore']
        for field in required_case_fields:
            assert field in case, f"Case missing field: {field}"
        
        print(f"✓ Proof pack case has all required fields for display")
        print(f"  - Case ID: {case['id']}")
        print(f"  - Title: {case['title']}")
        print(f"  - Days Ignored: {case['daysIgnored']}")
    
    def test_proof_pack_404_for_invalid_case(self):
        """Test proof pack returns 404 for non-existent case"""
        response = requests.get(f"{BASE_URL}/api/proof/invalid-case-id-12345")
        assert response.status_code == 404, f"Expected 404 for invalid case, got: {response.status_code}"
        print("✓ Proof pack returns 404 for invalid case ID")
    
    def test_proof_pack_submissions_timeline(self):
        """Test proof pack includes submissions timeline"""
        response = requests.get(f"{BASE_URL}/api/proof/case-demo-1")
        data = response.json()
        submissions = data.get('submissions', [])
        
        assert len(submissions) > 0, "Proof pack should have submissions"
        
        # Check submission structure
        first_submission = submissions[0]
        required_fields = ['id', 'caseId', 'userId', 'type', 'note', 'createdAt']
        for field in required_fields:
            assert field in first_submission, f"Submission missing field: {field}"
        
        print(f"✓ Proof pack has {len(submissions)} submissions in timeline")


class TestAuthenticationEndpoints:
    """Test authentication for protected vs public endpoints"""
    
    def test_cases_list_public(self):
        """Test /api/cases is publicly accessible"""
        response = requests.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200, f"Cases list should be public: {response.status_code}"
        print("✓ /api/cases is publicly accessible")
    
    def test_case_detail_public(self):
        """Test /api/cases/{id} is publicly accessible"""
        response = requests.get(f"{BASE_URL}/api/cases/case-demo-1")
        assert response.status_code == 200, f"Case detail should be public: {response.status_code}"
        print("✓ /api/cases/case-demo-1 is publicly accessible")
    
    def test_support_requires_auth(self):
        """Test /api/cases/{id}/support requires authentication"""
        response = requests.post(f"{BASE_URL}/api/cases/case-demo-1/support")
        assert response.status_code == 401, f"Support should require auth: {response.status_code}"
        print("✓ /api/cases/case-demo-1/support requires authentication")
    
    def test_verify_requires_auth(self):
        """Test /api/cases/{id}/verify requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/cases/case-demo-1/verify",
            json={"vote": "FIXED"}
        )
        assert response.status_code == 401, f"Verify should require auth: {response.status_code}"
        print("✓ /api/cases/case-demo-1/verify requires authentication")
    
    def test_followup_requires_auth(self):
        """Test /api/cases/{id}/followup requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/cases/case-demo-1/followup",
            json={"note": "Test followup"}
        )
        assert response.status_code == 401, f"Followup should require auth: {response.status_code}"
        print("✓ /api/cases/case-demo-1/followup requires authentication")


class TestLoginCredentials:
    """Test demo login credentials work"""
    
    def test_citizen_login(self):
        """Test citizen demo login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "citizen@demo.com", "password": "demo123"}
        )
        assert response.status_code == 200, f"Citizen login failed: {response.status_code}"
        data = response.json()
        assert 'token' in data, "Login response missing token"
        assert data['user']['role'] == 'citizen', f"Expected citizen role, got: {data['user']['role']}"
        print("✓ Citizen login works (citizen@demo.com / demo123)")
    
    def test_authority_login(self):
        """Test authority demo login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "authority@demo.com", "password": "demo123"}
        )
        assert response.status_code == 200, f"Authority login failed: {response.status_code}"
        data = response.json()
        assert data['user']['role'] == 'authority', f"Expected authority role, got: {data['user']['role']}"
        print("✓ Authority login works (authority@demo.com / demo123)")
    
    def test_moderator_login(self):
        """Test moderator demo login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "moderator@demo.com", "password": "demo123"}
        )
        assert response.status_code == 200, f"Moderator login failed: {response.status_code}"
        data = response.json()
        assert data['user']['role'] == 'moderator', f"Expected moderator role, got: {data['user']['role']}"
        print("✓ Moderator login works (moderator@demo.com / demo123)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
