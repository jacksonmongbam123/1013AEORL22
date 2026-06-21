const express = require("express");
const _ = require("lodash");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const crypto = require("crypto");
const app = express();

// Configure multer storage for Candidate CV uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadDir = "./public/uploads";
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(express.static("public"));
app.use(session({
    secret: process.env.SESSION_SECRET || "jackson mongbam",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000   // 24 hours
    }
}));
app.use(passport.initialize());
app.use(passport.session());

// Attach badge counts to every authenticated admin request
app.use(async function(req, res, next) {
    if (req.isAuthenticated() && req.session && req.session.adminToken) {
        try {
            const [pendingBookings, contactMessages, pendingCandidates] = await Promise.all([
                Book.countDocuments({ status: "Pending" }),
                Contact.countDocuments({ read: false }),
                Candidate.countDocuments({ reviewed: false })
            ]);
            res.locals.adminBadges = { pendingBookings, contactMessages, pendingCandidates };
        } catch(e) {
            res.locals.adminBadges = { pendingBookings: 0, contactMessages: 0, pendingCandidates: 0 };
        }
    } else {
        res.locals.adminBadges = null;
    }
    next();
});

const confirmpassword = process.env.ADMIN_CONFIRM_PASSWORD || "1013AEORL22";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://jacksonadmin:jacksonadmin@cluster0.mkff4zn.mongodb.net/?retryWrites=true&w=majority";
mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
    .then(function() { console.log("MongoDB connected"); })
    .catch(function(err) { console.error("MongoDB connection error:", err.message); });

// ── Schemas ──────────────────────────────────────────────────────────────────

const adminSchema = new mongoose.Schema({ username: String, password: String });
adminSchema.plugin(passportLocalMongoose);
const Admin = mongoose.model("admin", adminSchema);
passport.use(Admin.createStrategy());
passport.serializeUser(Admin.serializeUser());
passport.deserializeUser(Admin.deserializeUser());

const homeSchema = new mongoose.Schema({ title: String, about: String, name: String });
const Home = mongoose.model("home", homeSchema);

const blogSchema = new mongoose.Schema({ title: String, content: String, timestamp: String, date: String });
const Blog = mongoose.model("blog", blogSchema);

const learningSchema = new mongoose.Schema({ title: String, content: String, date: String });
const Learning = mongoose.model("learning", learningSchema);

const contactSchema = new mongoose.Schema({
    name: String, mail: String, number: { type: Number, required: true },
    message: String, time: String, date: String, hour: String, minute: String,
    read: { type: Boolean, default: false }
});
const Contact = mongoose.model("contact", contactSchema);

// ── NEW SCHEMAS ───────────────────────────────────────────────────────────────

const careerSchema = new mongoose.Schema({
    title: String, description: String, location: String,
    type: { type: String, enum: ["Full-Time","Part-Time","Internship","Contract"], default: "Full-Time" },
    salary: String, deadline: String, active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});
const Career = mongoose.model("career", careerSchema);

const termsSchema = new mongoose.Schema({
    title: String, content: String, lastUpdated: { type: Date, default: Date.now }
});
const Terms = mongoose.model("terms", termsSchema);

const bookSchema = new mongoose.Schema({
    name: String, email: String, phone: String, date: String, time: String,
    service: String, message: String,
    status: { type: String, enum: ["Pending","Confirmed","Cancelled"], default: "Pending" },
    createdAt: { type: Date, default: Date.now }
});
const Book = mongoose.model("book", bookSchema);

const homeCardSchema = new mongoose.Schema({
    title: String, description: String,
    icon: { type: String, default: "fa-solid fa-star" },
    order: { type: Number, default: 0 }, active: { type: Boolean, default: true }
});
const HomeCard = mongoose.model("homecard", homeCardSchema);

