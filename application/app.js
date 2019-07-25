//resolving libraries
var express = require('express');
var bodyParser = require('body-parser')
var {testDB, queryDB, closeDB} = require(__dirname + "/database/dbPool.js");
var bcrypt = require('bcrypt')

var app = express();
app.set('view engine', 'ejs');
// body-parser
app.use(bodyParser.urlencoded({ extended: true })); 

//tests connection to database pool
testDB();

//Begin routes
app.get('/', function (req, res) { 

	res.render('index');

});

app.get('/about', function (req, res) { 

	res.render('about');

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

//var port = 80;
var port = 3000;
app.listen(port);
console.log('Listening on port...', port);
