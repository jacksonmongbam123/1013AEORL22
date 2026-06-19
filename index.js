const express = require("express");
const bodyParser = require("body-parser");
const _ = require("lodash");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(express.static("public"));
app.use(session({
    secret: "jackson mongbam",
    resave: false,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

const confirmpassword = "1013AEORL22";

mongoose.connect("mongodb+srv://jacksonadmin:jacksonadmin@cluster0.mkff4zn.mongodb.net/?retryWrites=true&w=majority", {useNewUrlParser: true});

const adminSchema = new mongoose.Schema ({
    username: String,
    password: String
});

adminSchema.plugin(passportLocalMongoose);

const Admin = new mongoose.model("admin", adminSchema);

passport.use(Admin.createStrategy());

passport.serializeUser(Admin.serializeUser());
passport.deserializeUser(Admin.deserializeUser());

const homeSchema = {
    title: String,
    about: String,
    name: String
};

const Home = mongoose.model("home", homeSchema);

const blogSchema = {
    title: String,
    content: String,
    timestamp: String,
    date: String
};

const blog = mongoose.model("blog", blogSchema);

const learningSchema = {
    title: String,
    content: String,
    date: String
};

const Learning = mongoose.model("learning", blogSchema);

const contactSchema = {
    name: String,
    mail: String,
    number: {
        type: Number,
        required: true
    },
    message: String,
    time: String,
    date: String,
    hour: String,
    minute: String
};

const Contact = mongoose.model("contact", contactSchema);

const today = new Date()
const options = {
    weekday: "short",
    day: "numeric",
    month: "short"
};
const day = today.toLocaleDateString("en-US", options);

const time = new Date();
const ctime = {
    weekday: "short",
    day: "short",
    month: "short"
}; 
const currentTime = time.toDateString("en-US", ctime);

// ── SEO: inject siteUrl into every response ──
app.use(function(req, res, next){
    res.locals.siteUrl = req.protocol + "://" + req.get("host");
    next();
});

// ── robots.txt ──
app.get("/robots.txt", function(req, res){
    const siteUrl = req.protocol + "://" + req.get("host");
    res.type("text/plain");
    res.send([
        "User-agent: *",
        "Allow: /",
        "Disallow: /admin",
        "Disallow: /adminlogin",
        "Disallow: /adminregister",
        "Disallow: /loggedin",
        "Disallow: /compose",
        "Disallow: /postlearnings",
        "Disallow: /edithome",
        "Disallow: /getcontact",
        "Sitemap: " + siteUrl + "/sitemap.xml"
    ].join("\n"));
});

// ── sitemap.xml ──
app.get("/sitemap.xml", function(req, res){
    const siteUrl = req.protocol + "://" + req.get("host");
    blog.find({}, function(err, posts){
        const todayISO = new Date().toISOString().split("T")[0];
        const staticPages = [
            { url: "/", priority: "1.0" },
            { url: "/blog", priority: "0.9" },
            { url: "/learnings", priority: "0.8" },
            { url: "/about", priority: "0.7" },
            { url: "/contact", priority: "0.6" }
        ];
        let urls = staticPages.map(function(p){
            return "<url><loc>" + siteUrl + p.url + "</loc><lastmod>" + todayISO + "</lastmod><priority>" + p.priority + "</priority></url>";
        });
        if(!err && posts){
            posts.forEach(function(post){
                urls.push("<url><loc>" + siteUrl + "/" + encodeURIComponent(post.title) + "</loc><lastmod>" + todayISO + "</lastmod><priority>0.7</priority></url>");
            });
        }
        res.type("application/xml");
        res.send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls.join("") + "</urlset>");
    });
});

app.get("/", function(req, res){
    const siteUrl = req.protocol + "://" + req.get("host");
    Home.find({}, function(err, foundHome){
        res.render("index", {
            homepage: foundHome,
            pageTitle: "Jackson Mongbam — Developer & Programmer",
            pageDesc: "Personal blog and portfolio of Jackson Mongbam — a programmer and developer sharing thoughts, tutorials, and learnings.",
            pageUrl: siteUrl
        });
    });
})

app.get("/learnings", function(req, res){
    const siteUrl = req.protocol + "://" + req.get("host");
    Learning.find().sort('-date').find(function(err, foundLearning){
        res.render("learnings", {
            learn: foundLearning,
            pageTitle: "Learnings | Jackson Mongbam",
            pageDesc: "Notes, lessons, and things Jackson Mongbam has discovered in programming and development.",
            pageUrl: siteUrl + "/learnings"
        });
    });
})

app.get("/blog", function(req, res){
    const siteUrl = req.protocol + "://" + req.get("host");
    blog.find().sort('-date').find(function(err, foundBlog){
        res.render("blog", {
            postuser: foundBlog,
            pageTitle: "Blog | Jackson Mongbam",
            pageDesc: "Read Jackson Mongbam's blog — thoughts, tutorials, and stories on programming and development.",
            pageUrl: siteUrl + "/blog",
            ogType: "blog"
        });
    });
})

app.get("/about", function(req, res){
    const siteUrl = req.protocol + "://" + req.get("host");
    Home.find({}, function(err, foundHome){
        res.render("about", {
            homepage: foundHome,
            pageTitle: "About | Jackson Mongbam",
            pageDesc: "Learn about Jackson Mongbam — a programmer and developer with skills in Node.js, MongoDB, Express, and more.",
            pageUrl: siteUrl + "/about"
        });
    });
})

app.get("/contact", function(req, res){
    const siteUrl = req.protocol + "://" + req.get("host");
    res.render("contact", {
        pageTitle: "Contact | Jackson Mongbam",
        pageDesc: "Get in touch with Jackson Mongbam. Send a message for collaboration, questions, or just to say hello.",
        pageUrl: siteUrl + "/contact"
    });
})

app.get("/edithome", function(req, res){
    if(req.isAuthenticated()){
        res.render("edithome");
    }else{
        res.redirect("/adminlogin");
    }
})

app.get("/success", function(req, res){
    res.render("success");
})

app.get("/postlearnings", function(req, res){
    if(req.isAuthenticated()){
        res.render("postlearnings");
    }else{
        res.redirect("/adminlogin");
    }
})

app.get("/compose", function(req, res){
    if(req.isAuthenticated()){
        res.render("compose");
    }else{
        res.redirect("/adminlogin");
    }
})

app.get("/getcontact", function(req, res){
    if(req.isAuthenticated()){
        Contact.find().sort('-date').find(function(err, foundContact){
            res.render("getcontact", {contactDetails: foundContact});
        });
    }else{
        res.redirect("/adminlogin");
    }
})

app.get("/maintenance", function(req, res){
    res.render("maintenance");
})

app.get("/admin", function(req, res){
    res.render("admin");
})

app.get("/adminregister", function(req, res){
    res.render("adminregister");
})

app.get("/adminerror", function(req, res){
    res.render("adminerror");
})

app.get("/adminloginerror", function(req, res){
    res.render("adminloginerror");
})

app.get("/adminlogin", function(req, res){
    const loginError = req.session.loginError || false;
    req.session.loginError = null;
    res.render("adminlogin", { loginError: loginError });
})

app.get("/loggedin", function(req, res){
    if(req.isAuthenticated()){
        const flash = req.session.flash || null;
        req.session.flash = null;
        res.render("loggedin", { flash: flash });
    }else{
        res.redirect("/adminlogin");
    }
})

app.get("/updated", function(req, res){
    if(req.isAuthenticated()){
        res.render("updated");
    }else{
        res.redirect("/adminlogin");
    }
})

app.get("/:customPost", function(req, res){
    const siteUrl = req.protocol + "://" + req.get("host");
    const rawTitle = decodeURIComponent(req.params.customPost);
    const newPost = _.lowerCase(rawTitle);
    blog.find({}, function(err, foundPost){
        if(!err){
            foundPost.forEach(function(post){
                const storedPost = _.lowerCase(post.title);
                if(newPost === storedPost){
                    res.render("blogpost", {
                        postTitle: post.title,
                        postContent: post.content,
                        pageTitle: post.title + " | Jackson Mongbam",
                        pageDesc: post.content.substring(0, 155).replace(/\n/g, " "),
                        pageUrl: siteUrl + "/" + encodeURIComponent(post.title),
                        ogType: "article"
                    });
                }
            });
        }
    });
})

app.post("/edithome", function(req, res){
    const homeTitle = req.body.homeTitle;
    const aboutSite = req.body.aboutBody;
    const home = new Home({
        title: homeTitle,
        about: aboutSite,
        name: "jackson"
    });
    Home.find({}, function(err, foundHome){
        if(!err){
            if(foundHome.length === 0){
                home.save();
                res.redirect("/updated");
            }else{
                Home.updateOne({name: "jackson"}, {$set: {title: homeTitle, about: aboutSite}}, function(err, foundOne){
                    res.redirect("/updated");
                });
            }
        }
    });
})


app.post("/compose", function(req, res){
    const blogTitle =  req.body.postTitle;
    const blogContent = req.body.postBody;
    const post = new blog({
        title: blogTitle,
        content: blogContent,
        timestamp: day,
        date: new Date()
     });
     if(blogTitle === "about" || blogTitle === "learnings" || blogTitle === "home" || blogTitle === "contact"){
        res.redirect("/compose");
     }else{
        post.save();
        res.redirect('/updated');
     }
})

app.post("/postlearnings", function(req, res){
    const learnTitle = req.body.learningsTitle;
    const learnContent = req.body.learningsBody;
    const learnNew = new Learning({
        title: learnTitle,
        content: learnContent,
        date: new Date()
    });
    learnNew.save();
    res.redirect("/updated");
})

app.post("/contact", function(req, res){
    const getName = req.body.contactName;
    const getMail = req.body.contactMail;
    const getNumber = req.body.contactNumber;
    const getMessage = req.body.contactMessage;
    const contact = new Contact({
        name: getName,
        mail: getMail,
        number: getNumber,
        message: getMessage,
        time: currentTime,
        date: new Date(),
        hour: time.getHours(),
        minute: time.getMinutes()
    });
    contact.save();
    res.redirect("/success");
})

app.post("/adminregister", function(req, res){
    if(req.body.adminid === confirmpassword){
        Admin.register({username: req.body.username}, req.body.password, function(err, user){
            if(err){
                console.log(err);
                res.redirect("/adminerror");
            }else{
                passport.authenticate("local")(req, res, function(){
                    req.session.flash = "Registered and logged in successfully.";
                    res.redirect("/loggedin");
                });
            }
        });
    }else{
        res.redirect("/adminerror");
    }
})

app.post("/adminlogin", function(req, res){
    passport.authenticate("local", function(err, user, info){
        if(err || !user){
            req.session.loginError = true;
            return res.redirect("/adminlogin");
        }
        req.login(user, function(err){
            if(err){
                req.session.loginError = true;
                return res.redirect("/adminlogin");
            }
            req.session.flash = "Logged in successfully.";
            res.redirect("/loggedin");
        });
    })(req, res);
})

app.listen(process.env.PORT || 3000, function(){
    console.log("Listening to port 3000");
})
