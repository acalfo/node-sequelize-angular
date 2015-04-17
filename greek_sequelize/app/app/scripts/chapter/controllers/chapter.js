'use strict';

/**
 * @ngdoc function
 * @name greekRush.common.controllers:HeaderCtrl
 * @description
 * # HeaderCtrl
 * Controller of the greekRush
 */

app.controller('ChapterCtrl', function ($scope, $location, $rootScope, $q,$routeParams, Utils, api) {
	$scope.tiles = [];
	
	//Get Individual Chapter Page
	
	var updateFollowers = function(){
		api.get('chapter_followers', {
			Chapters_id: $scope.chapter.Chapters_id
		}).then(function(followers){
			$scope.followers = followers;
			$scope.tiles[1] = { text: 'Followers', href: '', titleBarInfo: followers.length, color: 'danger', classes: 'fa fa-thumbs-up' };
		})
	}
	
	var isFollowing = function(){
		if(Utils.isEmpty($scope.currentUser, 'Users_id')){
			return false;
		}
		
		$scope.following = [];
		api.get('user_following', {
			Users_id: $scope.currentUser.Users_id
		}).then(function(chapters){
			console.log($scope.following);
			for(var i in chapters){
				$scope.following[chapters[i].Chapters_id]=true;
			}
			//console.log($scope.following);
			updateFollowers();
		});       
	}

	api.call('chapter', {
		data: {
			Chapters_name: $routeParams.chapterName,
			Orgs_name: $routeParams.orgName
		}
	}).then(function(chapter){
		$scope.chapter = chapter;
		isFollowing();
		return chapter;

	}).then(function(chapter){
		api.get('events',{
			Orgs_id: chapter.Orgs_id,
			Events_type: 'org'
		}).then(function(events){
			$scope.events = events;
		}).then(function(){
			api.get('users',{
				Users_type: 'chapter',
				Chapters_id: chapter.Chapters_id,
				active: true
			}).then(function(actives){
				console.log(actives)
				$scope.actives = actives;
				return actives;
			}).then(function(actives){
				api.get('chapter_followers', {
					Chapters_id: chapter.Chapters_id
				}).then(function(followers){
					$scope.followers = followers;
					$scope.tiles = [
						{ text: 'Actives', href: '', titleBarInfo: '87', color: 'inverse', classes: 'fa fa-users' },
						{ text: 'Followers', href: '', titleBarInfo: followers.length, color: 'danger', classes: 'fa fa-thumbs-up' },
						{ text: 'Rushing', href: '', titleBarInfo: '37', color: 'primary', classes: 'fa fa-eye' },
						{ text: 'Events', href: '', titleBarInfo: '9', color: 'orange', classes: 'fa fa-university' }
					];
				})
			})
		});
	});


	$scope.follow = function (){
		api.post('follow_chapter', {
			Chapters_id: $scope.chapter.Chapters_id
		}).then(function(){
			isFollowing();
		});
	}


	$scope.unfollow = function (){

		api.post('unfollow_chapter', {
			Chapters_id: $scope.chapter.Chapters_id
		}).then(function(){
			isFollowing();
		});
	}


})
.controller('ChapterRequestsCtrl', function ($scope, api, $sce, User) {
	api.get('chapter_requests').then(function(chapterRequests){
		$scope.chapterRequests = chapterRequests;
	});





	$scope.approve = function(id){
		var ids = [];
		ids.push(id);

		api.post('update_chapter_requests',{
			chapterrequests_ids:ids,
			ChapterRequests_status:'approved'
		}).then(function(){
			api.get('chapter_requests').then(function(chapterRequests){
				$scope.chapterRequests = chapterRequests;

				//call User.getUserFromDB() so the pending request badge number gets updates
				User.getUserFromDB();
			});
		});


	}
	$scope.deny = function(id){
		var ids = [];
		ids.push(id);

		api.post('update_chapter_requests',{
			chapterrequests_ids:ids,
			ChapterRequests_status:'rejected'
		}).then(function(){
			api.get('chapter_requests').then(function(chapterRequests){
				$scope.chapterRequests = chapterRequests;
			});
		});
	}
})
.controller('ChapterAdminCtrl', function ($scope, api) {
	api.get('users',{
		Users_type: 'chapter',
		Chapters_id: $scope.currentUser.Chapters_id,
		active: true
	}).then(function(actives){
		console.log(actives)
		$scope.actives = actives;
		return actives;
	});




	api.get('recruitments', {
		active: true,
		Universities_id: $scope.currentUser.Universities_id,
		Councils_gender: $scope.currentUser.Users_gender,
		Chapters_id: $scope.currentUser.Chapters_id,
		attachChapterRecruitments: true
	}).then(function(recruitment){
		$scope.recruitment = recruitment[0];
		console.log(recruitment[0]);
		return recruitment[0];
	}).then(function(recruitment){
		api.get('get_recruitment_chairs',{
			ChapterRecruitments_id:recruitment.ChapterRecruitments_id
		}).then(function(chairs){
			$scope.chairs = chairs;
			var actives = $scope.actives;
			for(var i in actives){
				for(var x in chairs){
					if(actives[i].Users_id === chairs[x].Users_id){
						console.log('MATCH '+actives[i].Users_id+' '+chairs[x].Users_id)
						$scope.actives.splice(i,1);
					}
				}
			}
		});
	});

	$scope.assignChair= function(assign){
		console.log(assign);
		api.post('assign_recruitment_chairs',{
			ChapterRecruitments_id:$scope.recruitment.ChapterRecruitments_id,
			chapterusers_ids: assign
		}).then(function(resp){
			console.log(resp);
			api.get('get_recruitment_chairs',{
				ChapterRecruitments_id:$scope.recruitment.ChapterRecruitments_id
			}).then(function(chairs){
				$scope.chairs = chairs;
				var actives = $scope.actives;
				for(var i in actives){
					for(var x in chairs){
						if(actives[i].Users_id === chairs[x].Users_id){
							console.log('MATCH '+actives[i].Users_id+' '+chairs[x].Users_id)
							$scope.actives.splice(i,1);
						}
					}
				}
			});
		});
	}
	
	$scope.unassignChair= function(unassign){
		console.log(unassign);
		api.post('unassign_recruitment_chairs',{
			ChapterRecruitments_id:$scope.recruitment.ChapterRecruitments_id,
			chapterusers_ids: unassign
		}).then(function(resp){
			console.log(resp);
			api.get('get_recruitment_chairs',{
				ChapterRecruitments_id:$scope.recruitment.ChapterRecruitments_id
			}).then(function(chairs){
				$scope.chairs = chairs;
				var actives = $scope.actives;
				for(var i in actives){
					for(var x in chairs){
						if(actives[i].Users_id === chairs[x].Users_id){
							console.log('MATCH '+actives[i].Users_id+' '+chairs[x].Users_id)
							$scope.actives.splice(i,1);
						}
					}
				}
			});
		});
	}



})