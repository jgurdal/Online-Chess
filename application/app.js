//resolving libraries
var express = require('express');

var bodyParser = require('body-parser');
var {testDB, queryDB, closeDB} = require(__dirname + "/database/dbPool.js");

var bcrypt = require('bcrypt');
const saltRounds = 10;

var cors = require('cors');
var flash = require('connect-flash');
var app = express();

var session = require("express-session");
var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;
var MySQLStore = require("express-mysql-session")(session);

app.use(flash());
app.use(express.static(__dirname + '/views'));
app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true })); // body-parser
app.use(cors());
var jsonParser = bodyParser.json();

var http = require('http').Server(app);
var io = require('socket.io')(http);


//tests connection to database pool
testDB();

//Begin routes
let options = {
    // AWS RDS
    host: 'chessdb.cabihvrofnfu.us-west-1.rds.amazonaws.com',
    user: 'root',
    password: 'Team7isthebestteam',
    database: 'csc667teamchess'
    // multipleStatements: true
};

var sessionStore = new MySQLStore(options);

app.use(session({
  secret: 'My super secretive secret',
  resave: false,
  store: sessionStore,
  saveUninitialized: false
  // cookie: { expires: 600000 }
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
    //passReqToCallback: true
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
            renderFlash = 1;
            return done(null, false, { message: 'That password is incorrect' });
          }
        });
      }
      // Login failure: email does not exist, therefor no password
      else {
        console.log("Username does not exist!");
        renderFlash = 1;
        return done(null, false, { message: 'That username does not exist' });
      }
    });
  }
));

var fen;
var renderFlash = 0;
var createFlash = 0;
var numOfMatches = 0;
var matchName = [];
var opponent = [];
var userOfCreateGame = [];

app.get('/', function (req, res) {
  // var username;
  // if (req.isAuthenticated()) {
  //   var username = returnUsername(req.session.passport.user.user_id);
  //   console.log(username);
  // }
  // console.log(username);
  // username = req.user;
  // console.log(username);

  if (req.isAuthenticated()) {
    personalGamesTable(req, res);
  } else {
    numOfMatches = 0;
    matchName = [];
    opponent = [];
    matchID = [];
    res.render('index', {
      numOfMatches: numOfMatches,
      matchName: matchName,
      matchID: matchID,
      opponent: opponent,
      message: req.flash('error'),
      createMessage: req.flash('createJoinGame'),
      createFlash: createFlash,
      flash: renderFlash
    });
    renderFlash = 0;
    createFlash = 0;
  }

});

function personalGamesTable (req, res) {
  let db = createConnection();
  let sql = "SELECT * FROM Chess WHERE user_id1 = ? OR user_id2 = ?";
  db.query(sql, [req.user.user_id, req.user.user_id], function(err, result, field) {
    if (err) {
      throw (err);
    } else {
      matchName = [];
      opponent = [];
      matchID = [];
      numOfMatches = result.length;
      for (var i = 0; i < result.length; i++) {
        matchName.push(result[i].game_name);
        matchID.push(result[i].game_id);
        if (result[i].user_id2 == null) {
          opponent.push('None');
        } else if (result[i].user_id1 == req.user.user_id) {
          opponent.push(result[i].user_id2);
        } else if (result[i].user_id2 == req.user.user_id) {
          opponent.push(result[i].user_id1);
        }
      }
      // console.log(result);
      res.render('index', {
        numOfMatches: numOfMatches,
        matchName: matchName,
        matchID: matchID,
        opponent: opponent,
        message: req.flash('error'),
        createMessage: req.flash('createJoinGame'),
        createFlash: createFlash,
        flash: renderFlash
      });
      renderFlash = 0;
      createFlash = 0;
    }
  });
}

app.get('/about', function (req, res) {
	res.render('about');
});

// Temp route to chess.ejs
app.get('/chess', function (req, res) {
  var game_id = req.query.id;
  let db = createConnection();
  let sql = "SELECT C.game_fen FROM Chess C WHERE game_id = ?";
  db.query(sql,[game_id],function(err, result, field) {
    if (err) throw err;
    fen = result[0].game_fen;
    console.log(fen);
  });
  console.log(req.query);
	res.render('chess/chess.ejs', {
    fen: fen
  });
});

app.post('/createGame', authenticationMiddleware(), function (req, res) {
  let gameName = req.body.game_name;
  let user_id1 = req.user.user_id;
  var game_id;

  let db = createConnection();
  let sql = "INSERT INTO Chess (game_name, user_id1) VALUES (?, ?)"
  db.query(sql, [gameName, user_id1], function(err, result, field) {
    if(err) {
      throw(err);
    } else {
      let sql = "SELECT LAST_INSERT_ID() AS game_id";
      db.query(sql, function(err, result, field) {
        game_id = result[0].game_id;
        res.redirect('/chess/?id=' + game_id);
      });
    }
  });
});