const candidateSchema = new mongoose.Schema({
    role: String,
    careerId: { type: mongoose.Schema.Types.ObjectId, ref: 'career' },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    message: String,
    
    // Detailed Academic/Biographical background
    address: String,
    class10Percent: String,
    class12Percent: String,
    bachelorDegree: String,
    bachelorCollege: String,
    bachelorPercent: String,
    pgDegree: String,
    pgCollege: String,
    pgPercent: String,
    
    // File upload CV path & attributes
    cvPath: String,
    cvOriginalName: String,
    
    createdAt: { type: Date, default: Date.now },
    reviewed: { type: Boolean, default: false }
});
const Candidate = mongoose.model("candidate", candidateSchema);

// ── Helpers ───────────────────────────────────────────────────────────────────

const today = new Date();
const day = today.toLocaleDateString("en-US", { weekday:"short", day:"numeric", month:"short" });
function isAuth(req, res, next) {
    if (req.isAuthenticated() && req.session.adminToken) return next();
    req.session.destroy(function() {});
    res.redirect("/adminlogin");
}

app.use(function(req, res, next) { res.locals.siteUrl = req.protocol + "://" + req.get("host"); next(); });

// ── SEO ───────────────────────────────────────────────────────────────────────

app.get("/robots.txt", function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    res.type("text/plain").send(["User-agent: *","Allow: /","Disallow: /admin","Disallow: /adminlogin","Disallow: /adminregister","Disallow: /loggedin","Disallow: /compose","Disallow: /postlearnings","Disallow: /edithome","Disallow: /getcontact","Sitemap: "+su+"/sitemap.xml"].join("\n"));
});

app.get("/sitemap.xml", async function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    const iso = new Date().toISOString().split("T")[0];
    const pages = ["/","","/blog","/learnings","/about","/contact","/careers","/terms","/book"].map(u=>
        `<url><loc>${su}${u}</loc><lastmod>${iso}</lastmod><priority>0.8</priority></url>`);
    try { (await Blog.find({})).forEach(p=>pages.push(`<url><loc>${su}/${encodeURIComponent(p.title)}</loc><lastmod>${iso}</lastmod><priority>0.7</priority></url>`)); } catch(e){}
    res.type("application/xml").send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+pages.join("")+"</urlset>");
});

// ── Public Routes ─────────────────────────────────────────────────────────────

app.get("/", async function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    const [homepage, homecards] = await Promise.all([Home.find({}), HomeCard.find({active:true}).sort({order:1})]);
    res.render("index", { homepage, homecards, pageTitle:"Jackson Mongbam — Developer & Programmer", pageDesc:"Personal blog and portfolio.", pageUrl:su });
});

app.get("/learnings", async function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    const learn = await Learning.find().sort({date:-1});
    res.render("learnings", { learn, pageTitle:"Learnings | Jackson Mongbam", pageDesc:"Notes and lessons from Jackson Mongbam.", pageUrl:su+"/learnings" });
});

app.get("/blog", async function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    const postuser = await Blog.find().sort({date:-1});
    res.render("blog", { postuser, pageTitle:"Blog | Jackson Mongbam", pageDesc:"Read Jackson Mongbam's blog.", pageUrl:su+"/blog", ogType:"blog" });
});

app.get("/about", async function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    const homepage = await Home.find({});
    res.render("about", { homepage, pageTitle:"About | Jackson Mongbam", pageDesc:"About Jackson Mongbam.", pageUrl:su+"/about" });
});

app.get("/contact", function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    res.render("contact", { pageTitle:"Contact | Jackson Mongbam", pageDesc:"Contact Jackson Mongbam.", pageUrl:su+"/contact" });
});

app.get("/careers", async function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    const careers = await Career.find({active:true}).sort({createdAt:-1});
    res.render("careers", { careers, pageTitle:"Careers | Jackson Mongbam", pageDesc:"Open positions.", pageUrl:su+"/careers" });
});

