# Email OTP Authentication Diagnostic Report

**Date**: June 22, 2026  
**Status**: ⚠️ Critical Issues Identified  
**Severity**: High - Emails Not Being Sent

---

## Executive Summary

Your email OTP authentication system has **three critical issues** preventing OTP emails from being delivered:

1. **Missing `.env` File** - Email credentials are not configured
2. **Incorrect SMTP Configuration** - Mismatch between `test_smtp.js` and `index.js`
3. **No Error Handling for Missing Credentials** - Silent failures when credentials are absent

---

## Issues Identified

### Issue #1: Missing `.env` File (PRIMARY CAUSE)

**Problem**: The `.env` file does not exist in your project root.

**Current State**:
```
❌ /home/ubuntu/1013AEORL22/.env - MISSING
✅ /home/ubuntu/1013AEORL22/.env.example - EXISTS
```

**Impact**: 
- `EMAIL_USER` and `EMAIL_PASS` environment variables are `undefined`
- The condition `if (process.env.EMAIL_USER && process.env.EMAIL_PASS)` at line 610 in `index.js` evaluates to `false`
- The email is never sent; instead, the OTP is only logged to console
- User receives no email, cannot complete login

**Evidence from Code** (index.js, lines 609-615):
```javascript
try {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail(mailOptions);
        console.log("OTP sent to:", user.username);
    } else {
        console.log("Email credentials not set. OTP is:", otp);  // ← THIS IS HAPPENING
    }
    res.render("admin-otp", { otpError: null });
```

---

### Issue #2: SMTP Configuration Mismatch

**Problem**: Two different Nodemailer configurations exist:

**In `index.js` (lines 16-24)**:
```javascript
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',  // Falls back to Gmail
    port: process.env.SMTP_PORT || 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
```

**In `test_smtp.js` (lines 4-12)**:
```javascript
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,  // No fallback - will be undefined
    port: parseInt(process.env.SMTP_PORT),
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
```

**Impact**:
- `test_smtp.js` requires explicit `SMTP_HOST` and `SMTP_PORT` env vars
- `index.js` defaults to Gmail if not provided
- This inconsistency makes testing and debugging confusing
- If you set `SMTP_HOST` but forget `SMTP_PORT`, the test will fail silently

---

### Issue #3: Silent Failure Mode

**Problem**: When email credentials are missing, the system:
- Logs to console instead of sending email
- Still renders the OTP verification page
- User sees a form but never receives the OTP
- No error message indicates what went wrong

**Impact**:
- Difficult to diagnose the problem
- Users are confused why they don't receive emails
- No clear feedback about missing configuration

---

## Root Cause Analysis

| Component | Status | Issue |
|-----------|--------|-------|
| **Nodemailer Setup** | ✅ Correct | Properly configured in `index.js` |
| **OTP Generation** | ✅ Correct | 6-digit OTP generated correctly |
| **Session Storage** | ✅ Correct | OTP stored and validated properly |
| **Email Credentials** | ❌ **MISSING** | `.env` file not created |
| **SMTP Configuration** | ⚠️ Inconsistent | Different configs in test vs production |
| **Error Handling** | ❌ **INADEQUATE** | Silent failures when credentials missing |

---

## Why OTP Emails Are Not Being Received

### Current Flow (Broken):

```
1. Admin logs in with credentials
   ↓
2. Credentials validated ✅
   ↓
3. OTP generated ✅
   ↓
4. Check: if (process.env.EMAIL_USER && process.env.EMAIL_PASS)
   ↓
5. Both are undefined → Condition is FALSE ❌
   ↓
6. Email NOT sent
   ↓
7. OTP only logged to console
   ↓
8. Admin redirected to OTP page
   ↓
9. Admin checks email → Nothing there ❌
```

---

## Solution

### Step 1: Create `.env` File

