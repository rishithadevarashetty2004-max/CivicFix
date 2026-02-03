#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class PoNAPITester:
    def __init__(self, base_url="https://neglectproof.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/api{endpoint}"
        headers = {}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if data and not files:
            headers['Content-Type'] = 'application/json'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, headers={k: v for k, v in headers.items() if k != 'Content-Type'}, data=data, files=files)
                elif isinstance(data, dict) and 'Content-Type' not in headers:
                    # FormData
                    response = requests.post(url, headers={k: v for k, v in headers.items() if k != 'Content-Type'}, data=data)
                else:
                    response = requests.post(url, headers=headers, json=data)
            elif method == 'PUT':
                response = requests.put(url, headers=headers, json=data)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            
            if success:
                try:
                    return True, response.json()
                except:
                    return True, {"message": "Success"}
            else:
                try:
                    error_data = response.json()
                    self.log_test(name, False, f"Status {response.status_code}, Expected {expected_status}. Response: {error_data}")
                except:
                    self.log_test(name, False, f"Status {response.status_code}, Expected {expected_status}")
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test("Root API", "GET", "/", 200)
        self.log_test("Root API", success, "" if success else "API not accessible")
        return success

    def test_seed_data(self):
        """Create seed data"""
        success, response = self.run_test("Seed Data", "POST", "/seed", 200)
        self.log_test("Seed Data Creation", success)
        return success

    def test_categories(self):
        """Test categories endpoint"""
        success, response = self.run_test("Get Categories", "GET", "/categories", 200)
        if success and 'categories' in response:
            self.log_test("Categories API", True)
            return True
        else:
            self.log_test("Categories API", False, "Missing categories in response")
            return False

    def test_auth_register(self):
        """Test user registration"""
        test_user_data = {
            "name": f"Test User {datetime.now().strftime('%H%M%S')}",
            "email": f"test_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "testpass123",
            "role": "citizen"
        }
        
        success, response = self.run_test("User Registration", "POST", "/auth/register", 200, test_user_data)
        
        if success and 'token' in response and 'user' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            self.log_test("User Registration", True)
            return True
        else:
            self.log_test("User Registration", False, "Missing token or user in response")
            return False

    def test_auth_login_demo(self):
        """Test login with demo credentials"""
        demo_credentials = {
            "email": "citizen@demo.com",
            "password": "demo123"
        }
        
        success, response = self.run_test("Demo Login", "POST", "/auth/login", 200, demo_credentials)
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            self.log_test("Demo Login", True)
            return True
        else:
            self.log_test("Demo Login", False, "Login failed")
            return False

    def test_auth_me(self):
        """Test get current user"""
        if not self.token:
            self.log_test("Get Current User", False, "No token available")
            return False
            
        success, response = self.run_test("Get Current User", "GET", "/auth/me", 200)
        
        if success and 'id' in response:
            self.log_test("Get Current User", True)
            return True
        else:
            self.log_test("Get Current User", False, "Invalid user response")
            return False

    def test_cases_list(self):
        """Test get cases list"""
        success, response = self.run_test("Get Cases List", "GET", "/cases", 200)
        
        if success and 'cases' in response:
            self.log_test("Get Cases List", True)
            return True, response['cases']
        else:
            self.log_test("Get Cases List", False, "Missing cases in response")
            return False, []

    def test_case_detail(self, case_id):
        """Test get case detail"""
        success, response = self.run_test("Get Case Detail", "GET", f"/cases/{case_id}", 200)
        
        if success and 'case' in response:
            self.log_test("Get Case Detail", True)
            return True, response
        else:
            self.log_test("Get Case Detail", False, "Missing case in response")
            return False, {}

    def test_create_case(self):
        """Test case creation"""
        if not self.token:
            self.log_test("Create Case", False, "No authentication token")
            return False, None
            
        case_data = {
            "title": f"Test Case {datetime.now().strftime('%H%M%S')}",
            "category": "garbage_dump",
            "description": "Test garbage dump issue for API testing",
            "severity": 4,
            "lat": 28.6139,
            "lng": 77.2090,
            "harmTypes": ["health_hazard", "odor"]
        }
        
        success, response = self.run_test("Create Case", "POST", "/cases", 200, case_data)
        
        if success and 'case' in response:
            case_id = response['case']['id']
            self.log_test("Create Case", True)
            return True, case_id
        else:
            self.log_test("Create Case", False, "Case creation failed")
            return False, None

    def test_support_case(self, case_id):
        """Test case support functionality"""
        if not self.token or not case_id:
            self.log_test("Support Case", False, "Missing token or case_id")
            return False
            
        success, response = self.run_test("Support Case", "POST", f"/cases/{case_id}/support", 200)
        
        if success and 'supported' in response:
            self.log_test("Support Case", True)
            return True
        else:
            self.log_test("Support Case", False, "Support failed")
            return False

    def test_followup_case(self, case_id):
        """Test adding followup to case"""
        if not self.token or not case_id:
            self.log_test("Add Followup", False, "Missing token or case_id")
            return False
            
        followup_data = {
            "note": "Test followup evidence",
            "lat": 28.6139,
            "lng": 77.2090
        }
        
        success, response = self.run_test("Add Followup", "POST", f"/cases/{case_id}/followup", 200, followup_data)
        
        if success and 'submission' in response:
            self.log_test("Add Followup", True)
            return True
        else:
            self.log_test("Add Followup", False, "Followup failed")
            return False

    def test_authority_login(self):
        """Test authority login"""
        auth_credentials = {
            "email": "authority@demo.com",
            "password": "demo123"
        }
        
        success, response = self.run_test("Authority Login", "POST", "/auth/login", 200, auth_credentials)
        
        if success and 'token' in response:
            old_token = self.token
            self.token = response['token']
            self.log_test("Authority Login", True)
            return True, old_token
        else:
            self.log_test("Authority Login", False, "Authority login failed")
            return False, None

    def test_authority_cases(self):
        """Test authority cases endpoint"""
        success, response = self.run_test("Authority Cases", "GET", "/authority/cases", 200)
        
        if success and 'cases' in response:
            self.log_test("Authority Cases", True)
            return True, response['cases']
        else:
            self.log_test("Authority Cases", False, "Authority cases failed")
            return False, []

    def test_resolve_case(self, case_id):
        """Test case resolution by authority"""
        if not self.token or not case_id:
            self.log_test("Resolve Case", False, "Missing token or case_id")
            return False
            
        resolve_data = {
            "note": "Test resolution by authority"
        }
        
        success, response = self.run_test("Resolve Case", "POST", f"/cases/{case_id}/resolve", 200, resolve_data)
        
        if success:
            self.log_test("Resolve Case", True)
            return True
        else:
            self.log_test("Resolve Case", False, "Case resolution failed")
            return False

    def test_moderator_login(self):
        """Test moderator login"""
        mod_credentials = {
            "email": "moderator@demo.com",
            "password": "demo123"
        }
        
        success, response = self.run_test("Moderator Login", "POST", "/auth/login", 200, mod_credentials)
        
        if success and 'token' in response:
            old_token = self.token
            self.token = response['token']
            self.log_test("Moderator Login", True)
            return True, old_token
        else:
            self.log_test("Moderator Login", False, "Moderator login failed")
            return False, None

    def test_moderator_cases(self):
        """Test moderator cases endpoint"""
        success, response = self.run_test("Moderator Cases", "GET", "/moderator/cases", 200)
        
        if success and 'all' in response:
            self.log_test("Moderator Cases", True)
            return True, response
        else:
            self.log_test("Moderator Cases", False, "Moderator cases failed")
            return False, {}

    def test_verify_case(self, case_id):
        """Test case verification"""
        if not self.token or not case_id:
            self.log_test("Verify Case", False, "Missing token or case_id")
            return False
            
        verify_data = {
            "vote": "FIXED"
        }
        
        success, response = self.run_test("Verify Case", "POST", f"/cases/{case_id}/verify", 200, verify_data)
        
        if success:
            self.log_test("Verify Case", True)
            return True
        else:
            self.log_test("Verify Case", False, "Case verification failed")
            return False

    def test_proof_pack(self, case_id):
        """Test proof pack generation"""
        if not case_id:
            self.log_test("Proof Pack", False, "Missing case_id")
            return False
            
        success, response = self.run_test("Proof Pack", "GET", f"/proof/{case_id}", 200)
        
        if success and 'case' in response:
            self.log_test("Proof Pack", True)
            return True
        else:
            self.log_test("Proof Pack", False, "Proof pack generation failed")
            return False

    def run_all_tests(self):
        """Run comprehensive API tests"""
        print("🚀 Starting CivicFix API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)

        # Basic API tests
        if not self.test_root_endpoint():
            print("❌ API not accessible, stopping tests")
            return False

        # Seed data
        self.test_seed_data()
        
        # Categories
        self.test_categories()

        # Authentication tests
        if not self.test_auth_register():
            print("❌ Registration failed, trying demo login")
            if not self.test_auth_login_demo():
                print("❌ Demo login failed, stopping tests")
                return False

        self.test_auth_me()

        # Cases tests
        success, cases = self.test_cases_list()
        case_id = None
        
        if cases and len(cases) > 0:
            case_id = cases[0]['id']
            self.test_case_detail(case_id)

        # Create new case
        success, new_case_id = self.test_create_case()
        if success and new_case_id:
            case_id = new_case_id
            self.test_support_case(case_id)
            self.test_followup_case(case_id)

        # Authority tests
        citizen_token = self.token
        success, old_token = self.test_authority_login()
        if success:
            self.test_authority_cases()
            if case_id:
                self.test_resolve_case(case_id)

        # Moderator tests
        success, old_token = self.test_moderator_login()
        if success:
            self.test_moderator_cases()
            if case_id:
                self.test_verify_case(case_id)

        # Proof pack test
        if case_id:
            self.test_proof_pack(case_id)

        # Print results
        print("\n" + "=" * 60)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = PoNAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())