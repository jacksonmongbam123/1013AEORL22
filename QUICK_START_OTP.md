# Quick Start: OTP Authentication

## 5-Minute Setup

### Step 1: Install Dependencies

```bash
npm install nodemailer dotenv
```

### Step 2: Create `.env` File

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your email credentials:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Step 3: Gmail Setup (if using Gmail)

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**
3. Create an **App Password**:
   - Select "Mail" and "Windows Computer"
   - Copy the 16-character password
   - Paste into `.env` as `EMAIL_PASS`

### Step 4: Start Your Server

```bash
npm start
```

### Step 5: Test the Flow

1. Go to `/adminlogin`
2. Enter admin credentials
3. Check your email for OTP
4. Enter OTP on verification page
5. You're logged in! ✅

## What Changed?

| File | Change |
|------|--------|
| `index.js` | Added Nodemailer config + OTP routes |
| `views/admin-otp.ejs` | New OTP verification form |
| `.env.example` | Email credentials template |
| `package.json` | Added nodemailer & dotenv |

## Files Modified

- ✅ `index.js` - Added OTP logic
- ✅ `views/admin-otp.ejs` - Created new view
- ✅ `.env.example` - Created template
- ✅ `package.json` - Dependencies added

## Testing Without Email

If you haven't set up email yet, the OTP will print to console:

```
Email credentials not set. OTP is: 123456
```

Use this OTP to test the verification flow.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Email not sending | Check `EMAIL_USER` and `EMAIL_PASS` in `.env` |
| OTP expired | OTP expires after 10 minutes |
| Can't login | Clear cookies and try again |

## Production Checklist

- [ ] Set email credentials in environment
- [ ] Use HTTPS
- [ ] Consider rate limiting
- [ ] Use dedicated email service (SendGrid, Mailgun)
- [ ] Enable logging for security audits

---

For detailed documentation, see `OTP_IMPLEMENTATION_GUIDE.md`
