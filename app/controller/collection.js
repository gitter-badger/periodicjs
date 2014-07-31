'use strict';

var path = require('path'),
	async = require('async'),
	moment = require('moment'),
	merge = require('utils-merge'),
	appController = require('./application'),
	applicationController,
	appSettings,
	mongoose,
	Item,
	Collection,
	logger;

var show = function (req, res, next) {
	applicationController.getPluginViewDefaultTemplate({
			viewname: 'collection/show',
			themefileext: appSettings.templatefileextension
		},
		function (err, templatepath) {
			applicationController.handleDocumentQueryRender({
				res: res,
				req: req,
				renderView: templatepath,
				responseData: {
					pagedata: {
						title: req.controllerData.collection.title
					},
					collection: req.controllerData.collection,
					user: req.user
				}
			});
		}
	);
};

var index = function (req, res, next) {
	applicationController.getPluginViewDefaultTemplate({
			viewname: 'collection/index',
			themefileext: appSettings.templatefileextension
		},
		function (err, templatepath) {
			applicationController.handleDocumentQueryRender({
				res: res,
				req: req,
				renderView: templatepath,
				responseData: {
					pagedata: {
						title: 'Collections'
					},
					collections: req.controllerData.collections,
					user: req.user
				}
			});
		}
	);
};

var create = function (req, res, next) {
	var newcollection = applicationController.removeEmptyObjectValues(req.body);
	newcollection.name = applicationController.makeNiceName(newcollection.title);
	newcollection.itemauthorname = req.user.username;
	newcollection.primaryauthor = req.user._id;
	newcollection.authors = [req.user._id];
	if (newcollection.date && newcollection.time) {
		newcollection.publishat = new Date(moment(newcollection.date + ' ' + newcollection.time).format());
	}

	applicationController.createModel({
		model: Collection,
		newdoc: newcollection,
		res: res,
		req: req,
		successredirect: '/p-admin/collection/edit/',
		appendid: true
	});
};

var update = function (req, res, next) {
	var updatecollection = applicationController.removeEmptyObjectValues(req.body);
	updatecollection.name = applicationController.makeNiceName(updatecollection.title);
	if (updatecollection.items && updatecollection.items.length > 0) {
		for (var x in updatecollection.items) {
			updatecollection.items[x] = JSON.parse(updatecollection.items[x]);
		}
	}
	if (!updatecollection.primaryasset && updatecollection.assets && updatecollection.assets.length > 0) {
		updatecollection.primaryasset = updatecollection.assets[0];
	}
	if (updatecollection.date && updatecollection.time) {
		updatecollection.publishat = new Date(moment(updatecollection.date + ' ' + updatecollection.time).format());
	}

	applicationController.updateModel({
		model: Collection,
		id: updatecollection.docid,
		updatedoc: updatecollection,
		saverevision: true,
		population: 'contenttypes',
		res: res,
		req: req,
		successredirect: '/p-admin/collection/edit/',
		appendid: true
	});
};

var append = function (req, res, next) {
	var newitemtoadd = applicationController.removeEmptyObjectValues(req.body);
	delete newitemtoadd._csrf;
	var objectToModify = newitemtoadd; //{"items":newitemtoadd};

	logger.silly("objectToModify", objectToModify);
	applicationController.updateModel({
		model: Collection,
		id: req.controllerData.collection._id,
		updatedoc: objectToModify,
		saverevision: true,
		res: res,
		req: req,
		appendArray: true,
		successredirect: '/p-admin/collection/edit/',
		appendid: true
	});
};

