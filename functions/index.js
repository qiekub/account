if (!process.env.FUNCTION_NAME || process.env.FUNCTION_NAME === 'account') {
	exports.account = require('./account/server.js')
}