app.get("/careers/apply/:id", async function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    try {
        const career = await Career.findById(req.params.id);
        if (!career) return res.redirect("/careers");
        res.render("apply", { career, pageTitle:"Apply for " + career.title + " | Jackson Mongbam", pageDesc:"Submit your application.", pageUrl:su+"/careers/apply/"+req.params.id });
    } catch(err) {
        console.error("Error loading application form:", err);
        res.redirect("/careers");
    }
});

app.post("/careers/apply/:id", upload.single("candidateCV"), async function(req, res) {
    try {
        const career = await Career.findById(req.params.id);
        if (!career) return res.redirect("/careers");
        
        const candidate = new Candidate({
            role: career.title,
            careerId: career._id,
            name: req.body.candidateName,
            email: req.body.candidateEmail,
            phone: req.body.candidatePhone,
            message: req.body.candidateMessage,
            
            // Biographical & Academics
            address: req.body.candidateAddress,
            class10Percent: req.body.candidateClass10,
            class12Percent: req.body.candidateClass12,
            bachelorDegree: req.body.candidateBachelorDegree,
            bachelorCollege: req.body.candidateBachelorCollege,
            bachelorPercent: req.body.candidateBachelorPercent,
            pgDegree: req.body.candidatePgDegree,
            pgCollege: req.body.candidatePgCollege,
            pgPercent: req.body.candidatePgPercent,
            
            // CV credentials reference
            cvPath: req.file ? "/uploads/" + req.file.filename : null,
            cvOriginalName: req.file ? req.file.originalname : null
        });
        await candidate.save();
        res.redirect("/success");
    } catch(err) {
        console.error("Error submitting application:", err);
        res.redirect("/careers");
    }
});

app.get("/terms", async function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    const termsList = await Terms.find({}).sort({_id:1});
    res.render("terms", { termsList, pageTitle:"Terms of Use | Jackson Mongbam", pageDesc:"Terms of use.", pageUrl:su+"/terms" });
});

app.get("/book", function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    res.render("book", { pageTitle:"Book an Appointment | Jackson Mongbam", pageDesc:"Book an appointment.", pageUrl:su+"/book" });
});

app.post("/book", async function(req, res) {
    const b = new Book({ name:req.body.bookName, email:req.body.bookEmail, phone:req.body.bookPhone, date:req.body.bookDate, time:req.body.bookTime, service:req.body.bookService, message:req.body.bookMessage });
    await b.save();
    res.redirect("/success");
});

app.get("/success", function(req, res) { res.render("success"); });
app.get("/maintenance", function(req, res) { res.render("maintenance"); });
app.get("/admin", function(req, res) { res.render("admin"); });
app.get("/adminregister", function(req, res) { res.render("adminregister"); });
app.get("/adminerror", function(req, res) { res.render("adminerror"); });
app.get("/adminloginerror", function(req, res) { res.render("adminloginerror"); });

app.get("/adminlogin", function(req, res) {
    const loginError = req.session.loginError || false;
    req.session.loginError = null;
    res.render("adminlogin", { loginError });
});

app.get("/loggedin", function(req, res) {
    if (!req.isAuthenticated()) return res.redirect("/adminlogin");
    const flash = req.session.flash || null;
    req.session.flash = null;
    res.render("loggedin", { flash });
});

app.get("/updated", isAuth, function(req, res) { res.render("updated"); });

// ── Admin — Existing ──────────────────────────────────────────────────────────

app.get("/edithome", isAuth, async function(req, res) {
    const homepage = await Home.find({});
    res.render("edithome", { homepage });
});

app.post("/edithome/delete/:id", isAuth, async function(req, res) {
    await Home.findByIdAndDelete(req.params.id);
    res.redirect("/edithome");
});

app.post("/edithome", isAuth, async function(req, res) {
    const { homeTitle, aboutBody } = req.body;
    const found = await Home.find({});
    if (found.length === 0) { await new Home({ title:homeTitle, about:aboutBody, name:"jackson" }).save(); }
    else { await Home.updateOne({name:"jackson"},{$set:{title:homeTitle,about:aboutBody}}); }
    res.redirect("/updated");
});

