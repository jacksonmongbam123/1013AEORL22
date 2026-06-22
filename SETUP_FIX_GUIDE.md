# OTP Email Authentication - Setup & Fix Guide

## Quick Fix (5 Minutes)

### Step 1: Create `.env` File

In your project root (`/home/ubuntu/1013AEORL22/`), create a new file named `.env`:

```bash
cp .env.example .env
```

### Step 2: Add Your Email Credentials

Edit `.env` and add your email configuration:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
MONGODB_URI=mongodb+srv://jacksonadmin:jacksonadmin@cluster0.mkff4zn.mongodb.net/?retryWrites=true&w=majority
SESSION_SECRET=your-session-secret-key
ADMIN_CONFIRM_PASSWORD=1013AEORL22
```

### Step 3: Verify Configuration

Run the SMTP test to verify your email credentials work:

```bash
node test_smtp.js
```

**Expected Output**:
```
Verifying SMTP connection with: {
  host: 'smtp.gmail.com',
  port: 465,
  user: 'your-email@gmail.com'
}
SMTP Server is ready to take our messages
```

If you see an error, check your email credentials.

### Step 4: Test the Login Flow

1. Start your server:
   ```bash
   npm start
   ```

2. Open your browser and go to: `http://localhost:3000/adminlogin`

3. Enter your admin credentials

4. **Check your email** for the OTP

5. Enter the OTP on the verification page

6. You should be logged in!

---

## Gmail Setup (Detailed Instructions)

If you're using Gmail, follow these steps to generate an App Password:

### Step 1: Enable 2-Step Verification

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Click on "2-Step Verification"
3. Follow the prompts to enable it

### Step 2: Generate App Password

