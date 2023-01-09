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

app.get("/", function(req, res){
    Home.find({}, function(err, foundHome){
        res.render("index", {homepage: foundHome});
    });
})

app.get("/learnings", function(req, res){
    Learning.find().sort('-date').find(function(err, foundLearning){
        res.render("learnings", {learn: foundLearning});
    });
})

app.get("/blog", function(req, res){
    blog.find().sort('-date').find(function(err, foundBlog){
            res.render("blog", {postuser: foundBlog});
    });
})

app.get("/about", function(req, res){
    Home.find({}, function(err, foundHome){
        res.render("about", {homepage: foundHome});
    });
})

app.get("/contact", function(req, res){
    res.render("contact");
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
    res.render("adminlogin");
})

app.get("/loggedin", function(req, res){
    if(req.isAuthenticated()){
        res.render("loggedin");
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
    const newPost = _.lowerCase(req.params.customPost);
    blog.find({}, function(err, foundPost){
        if(!err){
            foundPost.forEach(function(post){
                const storedPost = _.lowerCase(post.title);
                if(newPost === storedPost){
                    res.render("blogpost", {postTitle: post.title, postContent: post.content});
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
                    res.redirect("/loggedin");
                });
            }
        });
    }else{
        res.redirect("/adminerror");
    }
})

app.post("/adminlogin", function(req, res){
    const admin = new Admin({
        username: req.body.username,
        password: req.body.password
    });
    req.login(admin, function(err){
        if(err){
            console.log(err);
            res.redirect("/adminloginerror");
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/loggedin");
            });;
        }
    });
})

app.listen(process.env.PORT || 3000, function(){
    console.log("Listening to port 3000");
})