app.get("/postlearnings", isAuth, function(req, res) { res.render("postlearnings"); });
app.post("/postlearnings", isAuth, async function(req, res) {
    await new Learning({ title:req.body.learningsTitle, content:req.body.learningsBody, date:new Date() }).save();
    res.redirect("/updated");
});

app.get("/compose", isAuth, function(req, res) { res.render("compose"); });
app.post("/compose", isAuth, async function(req, res) {
    if (["about","learnings","home","contact"].includes(req.body.postTitle)) return res.redirect("/compose");
    await new Blog({ title:req.body.postTitle, content:req.body.postBody, timestamp:day, date:new Date() }).save();
    res.redirect("/updated");
});

app.get("/overview", isAuth, async function(req, res) {
    const [blogs, learnings, contacts, bookings, careers, candidates, homeCards, terms,
           recentContacts, recentBookings, recentCandidates] = await Promise.all([
        Blog.countDocuments(),
        Learning.countDocuments(),
        Contact.countDocuments(),
        Book.countDocuments(),
        Career.countDocuments(),
        Candidate.countDocuments(),
        HomeCard.countDocuments(),
        Terms.countDocuments(),
        Contact.find().sort({date:-1}).limit(5),
        Book.find().sort({createdAt:-1}).limit(5),
        Candidate.find().sort({createdAt:-1}).limit(5)
    ]);
    const [activeCareers, activeCards, bookingsPending, bookingsConfirmed, bookingsCancelled] = await Promise.all([
        Career.countDocuments({active:true}),
        HomeCard.countDocuments({active:true}),
        Book.countDocuments({status:"Pending"}),
        Book.countDocuments({status:"Confirmed"}),
        Book.countDocuments({status:"Cancelled"})
    ]);
    res.render("overview", {
        counts: { blogs, learnings, contacts, bookings, totalCareers: careers, activeCareers,
                  candidates, totalCards: homeCards, activeCards, terms,
                  bookingsPending, bookingsConfirmed, bookingsCancelled },
        recentContacts, recentBookings, recentCandidates
    });
});

app.get("/getcontact", isAuth, async function(req, res) {
    const contactDetails = await Contact.find().sort({date:-1});
    res.render("getcontact", { contactDetails });
});

app.post("/getcontact/read/:id", isAuth, async function(req, res) {
    await Contact.findByIdAndUpdate(req.params.id, { read: true });
    res.redirect("/getcontact");
});

app.post("/getcontact/readall", isAuth, async function(req, res) {
    await Contact.updateMany({ read: false }, { read: true });
    res.redirect("/getcontact");
});

app.post("/getcontact/delete/:id", isAuth, async function(req, res) {
    await Contact.findByIdAndDelete(req.params.id);
    res.redirect("/getcontact");
});

app.post("/contact", async function(req, res) {
    const t = new Date();
    await new Contact({ name:req.body.contactName, mail:req.body.contactMail, number:req.body.contactNumber, message:req.body.contactMessage, time:t.toDateString(), date:new Date(), hour:t.getHours(), minute:t.getMinutes() }).save();
    res.redirect("/success");
});

// ── Admin — Careers CRUD ──────────────────────────────────────────────────────

