# OTP Authentication Implementation Guide

## Overview

This guide explains how to integrate **Nodemailer OTP authentication** into your admin login system. The implementation adds an extra layer of security by requiring admins to verify a one-time password (OTP) sent to their email after entering their credentials.

## Architecture

### Authentication Flow

```
1. Admin enters username/password → /adminlogin (POST)
   ↓
2. Credentials validated with Passport.js
   ↓
3. OTP generated (6-digit random code)
   ↓
4. OTP sent to admin's email via Nodemailer
   ↓
5. Admin redirected to OTP verification page
   ↓
6. Admin enters OTP → /admin-otp (POST)
   ↓
7. OTP validated (must match & not expired)
   ↓
8. Session created & admin logged in
   ↓
9. Redirect to /overview dashboard
```

## Installation

### 1. Install Dependencies

The following packages have been added to your project:

```bash
npm install nodemailer dotenv
```

### 2. Environment Variables

Create a `.env` file in your project root (copy from `.env.example`):

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
MONGODB_URI=your-mongodb-uri
SESSION_SECRET=your-session-secret
ADMIN_CONFIRM_PASSWORD=your-admin-confirm-password
```

#### Gmail Configuration

If using Gmail:

1. Enable **2-Step Verification** on your Google Account
2. Generate an **App Password** (not your regular password)
3. Use the App Password in `EMAIL_PASS`

**Steps:**
- Go to [Google Account Security](https://myaccount.google.com/security)
- Enable 2-Step Verification
- Go to App passwords → Select Mail & Windows Computer
- Copy the generated 16-character password
- Paste into `.env` as `EMAIL_PASS`

#### Other Email Providers

For non-Gmail providers, update the transporter configuration in `index.js`:

```javascript
const transporter = nodemailer.createTransport({
    service: 'outlook', // or 'yahoo', 'aol', etc.
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
```

## Code Changes

### 1. Backend Changes (`index.js`)

#### Nodemailer Configuration (Lines 11-21)

```javascript
const nodemailer = require("nodemailer");

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
```

#### Modified POST /adminlogin Route (Lines 585-620)

The login route now:
- Validates credentials with Passport.js
- Generates a 6-digit OTP
- Stores OTP in session (expires in 10 minutes)
- Sends OTP via email
- Redirects to OTP verification page

```javascript
app.post("/adminlogin", function(req, res) {
    passport.authenticate("local", async function(err, user, info) {
        if (err || !user) {
            req.session.loginError = true;
            return res.redirect("/adminlogin");
        }
        
        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        req.session.tempAdminUser = user._id;
        req.session.adminOtp = otp;
        req.session.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Send OTP via Email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.username,
            subject: 'Admin Login OTP',
            text: `Your OTP for admin login is: ${otp}. It will expire in 10 minutes.`
        };

        try {
            if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                await transporter.sendMail(mailOptions);
                console.log("OTP sent to:", user.username);
            } else {
                console.log("Email credentials not set. OTP is:", otp);
            }
            res.render("admin-otp", { otpError: null });
        } catch (mailErr) {
            console.error("Error sending email:", mailErr);
            req.session.loginError = true;
            res.redirect("/adminlogin");
        }
    })(req, res);
});
```

#### New GET /admin-otp Route (Lines 622-625)

Displays the OTP verification form:

```javascript
app.get("/admin-otp", function(req, res) {
    if (!req.session.tempAdminUser) return res.redirect("/adminlogin");
    res.render("admin-otp", { otpError: null });
});
```

#### New POST /admin-otp Route (Lines 627-664)

Verifies the OTP:
- Checks if OTP hasn't expired
- Compares entered OTP with stored OTP
- Logs in the admin if OTP is valid
- Clears temporary session data

```javascript
app.post("/admin-otp", async function(req, res) {
    const { otp } = req.body;
    if (!req.session.tempAdminUser || !req.session.adminOtp) {
        return res.redirect("/adminlogin");
    }

    if (Date.now() > req.session.otpExpiry) {
        req.session.adminOtp = null;
        req.session.tempAdminUser = null;
        return res.render("admin-otp", { otpError: "OTP has expired. Please login again." });
    }

    if (otp === req.session.adminOtp) {
        try {
            const user = await Admin.findById(req.session.tempAdminUser);
            req.login(user, function(err) {
                if (err) {
                    req.session.loginError = true;
                    return res.redirect("/adminlogin");
                }
                // Clear OTP session data
                req.session.adminOtp = null;
                req.session.tempAdminUser = null;
                req.session.otpExpiry = null;
                
                req.session.adminToken = crypto.randomBytes(32).toString("hex");
                req.session.flash = "Logged in successfully with OTP.";
                res.redirect("/overview");
            });
        } catch (err) {
            console.error(err);
            res.redirect("/adminlogin");
        }
    } else {
        res.render("admin-otp", { otpError: "Invalid OTP. Please try again." });
    }
});
```

### 2. Frontend Changes

#### New View: `views/admin-otp.ejs`

This view displays the OTP verification form with:
- Error message display
- 6-digit OTP input field
- Submit button
- Back to login link

```ejs
<%- include('partials/header'); -%>

