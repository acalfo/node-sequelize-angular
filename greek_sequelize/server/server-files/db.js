var Sequelize = require('sequelize');
var q = require('q');
var Utils = require('./utils');
var extend = require('extend');
var moment = require('moment');
var SqlString = require('sequelize/lib/sql-string');

var settings = {
	user: 'greekrush',
	password: '%22DFq34G242@HWEASR4g545',
	database: 'greekrush_dev',
	options:{
		//host: '54.193.96.75',
		host: 'greekrush.cq4brada3s0f.us-west-1.rds.amazonaws.com',
		logging: function(log){
			if(typeof log === 'string' && log.toLowerCase().indexOf('describe') !== -1){
				//do not log
				return false;
			}
			
			var maxLogLength = 1000;
			
			if(log.length > maxLogLength){
				log = log.substring(0, maxLogLength)+' ...';
			}
			
			log = log.replace('Executing (default): ', '');
			//log = '----- Query -----\n' + log + '\n-----------------';
			log = '\n' + log;
			
			console.log(log);
		}
	}
};

var sequelize = new Sequelize(settings.database, settings.user, settings.password, settings.options);

sequelize
	.authenticate()
	.complete(function (err) {
		if (!!err) {
			console.log('Unable to connect to the database:', err)
		} else {
			console.log('Connection has been established successfully.')
		}
	});

//gets set when all tables are cached (when all describes have finished)
var allTablesCached = false;