app.get("/admin-careers", isAuth, async function(req, res) {
    const careers = await Career.find({}).sort({createdAt:-1});
    res.render("admin-careers", { careers });
});
app.get("/admin-careers/add", isAuth, function(req, res) {
    res.render("admin-career-form", { career:null, action:"/admin-careers/add" });
});
app.post("/admin-careers/add", isAuth, async function(req, res) {
    await new Career({ title:req.body.careerTitle, description:req.body.careerDescription, location:req.body.careerLocation, type:req.body.careerType, salary:req.body.careerSalary, deadline:req.body.careerDeadline, active:req.body.careerActive==="on" }).save();
    res.redirect("/admin-careers");
});
app.get("/admin-careers/edit/:id", isAuth, async function(req, res) {
    const career = await Career.findById(req.params.id);
    res.render("admin-career-form", { career, action:"/admin-careers/edit/"+req.params.id });
});
app.post("/admin-careers/edit/:id", isAuth, async function(req, res) {
    await Career.findByIdAndUpdate(req.params.id, { title:req.body.careerTitle, description:req.body.careerDescription, location:req.body.careerLocation, type:req.body.careerType, salary:req.body.careerSalary, deadline:req.body.careerDeadline, active:req.body.careerActive==="on" });
    res.redirect("/admin-careers");
});
app.post("/admin-careers/delete/:id", isAuth, async function(req, res) {
    await Career.findByIdAndDelete(req.params.id);
    res.redirect("/admin-careers");
});

// ── Admin — Terms CRUD ────────────────────────────────────────────────────────

app.get("/admin-terms", isAuth, async function(req, res) {
    const termsList = await Terms.find({}).sort({_id:1});
    res.render("admin-terms", { termsList });
});
app.get("/admin-terms/add", isAuth, function(req, res) {
    res.render("admin-terms-form", { terms:null, action:"/admin-terms/add" });
});
app.post("/admin-terms/add", isAuth, async function(req, res) {
    await new Terms({ title:req.body.termsTitle, content:req.body.termsContent, lastUpdated:new Date() }).save();
    res.redirect("/admin-terms");
});
app.get("/admin-terms/edit/:id", isAuth, async function(req, res) {
    const terms = await Terms.findById(req.params.id);
    res.render("admin-terms-form", { terms, action:"/admin-terms/edit/"+req.params.id });
});
app.post("/admin-terms/edit/:id", isAuth, async function(req, res) {
    await Terms.findByIdAndUpdate(req.params.id, { title:req.body.termsTitle, content:req.body.termsContent, lastUpdated:new Date() });
    res.redirect("/admin-terms");
});
app.post("/admin-terms/delete/:id", isAuth, async function(req, res) {
    await Terms.findByIdAndDelete(req.params.id);
    res.redirect("/admin-terms");
});

// ── Admin — Bookings ──────────────────────────────────────────────────────────

app.get("/admin-books", isAuth, async function(req, res) {
    const bookings = await Book.find({}).sort({createdAt:-1});
    res.render("admin-books", { bookings });
});
app.post("/admin-books/status/:id", isAuth, async function(req, res) {
    await Book.findByIdAndUpdate(req.params.id, { status:req.body.status });
    res.redirect("/admin-books");
});
app.post("/admin-books/delete/:id", isAuth, async function(req, res) {
    await Book.findByIdAndDelete(req.params.id);
    res.redirect("/admin-books");
});

// ── Admin — Candidate Applications ────────────────────────────────────────────

app.get("/admin-candidates", isAuth, async function(req, res) {
    const candidates = await Candidate.find({}).sort({createdAt:-1});
    res.render("admin-candidates", { candidates });
});
app.post("/admin-candidates/reviewed/:id", isAuth, async function(req, res) {
    await Candidate.findByIdAndUpdate(req.params.id, { reviewed: true });
    res.redirect("/admin-candidates");
});

app.post("/admin-candidates/reviewedall", isAuth, async function(req, res) {
    await Candidate.updateMany({ reviewed: false }, { reviewed: true });
    res.redirect("/admin-candidates");
});

app.post("/admin-candidates/delete/:id", isAuth, async function(req, res) {
    try {
        const candidate = await Candidate.findById(req.params.id);
        if (candidate && candidate.cvPath) {
            const absoluteCvPath = path.join(__dirname || ".", "public", candidate.cvPath);
            if (fs.existsSync(absoluteCvPath)) {
                fs.unlinkSync(absoluteCvPath);
                console.log("Deleted candidate database resume file:", absoluteCvPath);
            }
        }
        await Candidate.findByIdAndDelete(req.params.id);
    } catch(err) {
        console.error("Error deleting candidate application:", err);
    }
    res.redirect("/admin-candidates");
});

