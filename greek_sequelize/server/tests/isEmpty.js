var Utils = require('../server-files/utils');

var a = '';
var b = false;
var c = [];
var d = {};
var e = 0;

var a2 = 'good';
var b2 = true;
var c2 = [1];
var d2 = {foo:'bar'};
var e2 = 1;
var f2 = new Date();

var z = {
	a: '',
	b: false,
	c: [],
	d: {},
	e: 0,
	
	a2: 'good',
	b2: true,
	c2: [1],
	d2: {foo:'bar'},
	e2: 1,
	f2: new Date()
}

if(Utils.isEmpty(a) !== true){
	console.log('ERROR: a');
}
if(Utils.isEmpty(b) !== true){
	console.log('ERROR: b');
}
if(Utils.isEmpty(c) !== true){
	console.log('ERROR: c');
}
if(Utils.isEmpty(d) !== true){
	console.log('ERROR: d');
}
if(Utils.isEmpty(e) !== true){
	console.log('ERROR: e');
}

if(Utils.isEmpty(a2) !== false){
	console.log('ERROR: a2');
}
if(Utils.isEmpty(b2) !== false){
	console.log('ERROR: b2');
}
if(Utils.isEmpty(c2) !== false){
	console.log('ERROR: c2');
}
if(Utils.isEmpty(d2) !== false){
	console.log('ERROR: d2');
}
if(Utils.isEmpty(e2) !== false){
	console.log('ERROR: e2');
}
if(Utils.isEmpty(f2) !== false){
	console.log('ERROR: f2');
}

if(Utils.isEmpty(z, 'a') !== true){
	console.log('ERROR: z.a');
}
if(Utils.isEmpty(z, 'b') !== true){
	console.log('ERROR: z.b');
}
if(Utils.isEmpty(z, 'c') !== true){
	console.log('ERROR: z.c');
}
if(Utils.isEmpty(z, 'd') !== true){
	console.log('ERROR: z.d');
}
if(Utils.isEmpty(z, 'e') !== true){
	console.log('ERROR: z.e');
}

if(Utils.isEmpty(z, 'a2') !== false){
	console.log('ERROR: z.a2');
}
if(Utils.isEmpty(z, 'b2') !== false){
	console.log('ERROR: z.b2');
}
if(Utils.isEmpty(z, 'c2') !== false){
	console.log('ERROR: z.c2');
}
if(Utils.isEmpty(z, 'd2') !== false){
	console.log('ERROR: z.d2');
}
if(Utils.isEmpty(z, 'e2') !== false){
	console.log('ERROR: z.e2');
}
if(Utils.isEmpty(z, 'f2') !== false){
	console.log('ERROR: z.f2');
}