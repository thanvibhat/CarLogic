# CarLogic API Reference

All API endpoints are prefixed with `/api` and return JSON responses.

## Base URL
- Development: `http://localhost:8000/api`
- Production (through Apache): `http://localhost/api` or `http://yourdomain.com/api`

## Authentication
Most endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## Authentication Endpoints (`/api/auth`)

### Register User
- **Method**: POST
- **Endpoint**: `/api/auth/register`
- **Auth**: Not required
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword",
    "name": "Full Name",
    "role": "Staff"
  }
  ```
- **Response**: User object with user_id, email, name, role, created_at

### Login
- **Method**: POST
- **Endpoint**: `/api/auth/login`
- **Auth**: Not required
- **Body**:
  ```json
  {
    "email": "admin@carlogic.com",
    "password": "admin123"
  }
  ```
- **Response**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer"
  }
  ```

### Get Current User
- **Method**: GET
- **Endpoint**: `/api/auth/me`
- **Auth**: Required
- **Response**: Current user object

---

## Customers Endpoints (`/api/customers`)

### Get All Customers
- **Method**: GET
- **Endpoint**: `/api/customers`
- **Auth**: Required
- **Response**: Array of customer objects

### Create Customer
- **Method**: POST
- **Endpoint**: `/api/customers`
- **Auth**: Required
- **Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "address": "123 Main St"
  }
  ```
- **Response**: Created customer object

### Update Customer
- **Method**: PUT
- **Endpoint**: `/api/customers/{customer_id}`
- **Auth**: Required
- **Body**: Same as create (all fields optional)
- **Response**: Updated customer object

### Delete Customer
- **Method**: DELETE
- **Endpoint**: `/api/customers/{customer_id}`
- **Auth**: Required
- **Response**: Success message

### Search Customers
- **Method**: GET
- **Endpoint**: `/api/customers/search/{query}`
- **Auth**: Required
- **Response**: Array of matching customer objects

---

## Products Endpoints (`/api/products`)

### Get All Products
- **Method**: GET
- **Endpoint**: `/api/products`
- **Auth**: Required
- **Response**: Array of product objects

### Create Product
- **Method**: POST
- **Endpoint**: `/api/products`
- **Auth**: Required
- **Body**:
  ```json
  {
    "name": "Basic Wash",
    "code": "BW001",
    "description": "Basic car wash service",
    "price": 25.00,
    "category_id": "category-uuid",
    "duration_minutes": 30
  }
  ```
- **Response**: Created product object

### Update Product
- **Method**: PUT
- **Endpoint**: `/api/products/{product_id}`
- **Auth**: Required
- **Body**: Same as create (all fields optional)
- **Response**: Updated product object

### Delete Product
- **Method**: DELETE
- **Endpoint**: `/api/products/{product_id}`
- **Auth**: Required
- **Response**: Success message

---

## Categories Endpoints (`/api/categories`)

### Get All Categories
- **Method**: GET
- **Endpoint**: `/api/categories`
- **Auth**: Required
- **Response**: Array of category objects

### Create Category
- **Method**: POST
- **Endpoint**: `/api/categories`
- **Auth**: Required
- **Body**:
  ```json
  {
    "name": "Standard Services",
    "description": "Regular car wash services"
  }
  ```
- **Response**: Created category object

### Update Category
- **Method**: PUT
- **Endpoint**: `/api/categories/{category_id}`
- **Auth**: Required
- **Body**: Same as create (all fields optional)
- **Response**: Updated category object

### Delete Category
- **Method**: DELETE
- **Endpoint**: `/api/categories/{category_id}`
- **Auth**: Required
- **Response**: Success message

---

## Taxes Endpoints (`/api/taxes`)

### Get All Taxes
- **Method**: GET
- **Endpoint**: `/api/taxes`
- **Auth**: Required
- **Response**: Array of tax objects

### Create Tax
- **Method**: POST
- **Endpoint**: `/api/taxes`
- **Auth**: Required
- **Body**:
  ```json
  {
    "name": "Sales Tax",
    "percentage": 8.5
  }
  ```
- **Response**: Created tax object

### Update Tax
- **Method**: PUT
- **Endpoint**: `/api/taxes/{tax_id}`
- **Auth**: Required
- **Body**: Same as create (all fields optional)
- **Response**: Updated tax object

### Delete Tax
- **Method**: DELETE
- **Endpoint**: `/api/taxes/{tax_id}`
- **Auth**: Required
- **Response**: Success message

---

## Zones Endpoints (`/api/zones`)

### Get All Zones
- **Method**: GET
- **Endpoint**: `/api/zones`
- **Auth**: Required
- **Response**: Array of zone objects

### Create Zone
- **Method**: POST
- **Endpoint**: `/api/zones`
- **Auth**: Required
- **Body**:
  ```json
  {
    "name": "Bay 1",
    "description": "Front bay with premium equipment",
    "location": "Front",
    "capacity": 1
  }
  ```
- **Response**: Created zone object

### Update Zone
- **Method**: PUT
- **Endpoint**: `/api/zones/{zone_id}`
- **Auth**: Required
- **Body**: Same as create (all fields optional)
- **Response**: Updated zone object

### Delete Zone
- **Method**: DELETE
- **Endpoint**: `/api/zones/{zone_id}`
- **Auth**: Required
- **Response**: Success message

---

## Bookings Endpoints (`/api/bookings`)

### Get All Bookings
- **Method**: GET
- **Endpoint**: `/api/bookings`
- **Auth**: Required
- **Query Parameters**:
  - `customer_id` (optional): Filter by customer
  - `start_date` (optional): Filter from date
  - `end_date` (optional): Filter to date
- **Response**: Array of booking objects

### Create Booking
- **Method**: POST
- **Endpoint**: `/api/bookings`
- **Auth**: Required
- **Body**:
  ```json
  {
    "customer_id": "customer-uuid",
    "zone_id": "zone-uuid",
    "product_id": "product-uuid",
    "appointment_datetime": "2026-01-20T14:30:00",
    "notes": "Extra vacuum needed"
  }
  ```
- **Response**: Created booking object

### Update Booking
- **Method**: PUT
- **Endpoint**: `/api/bookings/{booking_id}`
- **Auth**: Required
- **Body**: Same as create (all fields optional)
- **Response**: Updated booking object

### Delete Booking
- **Method**: DELETE
- **Endpoint**: `/api/bookings/{booking_id}`
- **Auth**: Required
- **Response**: Success message

### Get Booking by Number
- **Method**: GET
- **Endpoint**: `/api/bookings/number/{booking_number}`
- **Auth**: Required
- **Response**: Single booking object

---

## Invoices Endpoints (`/api/invoices`)

### Get All Invoices
- **Method**: GET
- **Endpoint**: `/api/invoices`
- **Auth**: Required
- **Query Parameters**:
  - `customer_id` (optional): Filter by customer
  - `status` (optional): Filter by status (pending, paid, cancelled)
- **Response**: Array of invoice objects

### Create Invoice
- **Method**: POST
- **Endpoint**: `/api/invoices`
- **Auth**: Required
- **Body**:
  ```json
  {
    "customer_id": "customer-uuid",
    "booking_id": "booking-uuid",
    "amount": 29.75,
    "tax_rate": 8.5,
    "notes": "Invoice for booking #BK001"
  }
  ```
- **Response**: Created invoice object

### Update Invoice
- **Method**: PUT
- **Endpoint**: `/api/invoices/{invoice_id}`
- **Auth**: Required
- **Body**: Same as create (all fields optional)
- **Response**: Updated invoice object

### Delete Invoice
- **Method**: DELETE
- **Endpoint**: `/api/invoices/{invoice_id}`
- **Auth**: Required
- **Response**: Success message

---

## Users Endpoints (`/api/users`)

### Get All Users
- **Method**: GET
- **Endpoint**: `/api/users`
- **Auth**: Required
- **Response**: Array of user objects

### Get User by ID
- **Method**: GET
- **Endpoint**: `/api/users/{user_id}`
- **Auth**: Required
- **Response**: Single user object

### Create User
- **Method**: POST
- **Endpoint**: `/api/users`
- **Auth**: Required
- **Body**:
  ```json
  {
    "email": "newuser@example.com",
    "password": "securepassword",
    "name": "New User",
    "role": "Staff"
  }
  ```
- **Response**: Created user object

### Update User
- **Method**: PUT
- **Endpoint**: `/api/users/{user_id}`
- **Auth**: Required
- **Body**: 
  ```json
  {
    "name": "Updated Name",
    "role": "Manager"
  }
  ```
- **Response**: Updated user object

### Delete User
- **Method**: DELETE
- **Endpoint**: `/api/users/{user_id}`
- **Auth**: Required
- **Response**: Success message

---

## Error Responses

All error responses follow this format:
```json
{
  "detail": "Error description"
}
```

### Common HTTP Status Codes
- **200**: OK - Request successful
- **201**: Created - Resource created successfully
- **400**: Bad Request - Invalid input
- **401**: Unauthorized - Missing or invalid token
- **403**: Forbidden - Access denied
- **404**: Not Found - Resource not found
- **500**: Internal Server Error - Server error

---

## Testing the API

### Using cURL
```bash
# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@carlogic.com","password":"admin123"}'

# Use the returned token for authenticated requests
curl -X GET http://localhost:8000/api/customers \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Using FastAPI Docs
Visit `http://localhost:8000/docs` - Interactive API documentation with "Try it out" feature

### Using Postman
1. Import endpoints into Postman
2. Create Authorization header with Bearer token
3. Test requests

---

## Rate Limiting
Currently: No rate limiting configured
(Can be added for production use)

## Pagination
Currently: Returns all results
(Can be added for large datasets)

## Filtering
Some endpoints support filtering via query parameters:
- Customer search: `/api/customers/search/{query}`
- Booking filters: date range, customer_id
- Invoice filters: status, customer_id
