const kilometrikisaClient = require('./services/kilometrikisaClient')
const googleSheetsClient = require('./services/googleSheetsClient')

async function syncData () {
  try {
    const rides = await googleSheetsClient.getRides(process.env.SHEET_ID, process.env.SHEET_NAME, process.env.GOOGLE_API_KEY, new Date('2019-05-01'))

    const { csrfToken, contestId } = await kilometrikisaClient.login()
    const commonData = {
      contest_id: contestId,
      csrfmiddlewaretoken: csrfToken
    }

    for (const ride of rides) {
      await kilometrikisaClient.logKilometers(commonData, ride.kilometers, ride.isoDate)
      await kilometrikisaClient.logMinutes(commonData, ride.minutes, ride.isoDate)
    }
    return 'Data successfully synced.'
  } catch (e) {
    console.log('error', e)
    throw Error('Error syncing data.')
  }
}

module.exports = syncData
