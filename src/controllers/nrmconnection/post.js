/*

  ___ ___       ___               _ _       _   ___ ___
 | __/ __|  ___| _ \___ _ _ _ __ (_) |_    /_\ | _ \_ _|
 | _|\__ \ / -_)  _/ -_) '_| '  \| |  _|  / _ \|  _/| |
 |_| |___/ \___|_| \___|_| |_|_|_|_|\__| /_/ \_\_| |___|

*/

//*******************************************************************

'use strict';

//*******************************************************************
// required modules
const request = require('request-promise');

//*******************************************************************
// other files

const db = require('../db.js');
const error = require('../errors/error.js');
const DuplicateContactsError = require('../errors/duplicateContactsError.js');

const auth = require('./auth');
const autoPopulate = require('./autoPopulate.js');

//*******************************************************************

/**
 * Returns whether application is for an individual.
 * @param  {Object}  body - User input
 * @return {Boolean}      - Whether application is for an individual
 */
function isAppFromPerson(body){
	const output = (!body.applicantInfo.orgType || body.applicantInfo.orgType.toUpperCase() === 'PERSON');
	return output;
}

/**
 * Gets the data from all fields that are to be send to the basic API, also builds post object, used to pass data to basic api
 * @param  {Array} fieldsToBasic - All fields in object form which will be sent to basicAPI
 * @return {Object} - Array of endpoints with which fields should go in them
 */
function assignFieldsToEndpoints(fieldsToBasic){
	const fieldsAssignedToEndpoints = {};
	fieldsToBasic.forEach((field)=>{
		const key = Object.keys(field)[0];
		if (field[key].hasOwnProperty('basicStore')){
			field[key].basicStore.forEach((location)=>{
				if (fieldsAssignedToEndpoints.hasOwnProperty(location)){
					fieldsAssignedToEndpoints[location][key] = field[key];
				}
				else {
					fieldsAssignedToEndpoints[location] = {};
					fieldsAssignedToEndpoints[location][key] = field[key];
				}
			});
		}
	});
	return fieldsAssignedToEndpoints;
}

/**
 * Gets the data from all fields that are to be send to the basic API, also builds post object, used to pass data to basic api
 * @param  {Array} fieldsToBasic - All fields in object form which will be sent to basicAPI
 * @param {Object} body - body of the incoming post request
 * @param {Object} autoPopValues - field entries that did not come directly from a request
 * @return {Object} - Array of endpoints with which fields should go in them
 */
function populateEnpointRequests(fieldsByEnpoint, body, autoPopValues){
	const postObjs = {};
	//requestsObj contains objects, labeled as each request that may be sent to the basic API, containing the fields
	//which need to be included in that request
	for (const request in fieldsByEnpoint){
			const obj = {};
			obj[request] = {};
			for (const fieldKey in fieldsByEnpoint[request]){
					const field = fieldsByEnpoint[request][fieldKey];
					const splitPath = fieldKey.split('.');
					let bodyField = body;
					if (field.fromIntake){
						splitPath.forEach((sp)=>{
							if (bodyField[sp]){
								bodyField = bodyField[sp];
							}
							else {
								bodyField = field.default;
							}
						});
						// let basicFieldName;
						// if(!field.hasOwnProperty('basicField')){
						// 	basicFieldName = field.basicField;
						// }
						// else {
						// 	//basicFieldName =
						// }
						obj[request][field.basicField] = bodyField;
					}
					else {
						if (autoPopValues[fieldKey]){
							obj[request][field.basicField] = autoPopValues[fieldKey];
						}
						else {
							obj[request][field.basicField] = field.default;
						}
					}
			}
			postObjs[request] = obj[request];
	}
	return postObjs;
}

/** Takes fields to be stored, creates post objects and populated with user input
 * @param  {Object} validationSchema - validation schema for route requested
 * @param  {Object} body - user input
 * @param  {Boolean} person - whether application is for individual(true) or organization (false)
 * @return {Object} - All post objects
 */
function prepareBasicPost(validationSchema, body, person){
	const fieldsToSend = [];
	db.getFieldsToStore(validationSchema, fieldsToSend, '', 'basic');
	const autoPopulateValues = autoPopulate.buildAutoPopulatedFields(fieldsToSend, person, body);
	const fieldsToSendByEndpoint = assignFieldsToEndpoints(fieldsToSend);
	const populatedFieldsToSend = populateEnpointRequests(fieldsToSendByEndpoint, body, autoPopulateValues);
	return populatedFieldsToSend;
}

