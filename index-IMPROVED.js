// This file shows the IMPROVED version of the OTP authentication code
// Copy the relevant sections into your index.js to replace the existing code

// ═══════════════════════════════════════════════════════════════════════════
// IMPROVEMENT #1: Enhanced Error Handling for OTP Email Sending
// ═══════════════════════════════════════════════════════════════════════════
// Replace lines 588-623 in index.js with this improved version:

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
            to: user.username, // Assuming username is the email
            subject: 'Admin Login OTP',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Admin Login OTP</h2>
                    <p style="font-size: 16px; color: #666;">
                        Your One-Time Password (OTP) for admin login is:
                    </p>
                    <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                        <h1 style="color: #007bff; letter-spacing: 5px; margin: 0;">${otp}</h1>
                    </div>
                    <p style="font-size: 14px; color: #999;">
                        This OTP will expire in 10 minutes. If you did not request this, please ignore this email.
                    </p>
                    <p style="font-size: 12px; color: #999; border-top: 1px solid #ddd; padding-top: 10px;">
                        Do not share this OTP with anyone.
                    </p>
                </div>
            `
        };

        try {
            // Check if email credentials are configured
            if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
                console.warn("⚠️  WARNING: Email credentials not configured!");
                console.warn("📧 OTP for testing (console only):", otp);
                console.warn("💡 To enable email sending, set EMAIL_USER and EMAIL_PASS in .env file");
                
                return res.render("admin-otp", { 
                    otpError: "⚠️ Email service not configured. Check server logs for OTP." 
                });
            }
            
            // Attempt to send email
            await transporter.sendMail(mailOptions);
            console.log("✅ OTP sent successfully to:", user.username);
            res.render("admin-otp", { otpError: null });
            
        } catch (mailErr) {
            console.error("❌ Error sending OTP email:", mailErr.message);
            console.error("📋 Full error details:", mailErr);
            
            // Check for common issues
            if (mailErr.message.includes("Invalid login")) {
                console.error("🔐 Issue: EMAIL_USER or EMAIL_PASS is incorrect");
            } else if (mailErr.message.includes("ECONNREFUSED")) {
                console.error("🔌 Issue: Cannot connect to SMTP server");
            }
            
            req.session.loginError = true;
            res.redirect("/adminlogin");
        }
    })(req, res);
});

// ═══════════════════════════════════════════════════════════════════════════
// IMPROVEMENT #2: Enhanced Nodemailer Configuration with Validation
// ═══════════════════════════════════════════════════════════════════════════
// Replace lines 15-24 in index.js with this improved version:

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verify SMTP connection on startup
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter.verify(function(error, success) {
        if (error) {
            console.error("❌ SMTP Connection Error:", error.message);
            console.error("⚠️  Email sending will not work. Check your email credentials.");
        } else {
            console.log("✅ SMTP Server is ready to send emails");
        }
    });
} else {
    console.warn("⚠️  EMAIL_USER or EMAIL_PASS not set. Email sending disabled.");
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPROVEMENT #3: Add Rate Limiting to OTP Endpoint
// ═══════════════════════════════════════════════════════════════════════════
// Add this near the top of index.js after other requires:

const rateLimit = require('express-rate-limit');

// Rate limiter for OTP verification (5 attempts per 15 minutes)
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: "Too many OTP verification attempts. Please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for login attempts (5 attempts per 15 minutes)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many login attempts. Please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});

// Then apply to routes:
// app.post("/adminlogin", loginLimiter, function(req, res) { ... });
// app.post("/admin-otp", otpLimiter, async function(req, res) { ... });

// ═══════════════════════════════════════════════════════════════════════════
// IMPROVEMENT #4: Enhanced OTP Verification with Better Error Messages
// ═══════════════════════════════════════════════════════════════════════════
// Replace lines 630-666 in index.js with this improved version:

app.post("/admin-otp", async function(req, res) {
    const { otp } = req.body;
    
    if (!req.session.tempAdminUser || !req.session.adminOtp) {
        console.warn("⚠️  OTP verification attempted without valid session");
        return res.redirect("/adminlogin");
    }

    // Check if OTP has expired
    if (Date.now() > req.session.otpExpiry) {
        req.session.adminOtp = null;
        req.session.tempAdminUser = null;
        req.session.otpExpiry = null;
        
        console.warn("⚠️  OTP expired for user:", req.session.tempAdminUser);
        return res.render("admin-otp", { 
            otpError: "⏰ OTP has expired. Please login again to receive a new OTP." 
        });
    }

    // Verify OTP
    if (otp === req.session.adminOtp) {
        try {
            const user = await Admin.findById(req.session.tempAdminUser);
            if (!user) {
                console.error("❌ User not found during OTP verification");
                return res.redirect("/adminlogin");
            }
            
            req.login(user, function(err) {
                if (err) {
                    console.error("❌ Error during login:", err);
                    req.session.loginError = true;
                    return res.redirect("/adminlogin");
                }
                
                // Clear OTP session data
                req.session.adminOtp = null;
                req.session.tempAdminUser = null;
                req.session.otpExpiry = null;
                
                req.session.adminToken = crypto.randomBytes(32).toString("hex");
                req.session.flash = "✅ Logged in successfully with OTP verification.";
                
                console.log("✅ Admin logged in successfully:", user.username);
                res.redirect("/overview");
            });
        } catch (err) {
            console.error("❌ Error during OTP verification:", err);
            res.redirect("/adminlogin");
        }
    } else {
        // Invalid OTP - don't clear session, allow retry
        console.warn("⚠️  Invalid OTP entered for user:", req.session.tempAdminUser);
        res.render("admin-otp", { 
            otpError: "❌ Invalid OTP. Please check and try again." 
        });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// IMPROVEMENT #5: Add Logging Middleware for Security Audits
// ═══════════════════════════════════════════════════════════════════════════
// Add this middleware after passport initialization:

app.use(function(req, res, next) {
    // Log authentication attempts
    if (req.path === '/adminlogin' && req.method === 'POST') {
        console.log(`[AUTH] Login attempt from ${req.ip} at ${new Date().toISOString()}`);
    }
    if (req.path === '/admin-otp' && req.method === 'POST') {
        console.log(`[AUTH] OTP verification attempt from ${req.ip} at ${new Date().toISOString()}`);
    }
    if (req.path === '/logout' && req.method === 'GET') {
        console.log(`[AUTH] Logout from ${req.ip} at ${new Date().toISOString()}`);
    }
    next();
});

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY OF IMPROVEMENTS
// ═══════════════════════════════════════════════════════════════════════════
/*
1. ✅ Better Error Messages: Clear feedback when email credentials are missing
2. ✅ SMTP Validation: Verify connection on startup
3. ✅ HTML Email Template: Professional-looking OTP email
4. ✅ Rate Limiting: Prevent brute-force attacks
5. ✅ Enhanced Logging: Better debugging and security audits
6. ✅ Error Details: Log full error information for troubleshooting
7. ✅ Graceful Degradation: Allow testing without email credentials

These improvements make the system more robust, secure, and easier to debug.
*/
