const cors_proxy = require('cors-anywhere');
const whitelist = ["", "*"];

const corsServer = cors_proxy.createServer({
    originWhitelist: whitelist,
    requireHeader: [],
    removeHeaders: ['cookie', 'cookie2']
});



corsServer.on('requireHeader', () => {
    corsServer.removeHeaders = [];
});



const PORT = 4010;
corsServer.listen(PORT, () => { console.log(`CORS Anywhere server is running on port ${PORT}`); });