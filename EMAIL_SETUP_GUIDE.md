# Email Service Setup Guide - Send Invoices to Customers

## Overview
This guide will help you configure the email service to send invoice emails **TO your customers**. The system uses **Resend** as the email service provider.

## Important: Email Flow
- ✅ **Emails are sent TO customers** (the email address you enter)
- ✅ **SENDER_EMAIL** is the "from" address (your business email)
- ❌ You don't receive emails - you send them to customers

---

## Step 1: Create Resend Account

1. Go to **https://resend.com**
2. Click **"Sign Up"** (free tier available)
3. Complete the registration process
4. Verify your email address

---

## Step 2: Get Your API Key

1. After logging in, go to **"API Keys"** in the dashboard
2. Click **"Create API Key"**
3. Give it a name (e.g., "Car Wash Manager")
4. Select **"Production"** environment
5. Click **"Add"**
6. **Copy the API key** (starts with `re_...`) - you won't see it again!

---

## Step 3: Set Up Sender Email

You have two options:

### Option A: Use Resend's Test Domain (Quick Setup - For Testing)
1. In Resend dashboard, go to **"Domains"**
2. You'll see a test domain like `onboarding@resend.dev`
3. Use this for testing: `onboarding@resend.dev`

### Option B: Use Your Own Domain (Recommended for Production)
1. In Resend dashboard, go to **"Domains"**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `yourdomain.com`)
4. Follow the DNS setup instructions:
   - Add the provided DNS records to your domain's DNS settings
   - Wait for verification (usually takes a few minutes)
5. Once verified, you can use emails like `invoices@yourdomain.com`

---

## Step 4: Configure Backend Environment

1. Open the file: `carwash-main/backend/.env`

2. Update these two lines:

```env
RESEND_API_KEY=re_your_actual_api_key_here
SENDER_EMAIL=invoices@yourdomain.com
```

**Example:**
```env
RESEND_API_KEY=re_1234567890abcdefghijklmnopqrstuvwxyz
SENDER_EMAIL=invoices@carlogic.com
```

**Or for testing:**
```env
RESEND_API_KEY=re_1234567890abcdefghijklmnopqrstuvwxyz
SENDER_EMAIL=onboarding@resend.dev
```

3. **Save the file**

---

## Step 5: Restart Backend Server

The backend needs to be restarted to load the new environment variables:

1. **Stop the current backend server** (if running):
   - Press `Ctrl + C` in the terminal where it's running

2. **Start it again**:
   ```bash
   cd carwash-main/backend
   python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
   ```

---

## Step 6: Test Email Functionality

1. Open your application in the browser
2. Go to **"Invoices"** page
3. Click the **Mail icon** (✉️) next to any invoice
4. Enter a test email address (you can use your own email to test)
5. Click **"Send Email"**
6. Check your inbox - you should receive the invoice email!

---

## How It Works

### When You Send an Invoice Email:

1. **You enter the customer's email** in the modal
2. **The system sends an email TO that customer**
3. **The email comes FROM** the address you set in `SENDER_EMAIL`
4. **The customer receives** a beautifully formatted HTML invoice

### Email Content Includes:
- Professional HTML formatting
- Company header ("Car Logic")
- Invoice number and date
- Customer name and phone
- Itemized list of services
- Price, tax, and totals
- Proper currency formatting (based on your settings)
- Professional footer

---

## Troubleshooting

### Error: "Email service not configured"
- ✅ Check that `RESEND_API_KEY` is set in `backend/.env`
- ✅ Make sure you restarted the backend server after adding the key
- ✅ Verify the API key is correct (starts with `re_`)

### Error: "Failed to send email"
- ✅ Check that `SENDER_EMAIL` is verified in Resend dashboard
- ✅ For test domain: Use `onboarding@resend.dev`
- ✅ For custom domain: Make sure DNS records are verified
- ✅ Check Resend dashboard for error logs

### Email Not Received
- ✅ Check spam/junk folder
- ✅ Verify the recipient email address is correct
- ✅ Check Resend dashboard → "Logs" to see delivery status
- ✅ Make sure you're not hitting rate limits (free tier has limits)

### Currency Display Issues
- ✅ The email uses the currency from your Settings page
- ✅ Go to Settings and set your preferred currency
- ✅ Supported currencies: USD, EUR, GBP, INR, AUD, CAD, JPY, CNY

---

## Resend Free Tier Limits

- **3,000 emails/month** (free tier)
- **100 emails/day** sending limit
- Perfect for small businesses!

---

## Security Notes

1. **Never commit `.env` file to Git** - it contains your API key
2. **Keep your API key secret** - don't share it publicly
3. **Use environment variables** in production (not hardcoded values)
4. **Rotate API keys** if compromised

---

## Manual Configuration Steps Summary

1. ✅ Sign up at resend.com
2. ✅ Create API key
3. ✅ Set up sender email (test domain or custom domain)
4. ✅ Edit `backend/.env`:
   - Set `RESEND_API_KEY=your_key_here`
   - Set `SENDER_EMAIL=your_sender@email.com`
5. ✅ Restart backend server
6. ✅ Test by sending an invoice email

---

## Changes Made to the Code

### Backend (`server.py`):
1. ✅ **Improved email template** with professional HTML styling
2. ✅ **Added currency support** - uses currency from settings (INR, USD, etc.)
3. ✅ **Better formatting** - proper currency symbols and number formatting
4. ✅ **Enhanced layout** - professional invoice design with CSS styling
5. ✅ **Customer phone** - includes customer phone number in email

### Frontend (`InvoicesPage.js`):
1. ✅ **Auto-fill customer email** - automatically fills customer email if available
2. ✅ **Better UX** - shows tooltip with customer email
3. ✅ **Visual indicator** - shows when customer email is auto-filled

---

## Support

If you need help:
1. Check Resend dashboard for email logs
2. Check browser console (F12) for frontend errors
3. Check backend terminal for server errors
4. Verify all environment variables are set correctly

---

**Last Updated**: January 2026
**Status**: ✅ Ready to Use


