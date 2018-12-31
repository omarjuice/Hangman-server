const axios = require('axios')

const fetchUrban = async (word) => {
    const { data, error } = await axios.get(`http://api.urbandictionary.com/v0/define?term={${word}}`)
    if (error) {
        throw new Error('Urban Dictionary Server Error')
    }
    return { data: data.list[0].definition }
}
module.exports = { fetchUrban }

