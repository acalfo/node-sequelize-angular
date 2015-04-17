'use strict';

/**
 * @ngdoc function
 * @name greekRush.common.services:Firebase
 * @description
 * # Firebase
 * Service of the greekRush
 */
angular.module('greekRush.common.services.firebaseRefs',[])
.factory('FireRef', ['FB' , '$firebase' ,
					 function (FB , $firebase) {
						 return{
							 users : function() {
								 console.log(FB+'users');
								 return $firebase(new Firebase(FB+'users'));
							 }
						 }
					 }
					]);