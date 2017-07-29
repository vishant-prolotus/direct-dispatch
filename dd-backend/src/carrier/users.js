'use strict';

const co = require('co');
const _ = require('lodash');
const ObjectID = require('mongodb').ObjectID;
const carrierModule = require('./carrier');
const carrierCollection = carrierModule.collection;
const truckModule = require('./truck');
const email = require('../core/email');
const utils = require('../core/utils');

const collection = () => global.db.collection('carrier-users');

exports.collection = {};
exports.routes = {};

const pick = (obj) => {
	let user = _.pick(obj, ['type', 'name', 'email', 'phone', 'enabled', 'truckId']);
	if (user.type === 'Manager') user.truckId = null;
	return user;
};

const init = (user, carrierId) => {
	user.carrierId = carrierId;
	user.created = new Date();
	user.pwhash = null;
	user.enabled = true;
	user.activationToken = utils.generateToken();
	user.activated = false;
	user.activationDate = null;
	user.emailConfirmed = false;
	user.initialLogin = false;
	user.initialLoginDate = null;
	return user;
};

const check = (user) => {
	return co(function* () {
		const carrierExists = yield carrierCollection.fetch({ email: user.email }, { _id: 1 });
		const userExists = yield collection().findOne({ email: user.email }, { _id: 1 });
		if (carrierExists || userExists) return 'User with this email already exists';
		if (['Driver', 'Manager'].indexOf(user.type) === -1) return 'Wrong type given for user';
		if (user.type === 'Driver' && !user.truckId) return 'No truck assigned to driver, please specify truck Id';
	});
};

exports.collection.list = (query, fields) => {
	return collection().find(query, fields);
};

exports.collection.fetch = (query, fields) => {
	return collection().findOne(query, fields);
};

exports.collection.insert = (user) => {
	return collection().insertOne(user).then(result => result.insertedId);
};

exports.collection.update = (query, replacement) => {
	return collection().updateOne(query, replacement).then(result => result.deletedCount == 1);
};

exports.collection.remove = (query) => {
	return collection().deleteOne(query).then(result => result.modifiedCount == 1);
};

exports.routes.list = function (req, res, next) {
    co(function* () {
		const carrierId = carrierModule.getCurrentCarrierId(req.user);
		let users = yield exports.collection.list({ carrierId: carrierId }, { 'type': 1, 'name': 1, 'email': 1, 'phone': 1, 'enabled': 1, 'activated': 1, 'truckId': 1 }).toArray();
		for (let user of users) {
			if (user.type === 'Driver') {
				user.truckName = (yield truckModule.crud.fetch(carrierId, user.truckId)).name;
			}
		}
		return users;
	}).then(users => {
		res.json(users);
	}).catch(err => {
		console.log(err);
		res.status(400).send(err.toString());
	});
};

exports.routes.fetch = function (req, res, next) {
	co(function* () {
		return exports.collection.fetch({ _id: ObjectID(req.params.id) }, { _id: 0, 'type': 1, 'name': 1, 'email': 1, 'phone': 1, 'enabled': 1, 'truckId': 1 });
	}).then(user => {
		res.json(user);
	}).catch(err => {
		res.status(400).send(err.toString());
	});
};

exports.routes.insert = function (req, res, next) {
    co(function* () {
		const carrierId = carrierModule.getCurrentCarrierId(req.user);
		const user = init(pick(req.body), carrierId);
		const carrier = yield carrierCollection.fetch({ _id: carrierId }, { company: 1 });
		const error = yield check(user);
		if (error) throw new Error(error);
		const insertedId = yield exports.collection.insert(user);
		const message = {
			from: email.addresses.noReply,
			to: user.email,
			subject: `You have have been invited to ${carrier.company} on Direct Dispatch`
		};
		const msgData = { _id: insertedId, company: carrier.company, role: user.type, name: user.name, email: user.email, phone: user.phone, token: user.activationToken };
		yield email.sendText(message, msgData, 'carrier/user-invitation.txt');
		return insertedId;
	}).then(insertedId => {
		res.json({ _id: insertedId });
	}).catch(err => {
		res.status(400).send(err.toString());
	});
};

exports.routes.update = function (req, res, next) {
	co(function* () {
		return exports.collection.update({ _id: ObjectID(req.params.id) }, { $set: pick(req.body) });
	}).then(updated => {
		res.json({ updated: updated });
	}).catch(err => {
		res.status(400).send(err.toString());
	});
};

exports.routes.remove = function (req, res, next) {
	co(function* () {
		return exports.collection.remove({ _id: ObjectID(req.params.id) });
	}).then(deleted => {
		res.json({ deleted: deleted });
	}).catch(err => {
		res.status(400).send(err.toString());
	});
};