// ── Admin — Home Cards CRUD ───────────────────────────────────────────────────

app.get("/admin-homecards", isAuth, async function(req, res) {
    const homecards = await HomeCard.find({}).sort({order:1});
    res.render("admin-homecards", { homecards });
});
app.get("/admin-homecards/add", isAuth, function(req, res) {
    res.render("admin-homecard-form", { card:null, action:"/admin-homecards/add" });
});
app.post("/admin-homecards/add", isAuth, async function(req, res) {
    await new HomeCard({ title:req.body.cardTitle, description:req.body.cardDescription, icon:req.body.cardIcon||"fa-solid fa-star", order:parseInt(req.body.cardOrder)||0, active:req.body.cardActive==="on" }).save();
    res.redirect("/admin-homecards");
});
app.get("/admin-homecards/edit/:id", isAuth, async function(req, res) {
    const card = await HomeCard.findById(req.params.id);
    res.render("admin-homecard-form", { card, action:"/admin-homecards/edit/"+req.params.id });
});
app.post("/admin-homecards/edit/:id", isAuth, async function(req, res) {
    await HomeCard.findByIdAndUpdate(req.params.id, { title:req.body.cardTitle, description:req.body.cardDescription, icon:req.body.cardIcon||"fa-solid fa-star", order:parseInt(req.body.cardOrder)||0, active:req.body.cardActive==="on" });
    res.redirect("/admin-homecards");
});
app.post("/admin-homecards/delete/:id", isAuth, async function(req, res) {
    await HomeCard.findByIdAndDelete(req.params.id);
    res.redirect("/admin-homecards");
});

// ── Auth ──────────────────────────────────────────────────────────────────────

app.post("/adminregister", async function(req, res) {
    if (req.body.adminid !== confirmpassword) return res.redirect("/adminerror");
    try {
        const user = await Admin.register({ username: req.body.username }, req.body.password);
        req.login(user, function(err) {
            if (err) return res.redirect("/adminerror");
            req.session.adminToken = crypto.randomBytes(32).toString("hex");
            req.session.flash = "Registered and logged in successfully.";
            res.redirect("/overview");
        });
    } catch (err) {
        console.error(err);
        res.redirect("/adminerror");
    }
});

app.post("/adminlogin", function(req, res) {
    passport.authenticate("local", function(err, user, info) {
        if (err || !user) {
            req.session.loginError = true;
            return res.redirect("/adminlogin");
        }
        req.login(user, function(err) {
            if (err) {
                req.session.loginError = true;
                return res.redirect("/adminlogin");
            }
            req.session.adminToken = crypto.randomBytes(32).toString("hex");
            req.session.flash = "Logged in successfully.";
            res.redirect("/overview");
        });
    })(req, res);
});

app.get("/logout", function(req, res) {
    req.logout(function() {
        req.session.destroy(function() {
            res.clearCookie("connect.sid");
            res.redirect("/adminlogin");
        });
    });
});

// ── Blog catch-all ────────────────────────────────────────────────────────────

app.get("/:customPost", async function(req, res) {
    const su = req.protocol + "://" + req.get("host");
    const newPost = _.lowerCase(decodeURIComponent(req.params.customPost));
    const posts = await Blog.find({});
    for (const post of posts) {
        if (_.lowerCase(post.title) === newPost) {
            return res.render("blogpost", { postTitle:post.title, postContent:post.content, pageTitle:post.title+" | Jackson Mongbam", pageDesc:post.content.substring(0,155).replace(/\n/g," "), pageUrl:su+"/"+encodeURIComponent(post.title), ogType:"article" });
        }
    }
    res.status(404).render("maintenance");
});

app.listen(process.env.PORT || 3000, "0.0.0.0", function() {
    console.log("Server running on port " + (process.env.PORT || 3000));
});