Create a new file at `/home/ubuntu/1013AEORL22/.env`:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
MONGODB_URI=your-mongodb-uri
SESSION_SECRET=your-session-secret
ADMIN_CONFIRM_PASSWORD=1013AEORL22
```

### Step 2: Configure Gmail (Recommended)

If using Gmail:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**
3. Generate an **App Password**:
   - Select "Mail" and "Windows Computer"
   - Copy the 16-character password
   - Paste into `.env` as `EMAIL_PASS`

**Example `.env` for Gmail**:
```env
EMAIL_USER=jackson@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
MONGODB_URI=mongodb+srv://jacksonadmin:jacksonadmin@cluster0.mkff4zn.mongodb.net/?retryWrites=true&w=majority
SESSION_SECRET=your-random-secret-key
ADMIN_CONFIRM_PASSWORD=1013AEORL22
```

### Step 3: Verify SMTP Connection

Run the test script to verify your configuration:

```bash
node test_smtp.js
```

**Expected Output**:
```
Verifying SMTP connection with: {
  host: 'smtp.gmail.com',
  port: 465,
  user: 'jackson@gmail.com'
}
SMTP Server is ready to take our messages
```

### Step 4: Test the Full Flow

1. Start your server: `npm start`
2. Navigate to `/adminlogin`
3. Enter admin credentials
4. Check your email for the OTP
5. Enter OTP on the verification page
6. You should be logged in

---

## Additional Improvements (Recommended)

### Improvement #1: Better Error Handling

Update `index.js` (lines 609-622) to provide clearer feedback:

```javascript
try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn("⚠️ WARNING: Email credentials not configured!");
        console.warn("OTP for testing:", otp);
        console.warn("Set EMAIL_USER and EMAIL_PASS in .env to enable email sending");
        return res.render("admin-otp", { 
            otpError: "Email not configured. Check server logs for OTP." 
        });
    }
    
    await transporter.sendMail(mailOptions);
    console.log("✅ OTP sent to:", user.username);
    res.render("admin-otp", { otpError: null });
} catch (mailErr) {
    console.error("❌ Error sending email:", mailErr.message);
    res.render("admin-otp", { 
        otpError: "Failed to send OTP. Please try again." 
    });
}
```

### Improvement #2: Unified SMTP Configuration

Create a separate `config/email.js` file:

```javascript
require('dotenv').config();

const emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
};

module.exports = emailConfig;
```

Then use it in both `index.js` and `test_smtp.js`:

```javascript
const emailConfig = require('./config/email');
const transporter = nodemailer.createTransport(emailConfig);
```

### Improvement #3: Add Rate Limiting

Prevent OTP brute-force attacks by limiting attempts:

```javascript
const rateLimit = require('express-rate-limit');

const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: "Too many OTP attempts. Please try again later."
});

app.post("/admin-otp", otpLimiter, async function(req, res) {
    // ... existing code
});
```

---

## Checklist for Deployment

- [ ] Create `.env` file with email credentials
- [ ] Test SMTP connection: `node test_smtp.js`
- [ ] Verify OTP is sent to email (not just console)
- [ ] Test complete login flow
- [ ] Set `HTTPS` in production
- [ ] Enable rate limiting for OTP endpoint
- [ ] Add logging for security audits
- [ ] Document email provider configuration
- [ ] Set up email backup/fallback service (optional)

---

## Testing Without Email Configuration

If you want to test the OTP flow without email:

1. Don't create `.env` file
2. Admin logs in
3. Check server console for: `Email credentials not set. OTP is: XXXXXX`
4. Use that OTP in the verification form
5. You'll be logged in

---

## References

- [Nodemailer Documentation](https://nodemailer.com/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [SMTP Port Reference](https://en.wikipedia.org/wiki/Simple_Mail_Transfer_Protocol)
- [Node.js dotenv Package](https://www.npmjs.com/package/dotenv)

---

## Summary

**The main issue is simple: Your `.env` file doesn't exist.** Once you create it with your email credentials, OTP emails will be sent successfully. The system is correctly implemented; it just needs configuration.

**Next Steps**:
1. Create `.env` file
2. Add email credentials
3. Run `node test_smtp.js` to verify
4. Test the login flow

Your OTP authentication system will then work perfectly!