app.post('/chess', jsonParser, function (req, res) {
  var game_id = req.query.id;
  console.log(req.query.id);
  console.log(req.body.game_fen);
  let db = createConnection();
  let sql = "UPDATE Chess C SET C.game_fen  = ? WHERE game_id = ?";
  db.query(sql,[req.body.game_fen, game_id],function(err, result, field) {
    if (err) throw err;
    if (result.affectedRows != 0) res.send("success");
  });

});

app.post('/joinGame',jsonParser, function(req, res){
  if (req.user) {
  let db = createConnection();
  let sql = "UPDATE Chess SET user_id2 = ? WHERE game_id = ? AND user_id1 <> ?";
  db.query(sql,[req.user.user_id, req.body.game_id, req.user.user_id],function(err, result, field) {
    if (err) throw err;
    if (result.affectedRows != 0) res.redirect('/chess/?id=' + req.body.game_id);
  });
}
});

app.post('/rejoinGame',jsonParser, function(req, res){
  if (req.user) {
  let db = createConnection();
  let sql = "Select * FROM Chess C WHERE C.game_id = ?";
  db.query(sql,[req.body.game_id],function(err, result, field) {
    if (err) throw err;
    if (result.affectedRows != 0) res.redirect('/chess/?id=' + req.body.game_id);
  });
}
});

app.get("/opengames", function(req, res){
  let db = createConnection();
      db.query("SELECT * FROM Chess",function(err,rows){
          if (err) throw err;
          res.send(rows);
      });
});

app.get('/login', function (req, res) {
	res.render('login');
});

// For login app.get authentication
app.post("/login", passport.authenticate(
  'local',  {
    successRedirect: "/",
    failureRedirect: "/",
    failureFlash: true
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
          //const user_name = result[1];
          // console.log(user_name);

          req.login(user_id, function(err) {
            res.send('Account successfully created! Now you can go login!\n')
            //res.redirect("/");
          });
        });
      }
    });
  });
});

app.get("/leave", function (req, res) {
  fen = req.query.fen;
  console.log(fen);
  res.redirect("/");
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

      createFlash = 1;
      req.flash('createJoinGame', 'You must have an account and be logged in in order to play');
      res.redirect('/');
      // res.send("You are not authenticated");
  };
}

function returnUsername(user_id) {
  let db = createConnection();
  let sql = "SELECT username FROM user WHERE id = ?";
  db.query(sql, user_id, function (err, result, field) {
    if (err) {
      throw err;
    } else {
      var user = result[0].username;
      console.log(user);
      return user;
      db.end();
    // console.log(result[0].username);
    }
  });
}

io.on('connection',function(socket){
  console.log("A new user is connected");
  socket.on('status added',function(status){
    add_status(status,function(res){
      if(res){
          io.emit('refresh feed',status);
      } else {
          io.emit('error');
      }
    });
  });

  socket.on('move', function(msg) {
    socket.broadcast.emit('move', msg);
  });

  socket.on('join', (params, callback) => {
    if (!isRealString(params.id)) {
      callback('Unique game ID are required.');
    }

    socket.join(params.id);
    // socket.leave('The Office Fans');

    // io.emit -> io.to('The Office Fans').emit
    // socket.broadcast.emit -> socket.broadcast.to('The Office Fans').emit
    socket.emit('newMessage', 'Welcome!');
    socket.broadcast.to(params.id).emit('newMessage', 'A new user has joined!');

    callback();
  });

  socket.on('createMessage', function() {
    // console.log(arguments[0].id);
    io.to(arguments[0].id).emit('newMessage', arguments[1]);
  });
});

var isRealString = (str) => {
  return typeof str === 'string' && str.trim().length > 0;
}


// const expect = require('expect');
// describe('isRealString', () => {
//   it('should reject non-string values', () => {
//     var res = isRealString(98);
//     expect(res).toBe(false);
//   });

//   it('should reject string with only spaces', () => {
//     var res = isRealString('    ');
//     expect(res).toBe(false);
//   });

//   it('should allow string with non-space characters', () => {
//     var res = isRealString('  Andrew  ');
//     expect(res).toBe(true);
//   });
// });

var add_status = function (status,callback) {


    let db = createConnection();

    db.query("INSERT INTO `fbstatus` (`s_text`) VALUES ('"+status+"')",function(err,rows){
            db.end();
            if(!err) {
              callback(true);
            }
        });
}


// For working locally, uncomment two lines below
// and comment the two lines below that
var port = 3000;
// app.listen(port);
// var port = 80;
http.listen(port);

console.log('app Listening on port...', port);

// http.listen(3000, function(){
// 	  console.log('http listening on port...', 3000);
// });
