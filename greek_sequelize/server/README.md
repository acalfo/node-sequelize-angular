
**University User

post 	'/university_user/set_user_type' 
- set a user as a certain type (only Users_type = council is handled right now)

get		'/university_user/recruitments' 
- gets all of the university's recruitments sorted most recent to oldest

post 	'/university_user/update_recruitment_users_statuses' 
- updates the status of RecruitmentUsers (enum('pending', 'approved', 'rejected'))

get 	'/recruitment' 
- get a single recruitment

get 	'/recruitment_users' 
- get all of the users in a recruitment (can optionally pass in RecruitmentUsers_status)

get		'/university_active_recruitments'    
- get active recruitments for a university

**Council User

post 	'/university_user/update_recruitment_users_statuses' 
- updates the status of RecruitmentUsers (enum('pending', 'approved', 'rejected'))

get 	'/recruitment' 
- get a single recruitment

get 	'/recruitment_users' 
- get all of the users in a recruitment (can optionally pass in RecruitmentUsers_status)

get 	'/council_user/recruitments' 
- get all of the recruitments that belong to the logged in council user

post 	'/recruitment' 
- create a recruitment

**Chapter User(president)

get '/chapter_requests' 
- get all of the user's (must be president) chapter requests

post '/update_chapter_requests' 
- updates the status of UserChapterRequests (enum('pending', 'approved', 'rejected'))

**Chapter User(affiliated and non)

post	'/follow_chapter'
- follow chapter

get		'/university_active_recruitments'    
- get active recruitments for a university

**Chapter User(non affiliated)

post	'/join_recruitment'
- sign up for recruitment

