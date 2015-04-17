var socketio = require('socket.io');
var Tail = require('always-tail');
var fs = require('fs');

/**** SERVER STATUS ****/
var io = socketio.listen(8080);
function logEmit(type, data){
	return io.sockets.emit('new-data', {
		type: type,
		value: data
	});
}
var logs = [{
	file: __dirname + '/../logs/nodemon.log',
	name: 'nodemon_log'
}, {
	file: __dirname + '/../logs/nodemon.err.log',
	name: 'nodemon_error_log'
}]
logs.forEach(function(log){
	new Tail(log.file, '\n', {
		interval: 500
	}).on('line', function(data) {
		return logEmit(log.name, data);
	});
	
	io.sockets.on('connection', function(socket) {
		setTimeout(function(){
			fs.readFile(log.file, 'utf8', function (err, data) {
				if (err) {
					return console.log(err);
				}
				data = data.substring(data.lastIndexOf('\n', data.length-5000));
				logEmit(log.name, data);
			});
		}, 1000);
	});
});
