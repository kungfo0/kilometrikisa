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

function getSeconds (numericTime, timeType) {
  if (timeType === 'second' || timeType === 'seconds') {
    return numericTime
  } else if (timeType === 'minute' || timeType === 'minutes') {
    return numericTime * 60
  } else if (timeType === 'hour' || timeType === 'hours') {
    return numericTime * 60 * 60
  } else {
    return 0
  }
}

function parseTimesToSeconds (times) {
  const regex = /(\d+)\s(\w+)/gm
  const matches = times.match(regex)
  let seconds = 0

  for (const match of matches) {
    const timeAndType = match.match(/(\d+)\s(\w+)/)
    if (timeAndType && timeAndType.length === 3) {
      seconds += getSeconds(parseInt(timeAndType[1]), timeAndType[2])
    }
  }

  return seconds
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
      let seconds = parseTimesToSeconds(entry[3])
      const meters = parseFloat(entry[2])
      if (date >= startDate) {
        const entry = { date, isoDate, meters, seconds }
        parsedEntries.push(entry)
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

// startDate default value is 48h ago
async function getRides (sheetId, sheetName, googleApiKey, startDate = new Date(Date.now() - (86400000 * 2))) {
  try {
    const sheetData = await rp.get(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}!A1:E1000?key=${googleApiKey}`)
    return parseRides(JSON.parse(sheetData).values, startDate)
  } catch (e) {
    console.log('error', e)
    throw Error('Error syncing data.')
  }
}

module.exports = { getRides }
