'use strict'
const syncData = require('./syncData')

module.exports.triggerDataSync = async (event) => {
  if (event['queryStringParameters']['key'] && event['queryStringParameters']['key'] === process.env.API_KEY) {
    console.log('Syncing')
    const response = await syncData()
    console.log('Done')
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: response
      }, null, 2)
    }
  }
  return {
    statusCode: 403,
    body: JSON.stringify({
      message: 'Forbidden'
    }, null, 2)
  }
}