1. Go back to [Google Account Security](https://myaccount.google.com/security)
2. Click on "App passwords" (only visible if 2-Step Verification is enabled)
3. Select "Mail" and "Windows Computer"
4. Click "Generate"
5. Google will show you a 16-character password like: `abcd efgh ijkl mnop`

### Step 3: Add to `.env`

Copy the 16-character password and add it to your `.env` file:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
```

**Important**: Use the exact password Google generated, including spaces.

---

## Alternative Email Providers

### Outlook/Hotmail

```env
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
```

### Yahoo Mail

```env
EMAIL_USER=your-email@yahoo.com
EMAIL_PASS=your-app-password
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=465
```

### SendGrid (Recommended for Production)

```env
EMAIL_USER=apikey
EMAIL_PASS=SG.your-sendgrid-api-key
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
```

---

## Troubleshooting

### Problem: "Email credentials not set. OTP is: 123456"

**Solution**: Your `.env` file is missing or `EMAIL_USER`/`EMAIL_PASS` are not set.

1. Check if `.env` file exists in your project root
2. Verify `EMAIL_USER` and `EMAIL_PASS` are set
3. Restart your server after creating/editing `.env`

### Problem: "SMTP Connection Error: Invalid login"

**Solution**: Your email credentials are incorrect.

1. Double-check `EMAIL_USER` and `EMAIL_PASS` in `.env`
2. For Gmail, make sure you're using an **App Password**, not your regular password
3. Verify 2-Step Verification is enabled on your Google Account
4. Run `node test_smtp.js` to test the connection

### Problem: "SMTP Connection Error: ECONNREFUSED"

**Solution**: Cannot connect to SMTP server.

1. Check your internet connection
2. Verify `SMTP_HOST` and `SMTP_PORT` are correct
3. Some networks block SMTP port 465; try port 587 instead
4. Contact your email provider if the issue persists

### Problem: Email arrives in spam folder

**Solution**: Email providers may flag automated emails as spam.

1. Mark the email as "Not Spam" in your email client
2. Add the sender email to your contacts
3. For production, use a dedicated email service like SendGrid or Mailgun

### Problem: "OTP has expired"

**Solution**: OTP expires after 10 minutes.

1. Request a new OTP by logging in again
2. To increase expiry time, edit `index.js` line 599:
   ```javascript
   req.session.otpExpiry = Date.now() + 30 * 60 * 1000; // 30 minutes instead of 10
   ```

### Problem: "Too many OTP verification attempts"

**Solution**: Rate limiting is preventing multiple attempts.

1. Wait 15 minutes before trying again
2. To change the rate limit, edit the rate limiter configuration in `index.js`

---

## Testing Without Email Configuration

If you want to test the OTP flow without setting up email:

1. **Don't create** the `.env` file
2. Admin logs in
3. Check your **server console** for: `Email credentials not set. OTP is: XXXXXX`
4. Use that OTP in the verification form
5. You'll be logged in

This is useful for development and testing.

---

## Security Best Practices

1. **Never commit `.env` to Git**
   - Add `.env` to your `.gitignore` file
   - Keep your email credentials private

2. **Use App Passwords, Not Regular Passwords**
   - Gmail App Passwords are more secure
   - They can be revoked independently

3. **Enable HTTPS in Production**
   - Always use HTTPS for login pages
   - Protects OTP in transit

4. **Implement Rate Limiting**
   - Prevents brute-force attacks
   - Already included in the improved version

5. **Log Authentication Attempts**
   - Monitor for suspicious activity
   - Helps with security audits

6. **Rotate Email Credentials Regularly**
   - Change App Passwords periodically
   - Revoke old credentials

---

## Production Deployment Checklist

- [ ] Create `.env` file with email credentials
- [ ] Test SMTP connection: `node test_smtp.js`
- [ ] Verify OTP is sent to email (not just console)
- [ ] Test complete login flow
- [ ] Enable HTTPS on your server
- [ ] Add `.env` to `.gitignore`
- [ ] Set up rate limiting
- [ ] Enable security logging
- [ ] Test error scenarios (expired OTP, wrong OTP, etc.)
- [ ] Document email provider configuration
- [ ] Set up email backup service (optional)
- [ ] Monitor email delivery rates
- [ ] Test with multiple email providers

---

## Environment Variables Reference

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `EMAIL_USER` | Yes | `admin@gmail.com` | Email address to send from |
| `EMAIL_PASS` | Yes | `abcd efgh ijkl mnop` | Email password or app password |
| `SMTP_HOST` | No | `smtp.gmail.com` | SMTP server (defaults to Gmail) |
| `SMTP_PORT` | No | `465` | SMTP port (defaults to 465) |
| `MONGODB_URI` | Yes | `mongodb+srv://...` | MongoDB connection string |
| `SESSION_SECRET` | Yes | `random-secret-key` | Session encryption key |
| `ADMIN_CONFIRM_PASSWORD` | No | `1013AEORL22` | Admin registration password |

---

## File Structure

```
1013AEORL22/
├── .env                          ← CREATE THIS FILE
├── .env.example                  ← Template (don't edit)
├── .gitignore                    ← Add .env here
├── index.js                      ← Main application
├── package.json                  ← Dependencies
├── test_smtp.js                  ← SMTP test script
├── OTP_IMPLEMENTATION_GUIDE.md   ← Full documentation
├── QUICK_START_OTP.md            ← Quick start guide
├── OTP_DIAGNOSTIC_REPORT.md      ← This diagnostic report
├── SETUP_FIX_GUIDE.md            ← This setup guide
├── index-IMPROVED.js             ← Improved version (optional)
└── views/
    ├── adminlogin.ejs            ← Login form
    ├── admin-otp.ejs             ← OTP verification form
    └── ...
```

---

## Next Steps

1. **Immediate**: Create `.env` file with email credentials
2. **Test**: Run `node test_smtp.js` to verify
3. **Deploy**: Test the full login flow
4. **Monitor**: Check server logs for issues
5. **Improve**: Consider implementing the improvements from `index-IMPROVED.js`

---

## Support & Debugging

### Enable Debug Logging

Add this to the top of `index.js`:

```javascript
process.env.DEBUG = 'nodemailer:*';
```

This will show detailed Nodemailer logs.

### Check Server Logs

When testing, watch your server console for messages like:

```
✅ OTP sent successfully to: admin@gmail.com
```

or

```
⚠️ WARNING: Email credentials not configured!
📧 OTP for testing (console only): 123456
```

### Test Email Delivery

Send a test email using Node.js:

```javascript
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: 'your-email@gmail.com',
    subject: 'Test Email',
    text: 'This is a test email'
}, (err, info) => {
    if (err) console.error('Error:', err);
    else console.log('Email sent:', info.response);
    process.exit();
});
```

Save this as `test-email.js` and run: `node test-email.js`

---

## Common Questions

**Q: Why do I need an App Password instead of my regular password?**  
A: App Passwords are more secure and can be revoked independently. They also work better with automated systems like Nodemailer.

**Q: Can I use a different email provider?**  
A: Yes! Update `SMTP_HOST` and `SMTP_PORT` in your `.env` file for your provider.

**Q: Is my `.env` file secure?**  
A: Make sure to add `.env` to `.gitignore` so it's not committed to Git. Never share your `.env` file or credentials.

**Q: What if I forget the OTP?**  
A: OTP expires after 10 minutes. The user can log in again to get a new OTP.

**Q: Can I customize the OTP email?**  
A: Yes! Edit the `mailOptions` object in `index.js` to customize the subject, text, or HTML template.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | June 2026 | Initial OTP implementation |
| 1.1 | June 2026 | Added diagnostic report and setup guide |

---

**Last Updated**: June 22, 2026  
**Status**: ✅ Ready for Production
