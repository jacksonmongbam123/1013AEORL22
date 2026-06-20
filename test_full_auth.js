const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");
const passport = require("passport");

const adminSchema = new mongoose.Schema({ username: String, password: String });
adminSchema.plugin(passportLocalMongoose);
const Admin = mongoose.model("admin", adminSchema);

passport.use(Admin.createStrategy());
passport.serializeUser(Admin.serializeUser());
passport.deserializeUser(Admin.deserializeUser());

const MONGODB_URI = "mongodb+srv://jacksonadmin:jacksonadmin@cluster0.mkff4zn.mongodb.net/test_db?retryWrites=true&w=majority";

async function runTest() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB");

        // Clean up previous test user
        await Admin.deleteMany({ username: "testuser@example.com" });

        // Test Registration
        console.log("Testing registration...");
        const user = await Admin.register({ username: "testuser@example.com" }, "testpassword123");
        console.log("Registration successful");

        // Test Authentication
        console.log("Testing authentication...");
        const { user: authenticatedUser, error } = await new Promise((resolve) => {
            const authenticate = Admin.authenticate();
            authenticate("testuser@example.com", "testpassword123", (err, user, info) => {
                if (err) resolve({ error: err });
                else if (!user) resolve({ error: info });
                else resolve({ user });
            });
        });

        if (error) {
            console.error("Authentication failed:", error);
        } else {
            console.log("Authentication successful for:", authenticatedUser.username);
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error("Test failed with error:", err);
        process.exit(1);
    }
}

runTest();
