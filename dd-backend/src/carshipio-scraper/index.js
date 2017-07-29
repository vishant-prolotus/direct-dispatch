'use strict';

const mongodb = require('mongodb');
const requestModule = require('request');
const cheerio = require('cheerio');
const co = require('co');
const bluebird = require('bluebird');

const host = 'http://www.carshipio.com';
const states = require('./states');

const request = (url) => {
	return new Promise((resolve, reject) => {
		requestModule(url, (err, resp, data) => {
			err ? reject(err) : resolve([resp, data]);
		});
	});	
};

const getCarrierLinks = (state) => {
	return co(function*() {
		const result = yield request(host + '/public/carriers?state=' + state);
		const resp = result[0];
		if (!(resp.statusCode >= 200 && resp.statusCode < 300)) return null;
		const data = result[1];
		const $ = cheerio.load(data);
		const links = $('.card strong a').map((index, card) => {
			return host + $(card).attr('href');
		}).get();
		return links;
	});
};

const parseDetails = (data) => {
	const $ = cheerio.load(data);
	const carrier = {};
	const sectionLeft = $('.panel-body .table').get(0);
	const sectionRight = $('.panel-body .col-md-6').get(1);
	carrier.company = $($(sectionRight).find('.col-md-12').get(0)).text().trim();
	carrier.address = $($(sectionRight).find('.col-md-12').get(1)).text().trim();
	const cityStateZip = $($(sectionRight).find('.col-md-12').get(2)).text().trim().split(', ');
	carrier.city = cityStateZip[0];
	carrier.state = cityStateZip[1];
	carrier.zip = cityStateZip[2];
	carrier.phone = $($(sectionRight).find('.col-md-12 a').get(0)).text().trim();
	carrier.dot = $($(sectionLeft).find('td').get(1)).text().trim();
	return carrier;
}

const getDetails = (url) => {
	return co(function*() {
		const result = yield request(url);
		const resp = result[0];
		if (!(resp.statusCode >= 200 && resp.statusCode < 300)) return null;
		const data = result[1];
		return parseDetails(data);
	});
};


co(function*() {
	const db = yield mongodb.MongoClient.connect('mongodb://localhost/carshipio-scrapping');
	const stateKeys = Object.keys(states);//.splice(13);
	for (const state of stateKeys) {
		console.log('Fetching carrier links for state: ' + state);
		let links = yield getCarrierLinks(state);
		if (!links) {
			console.log('Unable to  get links for state: ' + state);
			continue;
		}
		let count = 0;
		for (const link of links) {
			const rec = yield db.collection('carriers').findOne({ link: link }, { _id: 1 });
			if (rec) continue;
			console.log('Fetching carrier details for: ' + link);
			const carrier = yield getDetails(link);	
			if (!carrier) {
				console.log('Unable to get details for carrier: ' + link);
				continue;
			}
			carrier.link = link;
			db.collection('carriers').insert(carrier);
			count++;
		}
		console.log('Inserted carriers: ' + count);
	}
}).catch(err => {
	console.log(err);
});