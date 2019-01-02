
const generateMessage = ({ from, text }) => {
    return {
        from,
        text,
        createdAt: new Date()
    }
}
module.exports = { generateMessage }