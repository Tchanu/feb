const yas = require('youtube-audio-server')

module.exports = {
    stream: function (port) {
        try {
            yas.listen(port, () => {
                console.log(`Listening on port ${port}.`)
            });
        } catch (err) {
            console.log(err);
        }
    },
};