var methods = {
	_settings: settings,
	
	sequelize: sequelize,
	
	tableFields: {},
	
	_init: function(){
		//pre-cache all table fields
		this.fetchAll('show tables').then(function(tables){
			var describePromises = [];
			
			tables.forEach(function(table){
				describePromises.push(methods.getFields(table));
			});
			
			q.all(describePromises).then(function(){
				console.log('All table schemas cached.');
				allTablesCached = true;
			});
		});
	},
	
	//returns an array of a single field from an array of db results
	getFieldValues: function(results, field){
		if(Utils.isEmpty(results)){
			return [];
		}
		
		var values = [];
		results.forEach(function(result){
			if(typeof result[field] !== 'undefined'){
				values.push(result[field]);
			}
		});
		
		return values;
	},
	
	//NOTE: this function and postFormatData could be made more efficient (by prefetching list of date fields)
	//pre formats the data that's going to be used in a query
	formatData: function(data){
		for(var table in this.tableFields){
			for(var field in this.tableFields[table]){
				//if the field is set
				if(!Utils.isEmpty(data, field)){
					//if it's a DATETIME/DATE field
					if(['DATETIME', 'DATE'].indexOf(this.tableFields[table][field].type.toUpperCase()) != -1){
						//if the data is set as an int (in milliseconds)
						if(typeof data[field] === 'number'){
							data[field] = moment(data[field]).format('YYYY-MM-DD HH:mm:ss');
						}
						else if(typeof data[field] === 'string'){
							data[field] = moment(Utils.strtotime(data[field]) * 1000).format('YYYY-MM-DD HH:mm:ss');
						}
					}
					
					//if the data not a number or a string, then stringify it
					if(typeof data[field] !== 'number' && typeof data[field] !== 'string'){
						data[field] = JSON.stringify(data[field]);
					}
				}
			};
		}
		
		return data;
	},
	
	//post formats the data that's returned from a query
	postFormatData: function(data){
		for(var table in this.tableFields){
			for(var field in this.tableFields[table]){
				//if the field is set
				if(!Utils.isEmpty(data, field)){
					//if it's a DATETIME field
					if(this.tableFields[table][field].type.toUpperCase() === 'DATETIME'){
						data[field] = moment(data[field]).utc().format('MM/DD/YYYY h:mm a');
						//data[field] = moment(Utils.strtotime(data[field]) * 1000).format('MM/DD/YYYY');
					}
					
					//if it's a DATE field
					if(this.tableFields[table][field].type.toUpperCase() === 'DATE'){
						data[field] = moment(data[field]).utc().format('MM/DD/YYYY');
					}
				}
			};
		}
		
		return data;
	},
	
	//convenience/sugar method for raw queries so we don't have to keep using "null, {raw: true}"
	sql: function(sql, data){
		sql = typeof sql === 'object' ? sql.join("\n") : sql;
		
		var deferred = q.defer();
		
		data = Utils.isEmpty(data) ? {} : this.formatData(data);
		
		if(sql.toLowerCase().indexOf('insert') === 0){
			//have to do this instead of "select LAST_INSERT_ID()"
			sequelize.query(sql, {__factory:{autoIncrementField: 'id'}}, {raw: true}, data).then(function(result) {
				deferred.resolve(result.id);
			}, function(error){
				console.log('SQL ERROR: ' + error);
				deferred.reject(error);
			});
		}else{
			sequelize.query(sql, null, {raw: true}, data).then(function(results){
				if(typeof results === 'object' && results != null && results.length && typeof results[0] === 'object'){
					results.forEach(function(result){
						result = methods.postFormatData(result);
					});
				}
				
				deferred.resolve(results);
			}, function(error){
				console.log('SQL ERROR: ' + error);
				deferred.reject(error);
			});
		}
		
		return deferred.promise;
	},

	//alias for sql
	fetchAll: function(sql, params){
		return this.sql(sql, params);
	},

	fetchOne: function(sql, params){
		return this.sql(sql, params).then(function(results){
			if(results.length > 1){
				console.log('WARNING: using fetchOne but '+results.length+' results were found');
			}
			
			return results.length ? results[0] : null;
		});
	},

	fetchSinglet: function(sql, params){
		return this.fetchOne(sql, params).then(function(result){
			//just return the first key
			for(var key in result){
				return result[key];
			}
		});
	},

	fetchSinglets: function(sql, params){
		return this.fetchAll(sql, params).then(function(results){
			var values = [];
			
			//just return the first keys
			results.forEach(function(result){
				values.push(result[Object.keys(result)[0]]);
			});
			
			return values;
		});
	},
	
	getFields: function(table){
		var deferred = q.defer()
			self = this;
		
		table = this.escapeTable(table, false);
		
		//if we've already gotten the list of table fields
		if(typeof this.tableFields[table] === 'array'){
			deferred.resolve(this.tableFields[table]);
		}else{
			this.fetchAll('describe '+this.escapeTable(table)).then(function(fields){
				//do not include these fields.
				if(!Utils.isEmpty(fields, table + '_created')){
					delete fields[table + '_created'];
				}
				if(!Utils.isEmpty(fields, table + '_updated')){
					delete fields[table + '_updated'];
				}
				
				self.tableFields[table] = fields;
				deferred.resolve(self.tableFields[table]);
			});
		}
		
		return deferred.promise;
	},
	
	filterFields: function(orgData, fields, showError){
		showError = typeof showError === 'undefined' ? true : showError;
		
		var data = JSON.parse(JSON.stringify(orgData));
		
		var fieldNames = [];
		for(var fieldName in fields){
			fieldNames.push(fieldName);
		};
		
		for(var dataField in data){
			if(fieldNames.indexOf(dataField) === -1){
				if(showError){
					console.warn('Table field does not exist: '+dataField);
				}
				delete data[dataField];
			}
		}
		
		return data;
	},
	
	escapeKeys: function(obj){
		var escapedKeysObj = {};
		for(var key in obj){
			escapedKeysObj[this.escapeColumn(key, false)] = obj[key];
		}
		
		return escapedKeysObj;
	},
	
	insert:  function(table, orgData, includeIgnore){
		return this._insert(table, orgData, false);
	},
	
	insertIgnore:  function(table, orgData, includeIgnore){
		return this._insert(table, orgData, true);
	},
	
	//rarely if ever meant to be called outside of db.js
	_insert: function(table, orgData, includeIgnore){
		var deferred = q.defer();
		
		//make copy of data so we don't alter the original
		var data = JSON.parse(JSON.stringify(orgData));
		
		data = this.escapeKeys(data);
		
		//add created and updated fields
		//data[this.escapeTable(table, false) + '_created'] = this.now();
		//data[this.escapeTable(table, false) + '_updated'] = this.now();
		
		//filter fields
		this.getFields(table).then(function(tableFields){
			data = methods.filterFields(data, tableFields);
			
			if(!Object.keys(data).length){
				var error = 'No fields to insert';
				console.log(error);
				deferred.reject(error);
			}else{
				var fields = Object.keys(data).map(function(key){ return methods.escapeColumn(key, false) });		//the keys should already be filtered from escapeKeys(), but this is just to make sure.
				//var values = fields.map(function(x, i){ return x });
				
				var sql = [];
				sql.push('insert ' + (includeIgnore ? 'ignore ' : '') + 'into ' + methods.escapeTable(table));
				sql.push('(' + fields.join(', ') + ')');
				sql.push('values');
				sql.push('(:' + fields.join(', :') + ')');
				
				methods.sql(sql, data).then(function(id){
					//id will be undefined if insert ignore is used and a row was not inserted, or there is no auto increment id on the table
					if(typeof id !== 'undefined'){
						data[methods.escapeTable(table, false) + '_id'] = id;
					}
					
					deferred.resolve(data);
				});
			}
		});
		
		return deferred.promise;
	},
	
	insertMultiple: function(table, inserts){
		return this._insertMultiple(table, inserts, false);
	},
	
	insertIgnoreMultiple: function(table, inserts){
		return this._insertMultiple(table, inserts, true);
	},
	
	_insertMultiple: function(table, inserts, useIgnore){
		var deferred = q.defer();
		var insertDeferreds = [];
		
		inserts.forEach(function(insert){
			if(useIgnore === true){
				insertDeferreds.push(methods.insertIgnore(table, insert));
			}else{
				insertDeferreds.push(methods.insert(table, insert));
			}
		})
		
		q.all(insertDeferreds).then(function(results){
			deferred.resolve(results);
		}).catch(function(errors){
			deferred.reject(errors);
		});
		
		return deferred.promise;
	},
	
	//id can be an array
	update: function(table, orgData, id){
		var deferred = q.defer();
		
		if(Utils.isEmpty(id)){
			deferred.reject('db.js update: no id given');
			return deferred.promise;
		}
		
		//make copy of data so we don't alter the original
		var data = JSON.parse(JSON.stringify(orgData));
		
		data = this.escapeKeys(data);
		
		//add updated field
		//data[this.escapeTable(table, false) + '_updated'] = this.now();
		
		//TODO: make this dynamically get the table id column by: if(column['key'] == 'PRI' && column['type'].indexOf('int') !== -1)
		var id_column = this.escapeColumn(this.escapeTable(table, false) + '_id');
		
		//filter fields
		this.getFields(table).then(function(tableFields){
			data = methods.filterFields(data, tableFields);
			
			if(!Object.keys(data).length){
				var error = 'No fields to update';
				console.log(error);
				deferred.reject(error);
			}else{
				var fields = Object.keys(data).map(function(key){ return methods.escapeColumn(key, false) });		//the keys should already be filtered from escapeKeys(), but this is just to make sure.
				
				var sql = [];
				sql.push('update '+methods.escapeTable(table));
				sql.push('set');
				
				var updates = [];
				fields.forEach(function(field){
					updates.push(field + ' = :' + field);
				});
				
				sql.push(updates.join(",\n"));
								
				sql.push('where ' + id_column + ' in(' + methods.escapeIn(id) + ')');
				
				methods.sql(sql, data).then(function(){
					//if only updating one row, return the row along with it's id
					if(!(id instanceof Array)){
						data[methods.escapeTable(table, false) + '_id'] = id;
						deferred.resolve(data);
					}
					else if(id.length == 1){
						data[methods.escapeTable(table, false) + '_id'] = id[0];
						deferred.resolve(data);
					}else{
						deferred.resolve();
					}
				});
			}
		});
			
		return deferred.promise;
	},
	
	delete: function(table, id){
		var deferred = q.defer();
		
		//TODO: make this dynamically get the table id column by: if(column['key'] == 'PRI' && column['type'].indexOf('int') !== -1)
		var id_column = this.escapeColumn(this.escapeTable(table, false) + '_id');
		
		var sql = 'delete from '+this.escapeTable(table)+' where '+id_column+' = :id';
		
		this.sql(sql, {id: id}).then(function(){
			deferred.resolve();
		});
	},
	
	//simple but effective methode of escaping column names. Just remove all non alpha numeric and underscore characters.
	escapeColumn: function(columnName, addBackTicks){
		addBackTicks = typeof addBackTicks === 'undefined' ? true : addBackTicks;
		
		var escapedColumnName = columnName.replace(/\W/g, '');
		
		return addBackTicks ? '`'+escapedColumnName+'`' : escapedColumnName;
	},
	
	//same thing as escapeColumn
	escapeTable: function(tableName, addBackTicks){
		return this.escapeColumn(tableName, addBackTicks);
	},
	
	escapeIn: function(values){
		if(Utils.isEmpty(values)){
			return SqlString.escape('in() can not be blank so use this to match nothing @#$tv@@VT%v54h');
		}
		else if(!(values instanceof Array)){
			return SqlString.escape(values);
		}else{
			return values.map(SqlString.escape);
		}
	},
	
	buildWheresParams: function(tables, data, wheres, params){
		/* let's not do it this way since we really should already have all the table fields cached since it happens in init now
		var tableFieldPromises = [];
		tables.forEach(function(table){
			tableFieldPromises.push(this.getfields(table));
		});
		*/
		
		if(!allTablesCached){
			console.warn('WARNING: tables have not been cached.');
		}
		
		var filteredData = {};
		
		tables.forEach(function(table){
			filteredData = extend(true, filteredData, methods.filterFields(data, methods.tableFields[methods.escapeTable(table, false)], false));
		});
		
		for(var field in filteredData){
			//if the data is an object, assume it's an array and use IN()
			if(typeof filteredData[field] == 'object'){
				wheres.push(this.escapeColumn(field) + ' in(' + this.escapeIn(filteredData[field]) + ')');
			}else{
				wheres.push(this.escapeColumn(field) + ' = :' + this.escapeColumn(field, false));
				params[field] = filteredData[field];
			}
		}
	},
	
	wheres: function(wheres){
		return (wheres.length ? " where \n\t" + wheres.join(" \n\tand ") : '') + ' ';
	},
	
	now: function(){
		return new Date().toISOString().slice(0, 19).replace('T', ' ');
	},
	
	//keep keys in obj
	filterObject: function(_obj, keys){
		var obj = JSON.parse(JSON.stringify(_obj));		//make a copy so we aren't altering the passed in one
		
		if(Utils.isEmpty(obj)){
			return {};
		}
		
		Object.keys(obj).filter(function (v) {
			return keys.indexOf(v) === -1;
		}).forEach(function (v) {
			delete obj[v];
		});
		
		return obj;
	}
}

methods._init();

module.exports = methods;