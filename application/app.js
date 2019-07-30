//resolving libraries
var express = require('express');

var bodyParser = require('body-parser')
var {testDB, queryDB, closeDB} = require(__dirname + "/database/dbPool.js");
var bcrypt = require('bcrypt')

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

//tests connection to database pool
testDB();

//Begin routes
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
	let sql = "SELECT * FROM user WHERE username = ?";

	queryDB(sql, username, function(results) {

		if(results.length > 0) {

			bcrypt.compare(req.body.password, results[0].password, function(err2, res2) {

			//current implementation will return false because 28 chars of the hash field is being chopped off
			//the hash length is 60 chracters long
			// console.log("The returned passcode is : %s", results[0].password);
    			res.send((res2)?'Login successful':'Incorrect password!');

			});

		} else {
			//Login failure: username does not exist, therefore no password
			res.send('Username does not exist!');
		}	

	});

});

app.get('/register', function (req, res) {

	res.render('register');

});

app.post('/register', function (req, res) {

	bcrypt.hash(req.body.password, 10, function(err, hash) {

			const user = {
				"name": req.body.name,
				"username": req.body.username,
				"email": req.body.email,
				"password": hash
			}

			// console.log("The generated passcode is : %s", hash);

			let sql = "INSERT INTO user SET ?";

			queryDB(sql, user, function (results) {
				res.send('Account successfully created!\n');	
			});

	});

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