var loadCollection = function (req, res, next) {
	var params = req.params,
		population = 'tags categories authors assets primaryasset contenttypes primaryauthor items',
		docid = params.id;
	// console.log("params",params);


	req.controllerData = (req.controllerData) ? req.controllerData : {};

	applicationController.loadModel({
		docid: docid,
		model: Collection,
		population: population,
		callback: function (err, doc) {
			if (err) {
				applicationController.handleDocumentQueryErrorResponse({
					err: err,
					res: res,
					req: req
				});
			}
			else {
				Collection.populate(doc, {
					path: "items.item",
					model: "Item",
					select: "title name content createdat updatedat publishat status contenttypes contenttypeattributes tags categories assets primaryasset authors primaryauthor itemauthorname"
				}, function (err, populatedcollection) {
					if (err) {
						applicationController.handleDocumentQueryErrorResponse({
							err: err,
							res: res,
							req: req
						});
					}
					else {
						// console.log("doc",populatedcollection);
						async.parallel({
							tags: function (callback) {
								Collection.populate(populatedcollection, {
										path: "items.item.tags",
										model: "Tag",
										select: "title name content createdat updatedat publishat status contenttypes contenttypeattributes tags categories assets primaryasset authors primaryauthor itemauthorname"
									},
									callback);
							},
							categories: function (callback) {
								Collection.populate(populatedcollection, {
										path: "items.item.categories",
										model: "Category",
										select: "title name content createdat updatedat publishat status contenttypes contenttypeattributes tags categories assets primaryasset authors primaryauthor itemauthorname"
									},
									callback);
							},
							authors: function (callback) {
								Collection.populate(populatedcollection, {
										path: "items.item.authors",
										model: "User",
										select: "title name content createdat updatedat publishat status contenttypes contenttypeattributes tags categories assets primaryasset authors primaryauthor itemauthorname"
									},
									callback);
							},
							primaryauthor: function (callback) {
								Collection.populate(populatedcollection, {
										path: "items.item.primaryauthor",
										model: "User",
										select: "title name content createdat updatedat publishat status contenttypes contenttypeattributes tags categories assets primaryasset authors primaryauthor itemauthorname"
									},
									callback);
							},
							contenttypes: function (callback) {
								Collection.populate(populatedcollection, {
										path: "items.item.contenttypes",
										model: "Contenttype",
										select: "title name content createdat updatedat publishat status contenttypes contenttypeattributes tags categories assets primaryasset authors primaryauthor itemauthorname"
									},
									callback);
							},
							assets: function (callback) {
								Collection.populate(populatedcollection, {
										path: "items.item.assets",
										model: "Asset",
										select: "title name content createdat updatedat publishat status contenttypes contenttypeattributes tags categories assets primaryasset authors primaryauthor itemauthorname"
									},
									callback);
							}
						}, function (err, results) {
							if (err) {
								applicationController.handleDocumentQueryErrorResponse({
									err: err,
									res: res,
									req: req
								});
							}
							else if (populatedcollection) {
								var mergedCollectionData = merge(populatedcollection, results.tags);
								req.controllerData.collection = mergedCollectionData;
								// req.controllerData.collectionData = results;
								next();
							}
							else {
								applicationController.handleDocumentQueryErrorResponse({
									err: new Error("invalid collection request"),
									res: res,
									req: req
								});
							}
							// console.log("results",results.tags.items[0].item);
						});
					}
				});
			}
		}
	});
};

var loadCollections = function (req, res, next) {
	var params = req.params,
		query,
		offset = req.query.offset,
		sort = req.query.sort,
		limit = req.query.limit,
		population = 'tags categories authors contenttypes primaryauthor items.item',
		searchRegEx = new RegExp(applicationController.stripTags(req.query.search), "gi");

	req.controllerData = (req.controllerData) ? req.controllerData : {};
	if (req.query.search === undefined || req.query.search.length < 1) {
		query = {};
	}
	else {
		query = {
			$or: [{
				title: searchRegEx
			}, {
				'name': searchRegEx
			}]
		};
	}

	applicationController.searchModel({
		model: Collection,
		query: query,
		sort: sort,
		limit: limit,
		offset: offset,
		population: population,
		callback: function (err, documents) {
			if (err) {
				applicationController.handleDocumentQueryErrorResponse({
					err: err,
					res: res,
					req: req
				});
			}
			else {
				// console.log(documents);
				req.controllerData.collections = documents;
				next();
			}
		}
	});
};

var cli = function (argv) {
	if (argv.search) {
		// var Collection = mongoose.model('Collection');
		// Collection.find({}).limit(2).exec(function(err,items){ 
		// 	if(err){ console.error(err); } else{ console.info(items); }
		// 	process.exit(0);
		// });
		var query,
			offset = argv.offset,
			sort = argv.sort,
			limit = argv.limit,
			population = 'tags categories authors contenttypes primaryauthor items.item',
			searchRegEx = new RegExp(applicationController.stripTags(argv.search), "gi");

		if (argv.search === undefined || argv.search.length < 1) {
			query = {};
		}
		else {
			query = {
				$or: [{
					title: searchRegEx
				}, {
					'name': searchRegEx
				}]
			};
		}
		// Collection.find(query).limit(5).populate(population).exec(function(err,docs){
		// 		console.log("in model search cb");
		// 		if(err){
		// 			console.log(err);
		// 			process.exit(0);
		// 		}
		// 		else{
		// 			console.log("got docs");
		// 			console.info(docs);
		// 			process.exit(0);
		// 		}
		// 	});
		applicationController.searchModel({
			model: Collection,
			query: query,
			sort: sort,
			limit: limit,
			offset: offset,
			population: population,
			callback: function (err, docs) {
				console.log("in model search cb");
				if (err) {
					console.log(err);
					process.exit(0);
				}
				else {
					console.log("got docs");
					console.info(docs);
					process.exit(0);
				}
			}
		});
	}
	else {
		logger.silly("invalid task");
		process.exit(0);
	}
};

var controller = function (resources) {
	logger = resources.logger;
	mongoose = resources.mongoose;
	appSettings = resources.settings;
	applicationController = new appController(resources);
	Item = mongoose.model('Item');
	Collection = mongoose.model('Collection');

	return {
		show: show,
		index: index,
		create: create,
		update: update,
		append: append,
		cli: cli,
		loadCollection: loadCollection,
		loadCollections: loadCollections
	};
};

module.exports = controller;
