import requests
import sys
from datetime import datetime, timedelta
import json

class CarWashAPITester:
    def __init__(self, base_url="https://cleanwheels-10.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tokens = {}
        self.test_data = {}
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_authentication(self):
        """Test authentication for all roles"""
        print("\n🔐 Testing Authentication...")
        
        # Test login for each role
        credentials = [
            ("admin@carlogic.com", "admin123", "Admin"),
            ("manager@carlogic.com", "manager123", "Manager"),
            ("staff@carlogic.com", "staff123", "Staff")
        ]
        
        for email, password, role in credentials:
            success, response = self.run_test(
                f"Login as {role}",
                "POST",
                "auth/login",
                200,
                data={"email": email, "password": password}
            )
            if success and 'token' in response:
                self.tokens[role] = response['token']
                print(f"   Token stored for {role}")
            else:
                print(f"   Failed to get token for {role}")
                return False
        
        # Test /auth/me endpoint
        for role in ["Admin", "Manager", "Staff"]:
            if role in self.tokens:
                success, response = self.run_test(
                    f"Get current user ({role})",
                    "GET",
                    "auth/me",
                    200,
                    token=self.tokens[role]
                )
                if success and response.get('role') == role:
                    print(f"   ✅ {role} user verified")
                else:
                    print(f"   ❌ {role} user verification failed")
        
        return True

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        print("\n📊 Testing Dashboard Stats...")
        
        success, response = self.run_test(
            "Get dashboard stats",
            "GET",
            "dashboard/stats",
            200,
            token=self.tokens.get("Admin")
        )
        
        if success:
            required_fields = ['total_customers', 'total_bookings', 'pending_bookings', 
                             'completed_bookings', 'total_zones', 'active_zones']
            for field in required_fields:
                if field in response:
                    print(f"   ✅ {field}: {response[field]}")
                else:
                    print(f"   ❌ Missing field: {field}")
        
        return success

    def test_customers_crud(self):
        """Test customers CRUD operations"""
        print("\n👥 Testing Customers CRUD...")
        
        # Create customer
        customer_data = {
            "name": "Test Customer",
            "email": "test@example.com",
            "phone": "123-456-7890",
            "address": "123 Test St"
        }
        
        success, response = self.run_test(
            "Create customer",
            "POST",
            "customers",
            200,
            data=customer_data,
            token=self.tokens.get("Admin")
        )
        
        if success and 'customer_id' in response:
            customer_id = response['customer_id']
            self.test_data['customer_id'] = customer_id
            print(f"   Customer created with ID: {customer_id}")
            
            # Get customers
            success, response = self.run_test(
                "Get customers",
                "GET",
                "customers",
                200,
                token=self.tokens.get("Admin")
            )
            
            # Update customer
            update_data = {
                "name": "Updated Customer",
                "email": "updated@example.com",
                "phone": "987-654-3210",
                "address": "456 Updated St"
            }
            
            success, response = self.run_test(
                "Update customer",
                "PUT",
                f"customers/{customer_id}",
                200,
                data=update_data,
                token=self.tokens.get("Admin")
            )
            
            return True
        
        return False

    def test_categories_crud(self):
        """Test categories CRUD operations"""
        print("\n📂 Testing Categories CRUD...")
        
        # Create category
        category_data = {
            "name": "Test Category",
            "description": "Test category description"
        }
        
        success, response = self.run_test(
            "Create category",
            "POST",
            "categories",
            200,
            data=category_data,
            token=self.tokens.get("Admin")
        )
        
        if success and 'category_id' in response:
            category_id = response['category_id']
            self.test_data['category_id'] = category_id
            print(f"   Category created with ID: {category_id}")
            
            # Get categories
            success, response = self.run_test(
                "Get categories",
                "GET",
                "categories",
                200,
                token=self.tokens.get("Admin")
            )
            
            return True
        
        return False

    def test_taxes_crud(self):
        """Test taxes CRUD operations"""
        print("\n💰 Testing Taxes CRUD...")
        
        # Create tax
        tax_data = {
            "name": "Test Tax",
            "percentage": 10.5
        }
        
        success, response = self.run_test(
            "Create tax",
            "POST",
            "taxes",
            200,
            data=tax_data,
            token=self.tokens.get("Admin")
        )
        
        if success and 'tax_id' in response:
            tax_id = response['tax_id']
            self.test_data['tax_id'] = tax_id
            print(f"   Tax created with ID: {tax_id}")
            
            # Get taxes
            success, response = self.run_test(
                "Get taxes",
                "GET",
                "taxes",
                200,
                token=self.tokens.get("Admin")
            )
            
            return True
        
        return False

    def test_products_crud(self):
        """Test products CRUD operations"""
        print("\n🧽 Testing Products CRUD...")
        
        # Create product (requires category and tax)
        if 'category_id' not in self.test_data or 'tax_id' not in self.test_data:
            print("   ❌ Missing category or tax for product creation")
            return False
        
        product_data = {
            "name": "Test Car Wash",
            "code": "TCW001",
            "category_id": self.test_data['category_id'],
            "tax_ids": [self.test_data['tax_id']],
            "buy_price": 15.00,
            "sell_price": 25.00
        }
        
        success, response = self.run_test(
            "Create product",
            "POST",
            "products",
            200,
            data=product_data,
            token=self.tokens.get("Admin")
        )
        
        if success and 'product_id' in response:
            product_id = response['product_id']
            self.test_data['product_id'] = product_id
            print(f"   Product created with ID: {product_id}")
            
            # Get products
            success, response = self.run_test(
                "Get products",
                "GET",
                "products",
                200,
                token=self.tokens.get("Admin")
            )
            
            return True
        
        return False

    def test_zones_crud(self):
        """Test wash zones CRUD operations"""
        print("\n🏭 Testing Wash Zones CRUD...")
        
        # Create zone
        zone_data = {
            "name": "Test Zone",
            "is_active": True
        }
        
        success, response = self.run_test(
            "Create zone",
            "POST",
            "zones",
            200,
            data=zone_data,
            token=self.tokens.get("Admin")
        )
        
        if success and 'zone_id' in response:
            zone_id = response['zone_id']
            self.test_data['zone_id'] = zone_id
            print(f"   Zone created with ID: {zone_id}")
            
            # Get zones
            success, response = self.run_test(
                "Get zones",
                "GET",
                "zones",
                200,
                token=self.tokens.get("Admin")
            )
            
            # Toggle zone status
            toggle_data = {
                "name": "Test Zone",
                "is_active": False
            }
            
            success, response = self.run_test(
                "Update zone status",
                "PUT",
                f"zones/{zone_id}",
                200,
                data=toggle_data,
                token=self.tokens.get("Admin")
            )
            
            return True
        
        return False

    def test_bookings_crud(self):
        """Test bookings CRUD operations"""
        print("\n📅 Testing Bookings CRUD...")
        
        # Check required data
        required_fields = ['customer_id', 'zone_id', 'product_id']
        for field in required_fields:
            if field not in self.test_data:
                print(f"   ❌ Missing {field} for booking creation")
                return False
        
        # Create booking
        appointment_time = (datetime.now() + timedelta(days=1)).isoformat()
        booking_data = {
            "customer_id": self.test_data['customer_id'],
            "zone_id": self.test_data['zone_id'],
            "product_ids": [self.test_data['product_id']],
            "appointment_datetime": appointment_time,
            "vehicle_pickup_by_us": True,
            "vehicle_dropoff_by_us": False
        }
        
        success, response = self.run_test(
            "Create booking",
            "POST",
            "bookings",
            200,
            data=booking_data,
            token=self.tokens.get("Admin")
        )
        
        if success and 'booking_id' in response:
            booking_id = response['booking_id']
            self.test_data['booking_id'] = booking_id
            print(f"   Booking created with ID: {booking_id}")
            
            # Get bookings
            success, response = self.run_test(
                "Get bookings",
                "GET",
                "bookings",
                200,
                token=self.tokens.get("Admin")
            )
            
            # Update booking status to Completed
            status_data = {"status": "Completed"}
            success, response = self.run_test(
                "Update booking status",
                "PUT",
                f"bookings/{booking_id}",
                200,
                data=status_data,
                token=self.tokens.get("Admin")
            )
            
            return True
        
        return False

    def test_settings_api(self):
        """Test settings API for currency and tax bifurcation"""
        print("\n⚙️ Testing Settings API...")
        
        # Get current settings
        success, response = self.run_test(
            "Get settings",
            "GET",
            "settings",
            200,
            token=self.tokens.get("Admin")
        )
        
        if success:
            print(f"   Current currency: {response.get('currency', 'Not set')}")
            print(f"   Tax bifurcation: {response.get('show_tax_bifurcation', 'Not set')}")
            
            # Test updating currency to INR
            update_data = {
                "currency": "INR",
                "show_tax_bifurcation": True
            }
            
            success, response = self.run_test(
                "Update settings to INR",
                "PUT",
                "settings",
                200,
                data=update_data,
                token=self.tokens.get("Admin")
            )
            
            if success and response.get('currency') == 'INR':
                print("   ✅ Currency updated to INR successfully")
                
                # Test updating currency to USD
                update_data = {
                    "currency": "USD",
                    "show_tax_bifurcation": False
                }
                
                success, response = self.run_test(
                    "Update settings to USD",
                    "PUT",
                    "settings",
                    200,
                    data=update_data,
                    token=self.tokens.get("Admin")
                )
                
                if success and response.get('currency') == 'USD':
                    print("   ✅ Currency updated to USD successfully")
                    return True
                else:
                    print("   ❌ Failed to update currency to USD")
            else:
                print("   ❌ Failed to update currency to INR")
        
        return False

    def test_bookings_filtering(self):
        """Test bookings filtering and pagination"""
        print("\n🔍 Testing Bookings Filtering...")
        
        # Test status filter
        success, response = self.run_test(
            "Get bookings with status filter",
            "GET",
            "bookings?status=Pending",
            200,
            token=self.tokens.get("Admin")
        )
        
        if success:
            print(f"   ✅ Found {len(response)} pending bookings")
        
        # Test pagination
        success, response = self.run_test(
            "Get bookings with pagination",
            "GET",
            "bookings?page=1&page_size=10",
            200,
            token=self.tokens.get("Admin")
        )
        
        if success:
            print(f"   ✅ Pagination working - got {len(response)} bookings")
        
        # Test bookings count
        success, response = self.run_test(
            "Get bookings count",
            "GET",
            "bookings/count",
            200,
            token=self.tokens.get("Admin")
        )
        
        if success and 'total' in response:
            print(f"   ✅ Total bookings count: {response['total']}")
            return True
        
        return False

    def test_invoices_crud(self):
        """Test invoices CRUD operations"""
        print("\n🧾 Testing Invoices CRUD...")
        
        # Check if we have a completed booking
        if 'booking_id' not in self.test_data:
            print("   ❌ Missing booking for invoice creation")
            return False
        
        # Create invoice
        invoice_data = {
            "booking_id": self.test_data['booking_id'],
            "discount_percentage": 10.0
        }
        
        success, response = self.run_test(
            "Create invoice",
            "POST",
            "invoices",
            200,
            data=invoice_data,
            token=self.tokens.get("Admin")
        )
        
        if success and 'invoice_id' in response:
            invoice_id = response['invoice_id']
            self.test_data['invoice_id'] = invoice_id
            print(f"   Invoice created with ID: {invoice_id}")
            
            # Get invoices
            success, response = self.run_test(
                "Get invoices",
                "GET",
                "invoices",
                200,
                token=self.tokens.get("Admin")
            )
            
            # Get specific invoice
            success, response = self.run_test(
                "Get specific invoice",
                "GET",
                f"invoices/{invoice_id}",
                200,
                token=self.tokens.get("Admin")
            )
            
            return True
        
        return False

    def test_role_based_access(self):
        """Test role-based access control"""
        print("\n🔒 Testing Role-Based Access Control...")
        
        # Test Users endpoint - only Admin should access
        success, response = self.run_test(
            "Admin access to users",
            "GET",
            "users",
            200,
            token=self.tokens.get("Admin")
        )
        
        if success:
            print("   ✅ Admin can access users endpoint")
        
        # Test Manager access to users (should fail)
        success, response = self.run_test(
            "Manager access to users (should fail)",
            "GET",
            "users",
            403,
            token=self.tokens.get("Manager")
        )
        
        if success:
            print("   ✅ Manager correctly denied access to users")
        
        # Test Staff access to users (should fail)
        success, response = self.run_test(
            "Staff access to users (should fail)",
            "GET",
            "users",
            403,
            token=self.tokens.get("Staff")
        )
        
        if success:
            print("   ✅ Staff correctly denied access to users")
        
        return True

    def test_delete_operations(self):
        """Test delete operations (Admin/Manager only)"""
        print("\n🗑️ Testing Delete Operations...")
        
        # Test delete with Staff role (should fail)
        if 'customer_id' in self.test_data:
            success, response = self.run_test(
                "Staff delete customer (should fail)",
                "DELETE",
                f"customers/{self.test_data['customer_id']}",
                403,
                token=self.tokens.get("Staff")
            )
            
            if success:
                print("   ✅ Staff correctly denied delete access")
        
        return True

def main():
    """Main test execution"""
    print("🚗 Starting HydroFlow Car Wash API Tests...")
    print("=" * 50)
    
    tester = CarWashAPITester()
    
    # Run all tests
    test_methods = [
        tester.test_authentication,
        tester.test_settings_api,
        tester.test_dashboard_stats,
        tester.test_customers_crud,
        tester.test_categories_crud,
        tester.test_taxes_crud,
        tester.test_products_crud,
        tester.test_zones_crud,
        tester.test_bookings_crud,
        tester.test_bookings_filtering,
        tester.test_invoices_crud,
        tester.test_role_based_access,
        tester.test_delete_operations
    ]
    
    for test_method in test_methods:
        try:
            test_method()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())