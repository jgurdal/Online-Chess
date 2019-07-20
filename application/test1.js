var express = require('express');
var app = express();

app.get('/', function (req, res) {
	        res.send('Hello world!\n');
});

var port = 80;
app.listen(port);
console.log('Listening on port...', port);
