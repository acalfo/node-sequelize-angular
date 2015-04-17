var db = require('../server-files/db');
var q = require('q');
var Utils = require('../server-files/utils');

var methods = {
	//id can be an array of ids
	logRow: function(table, id){
		var ids = id instanceof Array ? id : [id];
		
		var deferred = q.defer();
		var errors = [];
		var validLogTables = ['ChapterUsers', 'ChapterRecruitmentUsers'];
		
		if(validLogTables.indexOf(table) === -1){
			errors.push('Log table must be one of these: ' + validLogTables.join(', '));
		}
		if(Utils.isEmpty(id)){
			errors.push('id sent to logRow is empty.');
		}
		
		if(errors.length){
			console.log(errors);
			deferred.reject(errors);
			return deferred.promise;
		}
		
		var log_table = 'log_' + table;
		
		db.sql([
			'insert into ' + log_table,
			'	select *',
			'	from ' + table,
			'	where ' + table + '_id in(' + db.escapeIn(ids) + ')'
		], {
			id: id
		}).then(function(log){
			deferred.resolve(log);
		}).catch(function(error){
			deferred.reject(error);
		})
		
		return deferred.promise;
	}
}

module.exports = methods;