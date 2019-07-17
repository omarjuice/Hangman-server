const https = require('https');
const axios = require('axios')
var OxfordDictionary = function (app_id, app_key) {

    this.config = {
        app_id: app_id,
        app_key: app_key
    };
};


OxfordDictionary.prototype.find = function (word, cb) {
    var options = {
        host: 'od-api.oxforddictionaries.com',
        port: 443,
        path: '/api/v2/entries/en/' + word,
        method: 'GET',
        headers: {
            "Accept": "application/json",
            "app_id": this.config.app_id,
            "app_key": this.config.app_key
        }
    };


    // https.get(options, function (res) {
    //     //console.log("\nstatus code: ", res.statusCode);
    //     if (res.statusCode == 404) {
    //         cb("No such entry found");
    //     } else {
    //         var data = "";
    //         res.on('data', function (chunk) {
    //             data += chunk;
    //         })
    //             .on('end', function () {
    //                 try {
    //                     result = JSON.parse(data);
    //                 } catch (exp) {
    //                     result = { 'status_code': 500, 'status_text': 'JSON Parse Failed' };
    //                 }
    //                 cb(null, result);
    //             })
    //             .on('error', function (err) {
    //                 cb(err);
    //             });
    //     }
    // });
    axios.get(`https://od-api.oxforddictionaries.com//api/v2/entries/en/${word}`, { headers: options.headers }).then(({ data }) => {
        cb(null, data);
    }).catch(e => {
        cb(e)
    })
};
module.exports = OxfordDictionary;