/**
 * Creates request for Basic API calls to create contact
 * @param  {Object} res         - Response of previous request
 * @param  {Object} apiCallLogObject  - Object used to save the request and response for each post to the basic api. Used for testing purposes.
 * @param  {Object} fieldsObj   - Object containing post objects to be sent to basic api
 * @param  {String} responseKey - Key in apiCallLogObject for the response object of the previous request
 * @param  {String} requestKey  - Key in apiCallLogObject for the request object of this request
 * @param  {String} requestPath - Path from basic API route this response needs to be sent to
 * @return {Promise}            - Promise to be fulfilled
 */
function postRequest(res, apiCallLogObject, fieldsObj, responseKey, requestKey, requestPath, sudsToken){
	apiCallLogObject.POST[responseKey].response = res;
	const addressField = fieldsObj[requestKey];
	addressField.contCn = res.contCn;
	const addressURL = `${auth.SUDS_API_URL}${requestPath}`;
	apiCallLogObject.POST[requestPath].request = addressField;
	const createAddressOptions = auth.getRequestOptions(addressURL, 'POST', addressField, sudsToken);
	return request.post(createAddressOptions);
}

/**
 * Calls basic API to create a contact in SUDS
 * @param  {Object} fieldsObj  - Object containing post objects to be sent to basic api
 * @param  {boolean} person    - Boolean indicating whether the contract being created is for a person or not
 * @param  {Object} apiCallLogObject - Object used to save the request and response for each post to the basic api. Used for testing purposes.
 * @return {Promise}		   - Promise to be fulfilled
 */
function createContact(fieldsObj, person, apiCallLogObject, sudsToken){
	return new Promise(function(fulfill, reject){
		let contactField, createPersonOrOrgURL, responseKey;
		if (person){
			contactField = fieldsObj['/contact/person'];
			createPersonOrOrgURL = `${auth.SUDS_API_URL}/contact/person`;
			responseKey = '/contact/person';
			apiCallLogObject.POST[responseKey].request = contactField;
		}
		else {
			contactField = fieldsObj['/contact/organization'];
			createPersonOrOrgURL = `${auth.SUDS_API_URL}/contact/organization`;
			responseKey = '/contact/orgcode';
			apiCallLogObject.POST[responseKey].request = contactField;
		}
		const createContactOptions = auth.getRequestOptions(createPersonOrOrgURL, 'POST', contactField, sudsToken);
		request.post(createContactOptions)
		.then(function(res){
			return postRequest(res, apiCallLogObject, fieldsObj, responseKey, '/contact/address', '/contact-address', sudsToken);
		})
		.then(function(res){
			return postRequest(res, apiCallLogObject, fieldsObj, '/contact-address', '/contact/phone', '/contact-phone', sudsToken);
		})
		.then(function(res){
			apiCallLogObject.POST['/contact-phone'].response = res;
			fulfill(res.contCn);
		})
		.catch(function(err){
			reject(err);
		});
	});
}

/**
 * Calls basic API to create an application in SUDS
 * @param  {Object} fieldsObj   - Object containing post objects to be sent to basic api
 * @param  {Number} contCN      - Contact control number of contact associated with this application
 * @param  {Object} apiCallLogObject  - Object used to save the request and response for each post to the basic api. Used for testing purposes.
 * @return {Promise}            - Promise to be fulfilled
 */
function createApplication(fieldsObj, contCN, apiCallLogObject, sudsToken){
	const createApplicationURL = `${auth.SUDS_API_URL}/application`;
	fieldsObj['/application'].contCn = contCN;
	const applicationPost = fieldsObj['/application'];
	apiCallLogObject.POST['/application'].request = applicationPost;
	const createApplicationOptions = auth.getRequestOptions(createApplicationURL, 'POST', applicationPost, sudsToken);
	return request.post(createApplicationOptions);
}

/**
 * Gets the contId to be used if a contact is created so it can be compared to the results of the contact GET request
 * @param  {Object} fieldsObj - Object containing post objects to be sent to basic api
 * @param  {Boolean} person   - Whether the application is for a person or not
 * @return {String}           - ContId for this application
 */
function getContId(fieldsObj, person){
	if (person){
		return fieldsObj['/contact/person'].contId;
	}
	else {
		return fieldsObj['/contact/organization'].contId;
	}
}

/**
 * Set the options for the check if a contact exists
 * @param {Object} applicantInfo - portion of the body of the request with the contact information
 * @param {Boolean} person - whether the applicaion is from an individual or not
 * @param {String} token - JWT token from SUDS
 * @param {Object} apiCallLogObject - running log of the requests
 */
