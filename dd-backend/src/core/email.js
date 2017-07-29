"use strict";

// System includes.
const fs = require('fs');
const ejs = require('ejs');
const juice = require('juice');
const co = require('co');
const _ = require('lodash');
const promisify = require('bluebird').promisify;
const MailGun = require('mailgun-js');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const async = require('async');

// Local includes
const config = require('../config');
const utils = require('../core/utils');

// Initialize mailgun service.
const mailgun = MailGun({apiKey: config.mailgun.apiKey, domain: config.mailgun.domain});

exports.addresses = {
    info: 'Direct Dispatch <info@direct-dispatch.com>',
    noReply: 'Direct Dispatch <no-reply@direct-dispatch.com>',
    sales: 'Direct Dispatch <sales@direct-dispatch.com>'
};

// Initialize the 2 async queues for sending the email and PDF respectively. Lets keep the no of concurrent tasks as 3.
var asyncQueue = async.queue(function (task, callback) {
    exports[task.fName].apply(this, task.params);
    if (callback) callback();
}, 3);

asyncQueue.drain = function() {
    console.log({
        msg: 'Finished processing all the emails currently in the queue'
    });
};

exports.sendEmail = function (mailOptions, data, file) {
    return co(function *() {
        if (config.sendEmail) {
            const info = yield mailgun.messages().send(mailOptions);
            return info.id;
        } else {
            const fileId = data._id ? data._id : '';
            const tempFile = file.replace('/', '-');
            if (!fs.existsSync('emails')){
                fs.mkdirSync('emails');
            }
            yield writeFile(`./emails/${fileId}-${tempFile}`, mailOptions.html, {flag: 'w+'}, () => {});
            return fileId + '-' + tempFile;
        }
    })
};

exports._send = (mailOptions, data, file) => {
    return co(function* () {
        const template = yield readFile('./email-templates/' + file);
        const contents = ejs.render(template.toString(), data);
        const master = yield readFile('./email-templates/master.html');
        mailOptions.html = ejs.render(master.toString(), {contents: contents});
        const css = yield readFile('./email-templates/style.css');
        mailOptions.html = juice.inlineContent(mailOptions.html, css.toString());
        yield exports.sendEmail(mailOptions, data, file)
    }).catch(err => {
        console.error({
            msg: 'Could not send HTML email',
            err: err
        });
        throw err;
    });
};

exports.send = (mailOptions, data, file) => {
    return co(function *() {
        asyncQueue.push({
            fName: '_send',
            params: [mailOptions, data, file]
        });
    });
};
                        
exports._sendText = (mailOptions, data, file) => {
    return co(function* () {
        const template = yield readFile('./email-templates/' + file);
        mailOptions.text = ejs.render(template.toString(), data);
        yield exports.sendEmail([mailOptions, data, file]);
    }).catch(err => {
        console.error({
            msg: 'Could not send text email',
            err: err
        });
        throw err;
    });
};

exports.sendText = (mailOptions, data, file) => {
    return co(function *() {
        asyncQueue.push({
            fName: '_sendText',
            params: [mailOptions, data, file]
        });
    });
};

// TODO: Move the sending email part in background
// TODO: Need to pass 2 templates in this method. One for the main email content and other for generating the PDF.
exports._sendPDF = (mailOptions, data, templateFile, cssFile) => {
    return co(function* () {
        const template = yield readFile('./email-templates/' + templateFile);
        const contents = ejs.render(template.toString(), data);
        const master = yield readFile('./email-templates/master.html');
        const css = yield readFile('./email-templates/' + cssFile);
        let html = ejs.render(master.toString(), {contents: contents});

        // TODO: Use some meaningful name for the file because same will be used in the email
        let tempPDFFileName = config.tmpDirectory + '/' +  Date.now() + '.pdf';
        html = juice.inlineContent(html, css.toString());

        // First convert this html into pdf and send the pdf as an attachment
        let pdfFilePath = yield utils.htmlToPDF(html, tempPDFFileName);

        mailOptions.attachment = pdfFilePath.filename;
        mailOptions.html = html;
        const info = yield exports.sendEmail(mailOptions, data, templateFile);
        return info.id;
    }).catch(err => {
        console.error({
            msg: 'Could not send email with PDF attachment',
            err: err
        });
        throw err;
    });
};

exports.sendPDF = (mailOptions, data, templateFile, cssFile) => {
    return co(function *() {
        asyncQueue.push({
            fName: '_sendPDF',
            params: [mailOptions, data, templateFile, cssFile]
        });
    });
};

exports.log = function (obj) {
    const record = _.pick(obj, ['type', 'refs', 'from', 'to', 'subject', 'mailgunId']);
    return global.db.collection('emailLogs').insertOne(Object.assign({ dateTime: new Date() }, record));
};