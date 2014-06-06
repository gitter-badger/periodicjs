'use strict';

var path = require('path'),
	appController = require('./application'),
	applicationController,
	appSettings,
	mongoose,
	Post,
	logger;

var show = function(req,res,next){
	applicationController.getViewTemplate({
		res:res,
		req:req,
		id:req.controllerData.post.name,
		templatetype:'post-single',
		themepath:appSettings.themepath,
		themefileext:appSettings.templatefileextension,
		callback:function(templatepath){
			applicationController.handleDocumentQueryRender({
				res:res,
				req:req,
				renderView:templatepath,
				responseData:{
					pagedata: {
						title:"single post"
					},
					post:req.controllerData.post,
					user:req.user
				}
			});
	}});
};

var create = function(req,res,next){
	/*
		// applicationController.loadModel({});
		// var newPost = new Post({title:"test title",name:"test-title"});

		// newPost.save(function(err){
		// 	console.log("trying to create new post");
		// 	if(err){
		// 		logger.error(err);
		// 		res.send(err);
		// 		console.log(err);
		// 	}
		// 	else{
		// 		logger.debug("post id: ",req.params.id);
		// 		logger.debug("showing new post");
		// 		res.render('home/index',{randomdata:'show post'});
		// 	}
		// });
		// 
	*/
};

var index = function(req,res,next){
	console.log('index list');
	Post.find({ title: /title/ }).exec(function(err,posts){
		console.log("model search");
		if(err){
			res.send(err);
		}
		else{
			res.send(posts);
		}
	});
};

var loadPost = function(req,res,next){
	var params = req.params,
		docid = params.id;

	req.controllerData = (req.controllerData)?req.controllerData:{};

	applicationController.loadModel({
		docid:docid,
		model:Post,
		callback:function(err,doc){
			if(err){
				applicationController.handleDocumentQueryErrorResponse({
					err:err,
					res:res,
					req:req
				});
			}
			else{
				req.controllerData.post = doc;
				next();
			}
		}
	});
};

var controller = function(resources){
	logger = resources.logger;
	mongoose = resources.mongoose;
	appSettings = resources.settings;
	applicationController = new appController(resources);
	Post = mongoose.model('Post');

	return{
		show:show,
		index:index,
		loadPost:loadPost
	};
};

module.exports = controller;