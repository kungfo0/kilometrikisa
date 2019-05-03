const requestp = require('request-promise-native')

const rp = requestp.defaults({
  simple: false,
  jar: requestp.jar(),
  headers: {
    Referer: 'https://www.kilometrikisa.fi/contest/log/',
    Origin: 'https://www.kilometrikisa.fi'
  }
})

const START_DATE = new Date('2019-05-01')

const groupBy = (xs, key) => {
  return xs.reduce(function (rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x)
    return rv
  }, {})
}
const pad = (num, size) => {
  let s = num + ''
  while (s.length < size) s = '0' + s
  return s
}
// eslint-disable-next-line
Array.prototype.sum = function (prop) {
  let total = 0
  for (let i = 0, _len = this.length; i < _len; i++) {
    total += this[i][prop]
  }
  return total
}

function parseRides (entries) {
  const parsedEntries = []
  for (const entry of entries) {
    try {
      const date = new Date(entry[0].substr(0, entry[0].indexOf(' at')))
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const day = date.getDate()
      const isoDate = year + '-' + pad(month, 2) + '-' + pad(day, 2)
      const meters = parseFloat(entry[2])
      const minutes = parseInt(entry[3].substr(0, entry[3].indexOf(' minutes, ')))
      const seconds = (minutes * 60) + parseInt(entry[3].substring(entry[3].indexOf(', ') + 2, entry[3].indexOf('second') - 1))
      if (date >= START_DATE) {
        parsedEntries.push({ date, isoDate, meters, seconds })
      }
    } catch (e) {
      console.log(e)
      console.log('error', 'Invalid entry: ' + JSON.stringify(entry))
    }
  }
  const grouped = groupBy(parsedEntries, 'isoDate')
  const result = []
  Object.keys(grouped).forEach(function (key) {
    const ridesForDay = grouped[key]
    const item = {
      isoDate: key,
      meters: ridesForDay.sum('meters'),
      seconds: ridesForDay.sum('seconds')
    }
    item.kilometers = (item.meters / 1000).toFixed(1).replace('.', ',')
    item.minutes = (item.seconds / 60).toFixed(0)
    result.push(item)
  })
  return result
}

async function loginToKilometrikisa () {
  const regex = /(.*)(csrfmiddlewaretoken)(.*)(value=')(.*)(')/gm
  const regex2 = /(.*)(csrfToken)(.*)(")(.*)(";)/gm
  const regex3 = /(.*)(contestId = )(.*)(;)/gm

  const page = await rp.get('https://www.kilometrikisa.fi/accounts/login/')
  const token = regex.exec(page)[5]

  const config = {
    form: {
      username: process.env.KILOMETRIKISA_USER,
      password: process.env.KILOMETRIKISA_PWD,
      csrfmiddlewaretoken: token,
      next: ''
    },
    headers: {
      'Referer': 'https://www.kilometrikisa.fi/accounts/login/'
    }
  }

  try {
    await rp.post('https://www.kilometrikisa.fi/accounts/login/', config)

    const page2 = await rp.get('https://www.kilometrikisa.fi/contest/log/')
    const csrfToken = regex2.exec(page2)[5]
    const contestId = regex3.exec(page2)[3]

    return { csrfToken, contestId }
  } catch (e) {
    console.log('error', e)
  }
}

async function syncData () {
  try {
    const sheetData = await rp.get(`https://sheets.googleapis.com/v4/spreadsheets/${process.env.SHEET_ID}/values/${process.env.SHEET_NAME}!A1:E1000?key=${process.env.GOOGLE_API_KEY}`)
    const rides = parseRides(JSON.parse(sheetData).values)

    const { csrfToken, contestId } = await loginToKilometrikisa()

    for (const ride of rides) {
      const formData = {
        contest_id: contestId,
        csrfmiddlewaretoken: csrfToken
      }

      let kilometers = {
        method: 'POST',
        uri: 'https://www.kilometrikisa.fi/contest/log-save/',
        form: {
          ...formData,
          km_amount: ride.kilometers,
          km_date: ride.isoDate
        }
      }

      // Uses sessionId from previous requests
      await rp(kilometers)

      let minutes = {
        method: 'POST',
        uri: 'https://www.kilometrikisa.fi/contest/minute-log-save/',
        form: {
          ...formData,
          hours: '',
          minutes: ride.minutes,
          date: ride.isoDate
        }
      }

      // Uses sessionId from previous requests
      await rp(minutes)
    }
    return 'Data successfully synced.'
  } catch (e) {
    console.log('error', e)
    throw Error('Error syncing data.')
  }
}
syncData()

module.exports = syncData
