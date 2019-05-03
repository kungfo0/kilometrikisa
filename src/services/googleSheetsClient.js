const rp = require('request-promise-native')

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

function parseRides (entries, startDate) {
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
      if (date >= startDate) {
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

async function getRides (sheetId, sheetName, googleApiKey, startDate) {
  try {
    const sheetData = await rp.get(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}!A1:E1000?key=${googleApiKey}`)
    return parseRides(JSON.parse(sheetData).values, startDate)
  } catch (e) {
    console.log('error', e)
    throw Error('Error syncing data.')
  }
}

module.exports = { getRides }
