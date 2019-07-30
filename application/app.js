var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var app = express();

app.use(express.static(__dirname + '/views'));
app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true })); // body-parser
app.use(cors());

var http = require('http').Server(app);
var io = require('socket.io')(http);

/**
 * IMPORT MODULES - MySQL query
 */
const createConnection = require(__dirname + "/mysql/createConnection.js");

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

app.post('/login', function (req, res) {
	let username = req.body.username;

	let db = createConnection();
	let sql = "SELECT * FROM user WHERE username = ?";
	db.query(sql, username, function (err, result, field) {
		if(err) {
			throw err;
		} else if(result.length > 0) {
			if(result[0].password == req.body.password) {
				//Login success: email exists, password matches
				console.log('Login successful');
				res.send('Login successful');
			} else {
				//Login failure: username exists, password does not match
				console.log('Incorrect password!');
				res.send('Incorrect password!');
			}
		} else {
			//Login failure: username does not exist, therefore no password
			console.log('Username does not exist!');
			res.send('Username does not exist!');
		}
	});

	db.end();
});

app.get('/register', function (req, res) {
	res.render('register');
});

app.post('/register', function (req, res) {
	const user = {
		"name": req.body.name,
		"username": req.body.username,
		"email": req.body.email,
		"password": req.body.password
	}

	let db = createConnection();
	let sql = "INSERT INTO user SET ?";
	db.query(sql, user, function (err, result, field) {
		if(err) {
			throw err;
		} 
		console.log(result);
	});

	db.end();
	res.send('Account successfully created!\n')
});

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