function setContactGETOptions(applicantInfo, person, token, apiCallLogObject){
	let endpoint;
	let contact;
	if (person){
		contact = applicantInfo.lastName;
		endpoint = 'lastName';
	}
	else {
		contact = applicantInfo.organizationName;
		endpoint = 'orgCode';
	}
	const requestUri = `${auth.SUDS_API_URL}/contact/${endpoint.toLowerCase()}/${contact}`;
	const logUri = `/contact/${endpoint.toLowerCase()}/{${endpoint}}`;
	const sumReq = {};
	sumReq[endpoint] = contact;
	apiCallLogObject.GET[logUri].request = sumReq;

	const requestParams = auth.getRequestOptions(requestUri, 'GET', null, token);
	return {logUri, requestParams, apiCallLogObject: apiCallLogObject};
}

/** handle if multiple contacts are found
* @param {String} - contId - ID of the contact
* @param {Array} matchingContacts - response body array of potential contacts with that ContName
* @param {Boolean} person - whether the applicaion is from an individual or not
* @param {String} token - JWT token from SUDS
* @param {Object} apiCallLogObject - running log of the requests
*/
function multipleContactsCheck(contId, matchingContacts, fieldsObj, person, apiCallLogObject, sudsToken){
	const duplicateContacts = [];
	let tmpContCn;

	matchingContacts.forEach((contact)=>{
		if (contId === contact.contId){
			duplicateContacts.push(contact);
			tmpContCn = contact.contCn;
		}
	});

	if (duplicateContacts.length === 0){
		return createContact(fieldsObj, person, apiCallLogObject, sudsToken);
	}
	else if (duplicateContacts.length === 1){
		return new Promise(function(resolve){
			resolve(tmpContCn);
		});
	}
	else {
		throw new DuplicateContactsError(duplicateContacts);
	}
}

/** Sends requests needed to create an application via the Basic API
 * @param  {Object} req - Request Object
 * @param  {Object} res - Response Object
 * @param  {Object} validationSchema - Schema object
 * @param  {Object} body - User input
 */
function postToBasic(req, res, validationSchema, body){

	return new Promise(function (fulfill, reject){

		let apiCallLogObject = {
			'GET':{
				'/contact/lastname/{lastName}':{},
				'/contact/orgcode/{orgCode}':{}
			},
			'POST':{
				'/contact/person':{},
				'/contact/orgcode':{},
				'/contact-address':{},
				'/contact-phone':{},
				'/application':{}
			}
		};

		auth.getToken()
		.then(function(sudsToken) {

			const person = isAppFromPerson(body);
			const fieldsInBasicPostFormat = prepareBasicPost(validationSchema, body, person);
			console.log("fieldsInBasicPostFormat:");
			console.log(fieldsInBasicPostFormat);
			const contactGETOptions = setContactGETOptions(body.applicantInfo, person, sudsToken, apiCallLogObject);
			apiCallLogObject = contactGETOptions.apiCallLogObject;

			request.get(contactGETOptions.requestParams)
			.then(function(res){
				apiCallLogObject.GET[contactGETOptions.logUri].response = res;
				const contId = getContId(fieldsInBasicPostFormat, person);
				if (res.length === 1  && res[0].contCn){
					if (contId === res[0].contId){
						return new Promise(function(resolve){
							resolve(res[0].contCn);
						});
					}
					else {
						return createContact(fieldsInBasicPostFormat, person, apiCallLogObject, sudsToken);
					}
				}
				else if (res.length > 1){
					multipleContactsCheck(contId, res, fieldsInBasicPostFormat, person, apiCallLogObject, sudsToken);
				}
				else {
					return createContact(fieldsInBasicPostFormat, person, apiCallLogObject, sudsToken);
				}
			})
			.then(function(contCn){
				return createApplication(fieldsInBasicPostFormat, contCn, apiCallLogObject, sudsToken);
			})
			.then(function(response){
				const applResponse  = response;
				apiCallLogObject.POST['/application'].response = applResponse;
				fulfill(apiCallLogObject);
			})
			.catch(function(err){
				if (err.statusCode && err.statusCode === 404){
					console.error(err);
					return error.sendError(req, res, 503, 'underlying service unavailable.');
				}
				else if (err.error && err.error.code === 'ETIMEDOUT') {
					console.error(err);
					return error.sendError(req, res, 504, 'underlying service has timed out.');
				}
				else {
					reject(err);
				}
			});
		})
		.catch(reject);
	});

}

module.exports.postToBasic = postToBasic;