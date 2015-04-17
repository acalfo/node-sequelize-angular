var moment = require('moment');
var Utils = require('../server-files/utils');

// var mili = 961484400000;

// //console.log(moment(mili));
// console.log(Utils.strtotime('12/16/1985 4:15am'));

var d1 = '09/01/2012 12:00 am';

var formatted = moment(d1).utc().format('MM/DD/YYYY');

var time = Utils.strtotime(d1);
console.log(time);

var formatted2 = moment(Utils.strtotime(d1) * 1000).format('MM/DD/YYYY')

console.log(formatted);
console.log(formatted2);