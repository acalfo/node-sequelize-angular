var express = require('express');
var router = express.Router();
var cors = require('cors');
var bodyParser = require('body-parser');
var session = require('express-session');
var SessionStore = require('express-mysql-session');
var db = require('./db');
var Api1 = require('./api-v1');
var Utils = require('./utils');
var emails = require('./emails');
var moment = require('moment-timezone');

/*
var log4js = require('log4js');
log4js.configure({
	appenders: [
		{
			type: 'console',
			pattern: 'yyyy-MM-dd '
		}
		/* instead of this, we're doing:
				forever start -a -o "logs/nodemon.log" -e "logs/nodemon.err.log" --exitcrash -c nodemon server-files/server.js
		{
			type: 'file',
			filename: __dirname + '/../logs/server.log',
			maxLogSize: 1024 * 1024 * 2
		}*
	],
	replaceConsole: true
});
*/
var log = console.log;
console.log = function(){
// 	var args = Object.keys(arguments).map(function(key){ return arguments[key];});		this does weird stuff
	var args = [];
	for(var key in arguments){
		args.push(arguments[key]);
	};
	log.apply(console, [moment().tz('America/Los_Angeles').format('MM/DD/YYYY HH:mm:ss.SSS')].concat(args));
};

GLOBAL.DEFAULT_FRATERNITY_ORG_ID = 1;
GLOBAL.DEFAULT_SORORITY_ORG_ID = 2;
GLOBAL.SECRET = 'ek3Svgb7843C3#@$ed##dfr5u8ihjf';
GLOBAL.URL = 'http://greekrush-128756.usw1-2.nitrousbox.com/';
GLOBAL.CHAPTERUSERROLES_id_m = 3;

//Error.stackTraceLimit = 20;		//Infinity;

var app = express();

/*
var allowCrossDomain = function(req, res, next) {
	// var ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || req.connection.remoteAddress);
	
    //res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Origin', 'http://192.168.1.103/');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Credentials', 'true');

    next();
}
app.use(allowCrossDomain);
*/

app.use(bodyParser.json());
app.use(cors({
	// origin: 'http://54.193.96.75:9123',
	//origin: 'http://greekrush-128756.usw1-2.nitrousbox.com',
	origin: function(origin, callback){
		callback(null, true);
	},
	credentials: true
}));
app.use(session({
	secret: '23rjklnq34tv5v54y#^He3vj6',
	resave: true,
	saveUninitialized: true,
	store: new SessionStore({
		host: db._settings.options.host,
		port: 3306,
		user: db._settings.user,
		password: db._settings.password,
		database: db._settings.database
	})
}));

//attempt to catch a bug
app.use(function(req, res, next){
	if(!Utils.isEmpty(req, 'session', 'user', 'Users_id')){
		var userIdBefore = req.session.user.Users_id;
		var userSessionBefore = JSON.stringify(req.session.user);
		
		req.on('end', function(){
			if(!Utils.isEmpty(req, 'session', 'user')){
				if(userIdBefore !== req.session.user.Users_id){
					console.log('BUG: Users_id was ' + userIdBefore + ' but is now ' + req.session.user.Users_id);
					emails.sendHtml({
						html: 'user session before: ' + userSessionBefore + '<br /><br />user session after: ' + JSON.stringify(req.session.user),
						to: 'rick@greekrush.com'
					});
				}
			}
		});
	}
	
	next();
});

/**** API ****/
Api1.init(router);
app.use('/api/v1', router);

/***** SERVER STATUS *****/
app.use('/server-status-bongos', express.static(__dirname + '/../status/public/'));

/**** ADMIN ****/
//lets set up the server on a different port so the cookies don't clash
//app.use('/admin-bongos', express.static(__dirname + '/../app-admin/app'));

/**** SERVER ****/
var port = process.env.PORT || 4000;

app.listen(port, function () {
	console.log('Listening on port ' + port);
});
