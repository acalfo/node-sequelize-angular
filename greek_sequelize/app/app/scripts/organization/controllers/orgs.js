'use strict';

/**
 * @ngdoc function
 * @name greekRush.common.controllers:HeaderCtrl
 * @description
 * # HeaderCtrl
 * Controller of the greekRush
 */

app.controller('OrgsCtrl', function ($scope, api, $routeParams) {


	// 	$scope.getChapter = function () {
	// 		api.call('org', {
	// 			data: {
	// 				chapters_id: $routeParams.chapterId
	// 			}
	// 		}).then(function(response){
	// 			$scope.chapter = response.data
	// 		});
	// 	}
	$scope.following = [];


	//List Organizations

	api.get('orgs',{
		Orgs_gender:'male'
	}).then(function(orgs){
		$scope.fraternities = orgs;
	});
	
	api.get('orgs',{
		Orgs_gender:'female'
	}).then(function(orgs){
		$scope.sororities = orgs;
	});


	$scope.getOrg = function (){
		console.log($routeParams.orgId);
		api.get('org', {
			Orgs_id: $routeParams.orgId
		}).then(function(org){
			$scope.org = org;
		});
	}

	$scope.getOrgChapters = function (){

		api.get('chapters', {
			Orgs_id: $routeParams.orgId
		}).then(function(chapters){
			$scope.chapters = chapters;
			for (var i in chapters) 
			{        
				$scope.isFollowing(chapters[i].Chapters_id);
			}  
		});
	}

	$scope.followChapter = function (chapter_id){
		api.post('follow_chapter', {
			Chapters_id: chapter_id
		}).then(function(){
			$scope.isFollowing(chapter_id);
		});
	}
	$scope.isFollowing = function(chapter_id)
	{
		api.get('chapter_followers', {
			Chapters_id: chapter_id
		}).then(function(chapter){
			$scope.following[chapter_id] = false;
			for (var i in chapter) 
			{        
				$scope.following[chapter[i].Chapters_id] = true;
			}        
		});       
	}

	$scope.unfollowChapter = function (chapter_id){
		console.log(chapter_id);
		api.post('delete_following', {
			Chapters_id: chapter_id
		}).then(function(){
			$scope.isFollowing(chapter_id);
		});
	}

})
.controller('OrgCtrl', function ($scope, api, $routeParams) {
	$scope.chapterAccordionOpen = true;
	$scope.following = [];


	//List Organizations
	$scope.getOrgs = function () {
		api.get('orgs').then(function(orgs){
			$scope.orgs = orgs;
		});
	}


	api.get('org', {
		Orgs_id: $routeParams.orgId
	}).then(function(org){
		console.log(org);
		$scope.org = org;
	});

	api.get('chapters', {
		Orgs_id: $routeParams.orgId
	}).then(function(chapters){
		$scope.chapters = chapters;
		for (var i in chapters) 
		{        
			$scope.isFollowing(chapters[i].Chapters_id);
		}  
	});


	$scope.followChapter = function (chapter_id){
		api.post('follow_chapter', {
			Chapters_id: chapter_id
		}).then(function(){
			$scope.isFollowing(chapter_id);
		});
	}
	$scope.isFollowing = function(chapter_id)
	{
		api.get('chapter_followers', {
			Chapters_id: chapter_id
		}).then(function(chapter){
			$scope.following[chapter_id] = false;
			for (var i in chapter) 
			{        
				$scope.following[chapter[i].Chapters_id] = true;
			}        
		});       
	}

	$scope.unfollowChapter = function (chapter_id){
		console.log(chapter_id);
		api.post('delete_following', {
			Chapters_id: chapter_id
		}).then(function(){
			$scope.isFollowing(chapter_id);
		});
	}


});
