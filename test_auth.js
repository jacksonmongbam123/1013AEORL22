const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const adminSchema = new mongoose.Schema({ username: String, password: String });
adminSchema.plugin(passportLocalMongoose);
const Admin = mongoose.model("admin", adminSchema);

console.log("Admin model created successfully");

const MONGODB_URI = "mongodb+srv://jacksonadmin:jacksonadmin@cluster0.mkff4zn.mongodb.net/?retryWrites=true&w=majority";

mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log("Connected to MongoDB");
        try {
            // Try a simple operation that passport-local-mongoose might use
            const user = await Admin.findOne({ username: "test" });
            console.log("Query successful:", user);
            process.exit(0);
        } catch (err) {
            console.error("Error during query:", err);
            process.exit(1);
        }
    })
    .catch(err => {
        console.error("Connection error:", err);
        process.exit(1);
    });
