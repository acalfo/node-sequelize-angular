var db = require('../server-files/db');
var q = require('q');
var Utils = require('../server-files/utils');
var moment = require('moment');
var eventModel = require('../models/event');
var userModel = require('../models/user');
var texts = require('../server-files/texts');

// texts.send('585-267-0879', 'Test Text').then(function(response){
// 	console.log(response);
// }).catch(function(error){
// 	console.log(error);
// })

// var deferreds = [];
// ['a', 'b', 'rick', 'c', 'd'].forEach(function(test){
// 	deferreds.push(db.insertIgnore('tests', {
// 		tests_1: test,
// 		tests_2: test + test
// 	}));
// });
// q.all(deferreds).then(function(results){
// 	console.log(results);
// }).catch(function(error){
// 	console.log(error);
// });

// var sql = 'insert ignore into tests(tests_1) values (' + Math.random() + ')';
// var sql2 = 'insert into tests(tests_1) values (' + Math.random() + ')';
// db.sequelize.query(sql, {__factory:{autoIncrementField: 'id'}}, {raw: true}, {}).then(function(result) {
// 	console.log(result.id);
// }, function(error){
// 	console.log('SQL ERROR: ' + error);
// });

// function getDeferred(num){
// 	var deferred = q.defer();
	
// 	setTimeout(function(){
// 		console.log(num);
// 		deferred.resolve();
// 	}, 1000);
	
// 	return deferred.promise;
// }
// getDeferred(1).then(function(){
// 	return getDeferred(2).then(function(){
// 		return getDeferred(3).then(function(){
// 			console.log('inside');
// 		});
// 	})
// }).then(function(){
// 	console.log('done');
// })

// db.update('tests', {
// 	tests_2: 'ricka '+Math.random()
// }, [3, 23]).then(function(test){
// 	console.log(test);
// }).catch(function(error){
// 	console.log('ERROR', error);
// })

// console.log(Utils.strtotime('13 years ago'));

// db.fetchOne('select * from Recruitments where Recruitments_id = 5').then(function(recruitment){
// 	console.log(recruitment);
// 	console.log(JSON.parse(recruitment.Recruitments_requirements));
// })

// console.log(Utils.strtotime('683708400000'));

// var s = 'rick';
// console.log(s.endsWith('ick'));

//wait for tables to cache
setTimeout(function(){
	var deferreds = [];
	
	deferreds.push(userModel.isInDefaultChapter().then(function(isInDefaultChapter){
		console.log('in then', isInDefaultChapter);
	}));
	
	q.all(deferreds).then(function(){
		console.log('in q then');
	}).catch(function(error){
		console.log(error);
	});
}, 1000);

// var rick = {
// 	me: [3]
// }
// console.log(Utils.isEmpty(rick, 'me'));