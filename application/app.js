var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var app = express();

const bcrypt = require('bcrypt');
const saltRounds = 10;
var session = require("express-session");
var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;
var MySQLStore = require("express-mysql-session")(session);

app.use(express.static(__dirname + '/views'));
app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true })); // body-parser
app.use(cors());

var http = require('http').Server(app);
var io = require('socket.io')(http);

let options = {
    // AWS RDS
    host: 'chessdb.cabihvrofnfu.us-west-1.rds.amazonaws.com',
    user: 'root',
    password: 'Team7isthebestteam',
    database: 'csc667teamchess'
};

var sessionStore = new MySQLStore(options);

app.use(session({
  secret: 'My super secretive secret',
  resave: false,
  store: sessionStore,
  saveUninitialized: false,
  //cookie: { secure: true }
}));

app.use(passport.initialize());
app.use(passport.session());

/**
 * IMPORT MODULES - MySQL query
 */
const createConnection = require(__dirname + "/mysql/createConnection.js");

// Used to dynamically render login--signup--logout 
// inside header.ejs. That way the login and signup 
// options will be visible, and logout will not be 
// visible when user is not signed in. Vice versa 
app.use(function(req, res, next) {
  res.locals.isAuthenticated = req.isAuthenticated();
  next();
});

passport.use(new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
  },
  function(username, password, done) {
    // console.log(username);
    // console.log(password);
    let db = createConnection();
    let sql = "SELECT * FROM user WHERE username = ?";
    db.query(sql, [username], function(err, result, field) {
      if (err) {
        throw err;
      } else if (result.length > 0) {
        bcrypt.compare(password, result[0].password, function(err, response) {
          // Login success: email exists, password matches
          if (response == true) {
            return done(null, {user_id: result[0].id});
          } 
          // Login failure: email exists, password does not match 
          else 
          {
            console.log("Incorrect password!");
            return done(null, false);
          }
        });
      } 
      // Login failure: email does not exist, therefor no password
      else {
        console.log("Username does not exist!");
        return done(null, false);
      }
    });
  }
));

app.get('/', function (req, res) { 
	res.render('index');
});

app.get('/about', function (req, res) { 
	res.render('about');
});

// Temp route to chess.ejs
app.get('/chess', function (req, res) { 
	res.render('chess/chess.ejs');
});

app.get('/login', function (req, res) {
	res.render('login');
});

// For login app.get authentication 
app.post("/login", passport.authenticate(
  'local',  {
    successRedirect: "/",
    failureRedirect: "/login"
}));

// To end session once user logs out
app.get("/logout", function(req, res) {
  req.logout();
  req.session.destroy();
  // req.flash("success", "Logout successful");
  res.redirect("/");
});


app.get('/register', function (req, res) {
	res.render('register');
});

app.post("/register", function(req, res) {

  bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
  // Store hash in your password DB.
    const user = {
      "name": req.body.name,
      "username": req.body.username,
      "email":req.body.email,
      "password":hash
    }

    let db = createConnection();
    // Store everything into DB
    let sql = "INSERT INTO user SET ?";
    db.query(sql, user, function(err, result, field) {
      if (err) {
        throw err;
      } else {
        let sql = "SELECT LAST_INSERT_ID() AS user_id";
        db.query(sql, user, function(err, result, field) {
          if (err) throw err;

          const user_id = result[0];

          req.login(user_id, function(err) {
            res.send('Account successfully created! Now you can go login!\n')
            //res.redirect("/");
          });
        });
      }
    });
  });
});

passport.serializeUser(function(user_id, done) {
  done(null, user_id);
});

passport.deserializeUser(function(user_id, done) {
  done(null, user_id);
});

function authenticationMiddleware () {  
  return (req, res, next) => {
    console.log(`req.session.passport.user: ${JSON.stringify(req.session.passport)}`);

    // let userID = req.session.passport.user.user_id;
    // console.log(userID);

      if (req.isAuthenticated()) return next();
      
      res.redirect('/login')
      // res.send("You are not authenticated");
  }
}

io.on('connection',function(socket){  
    console.log("A user is connected");
    socket.on('status added',function(status){
      add_status(status,function(res){
        if(res){
            io.emit('refresh feed',status);
        } else {
            io.emit('error');
        }
      });
    });
});


var add_status = function (status,callback) {


    let db = createConnection();

    db.query("INSERT INTO `fbstatus` (`s_text`) VALUES ('"+status+"')",function(err,rows){
            db.end();
            if(!err) {
              callback(true);
            }
        });
}

// var port = 3000;
// //var port = 80;
// app.listen(port);
// console.log('app Listening on port...', port);

http.listen(3000, function(){
	  console.log('http listening on port...', 3000);
});