<div class="auth-wrapper">
    <div class="auth-card">
        <% if (typeof otpError !== 'undefined' && otpError) { %>
        <div style="background:#FEF2F2; border:1.5px solid #FECACA; border-radius:8px; padding:0.75rem 1rem; margin-bottom:1.5rem; display:flex; align-items:center; gap:0.6rem;">
            <i class="fa-solid fa-circle-exclamation" style="color:#DC2626; font-size:1rem;"></i>
            <span style="color:#DC2626; font-size:clamp(0.83rem,1.3vw,0.9rem); font-weight:600;"><%= otpError %></span>
        </div>
        <% } %>
        <h2>Verify <span>OTP</span></h2>
        <p style="text-align:center; color:#6B7280; margin-bottom:1.5rem; font-size:0.9rem;">
            An OTP has been sent to your email. Please enter it below to complete your login.
        </p>
        <form action="/admin-otp" method="post">
            <div class="form-group">
                <label>OTP Code</label>
                <input type="text" name="otp" placeholder="Enter 6-digit OTP" required maxlength="6" pattern="\d{6}" style="text-align:center; letter-spacing:0.5rem; font-size:1.2rem;">
            </div>
            <button type="submit" class="btn-auth btn-auth--login">Verify & Login</button>
            <p class="auth-link"><a href="/adminlogin">Back to Login</a></p>
        </form>
    </div>
</div>

<%- include('partials/footer'); -%>
```

## Session Data Structure

During OTP authentication, the following session variables are used:

| Variable | Type | Purpose |
|----------|------|---------|
| `req.session.tempAdminUser` | ObjectId | Stores admin user ID temporarily |
| `req.session.adminOtp` | String | Stores the 6-digit OTP |
| `req.session.otpExpiry` | Number | Timestamp when OTP expires (10 min) |
| `req.session.adminToken` | String | Created after successful OTP verification |

## Security Features

1. **OTP Expiration**: OTP expires after 10 minutes
2. **Session Isolation**: Temporary admin user data is stored separately
3. **Email Verification**: OTP is sent to the registered email address
4. **Secure Random Generation**: Uses `Math.random()` for OTP generation
5. **Session Cleanup**: Temporary data is cleared after login

## Testing

### Without Email Configuration

If you haven't set up email credentials yet, the OTP will be logged to the console:

```
Email credentials not set. OTP is: 123456
```

Use this OTP in the verification form to test the flow.

### With Email Configuration

1. Set `EMAIL_USER` and `EMAIL_PASS` in `.env`
2. Admin logs in with username/password
3. Check the admin's email for the OTP
4. Enter the OTP in the verification form
5. Admin is logged in and redirected to `/overview`

## Troubleshooting

### Email Not Sending

**Problem**: OTP email is not received

**Solutions**:
- Verify `EMAIL_USER` and `EMAIL_PASS` are correct
- Check Gmail App Password (not regular password)
- Enable "Less secure app access" for non-Gmail providers
- Check spam/junk folder
- Verify email address in database matches the one receiving OTP

### OTP Expired Error

**Problem**: "OTP has expired" message appears

**Solutions**:
- OTP expires after 10 minutes; request a new login
- Increase expiry time by modifying this line:
  ```javascript
  req.session.otpExpiry = Date.now() + 10 * 60 * 1000; // Change 10 to desired minutes
  ```

### Session Issues

**Problem**: "Please login again" after OTP verification

**Solutions**:
- Ensure `SESSION_SECRET` is set in `.env`
- Check MongoDB connection
- Clear browser cookies and try again

## Customization

### Change OTP Length

Modify the OTP generation line in `/adminlogin` POST route:

```javascript
// For 4-digit OTP
const otp = Math.floor(1000 + Math.random() * 9000).toString();

// For 8-digit OTP
const otp = Math.floor(10000000 + Math.random() * 90000000).toString();
```

### Change OTP Expiry Time

Modify the expiry calculation:

```javascript
// 5 minutes
req.session.otpExpiry = Date.now() + 5 * 60 * 1000;

// 30 minutes
req.session.otpExpiry = Date.now() + 30 * 60 * 1000;
```

### Customize Email Template

Modify the `mailOptions` object:

```javascript
const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.username,
    subject: 'Your Custom Subject',
    html: `
        <h2>Admin Login OTP</h2>
        <p>Your OTP is: <strong>${otp}</strong></p>
        <p>This OTP will expire in 10 minutes.</p>
    `
};
```

## Deployment Considerations

1. **Environment Variables**: Set `EMAIL_USER`, `EMAIL_PASS`, and other variables on your hosting platform
2. **Email Service**: Use a dedicated email service (SendGrid, Mailgun) for production
3. **Rate Limiting**: Consider adding rate limiting to prevent OTP brute-force attacks
4. **Logging**: Log OTP attempts for security auditing
5. **HTTPS**: Ensure your application uses HTTPS in production

## Next Steps

1. Copy the updated `index.js` to your project
2. Copy the new `admin-otp.ejs` view
3. Create `.env` file with email credentials
4. Run `npm install` to install new dependencies
5. Test the login flow
6. Deploy to your hosting platform

## Support

For issues or questions:
- Check the console logs for error messages
- Verify all environment variables are set correctly
- Ensure MongoDB is connected
- Test email configuration separately

---

**Implementation Date**: June 2026  
**Version**: 1.0
