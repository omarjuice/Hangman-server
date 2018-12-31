const axios = require('axios')

const fetchUrban = (word) => {
    return axios.get(`http://api.urbandictionary.com/v0/define?term={${word}}`)
        .then((res) => {
            if (res.data.list.length < 1) {
                throw new Error('Could not find that word')
            }
            Promise.resolve(res.data.list[0].definition);
        }).catch((e) => {
            Promise.reject(e);
        })
}
module.exports = { fetchUrban }

