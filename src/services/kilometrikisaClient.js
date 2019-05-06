const requestp = require('request-promise-native')

const rp = requestp.defaults({
  simple: false,
  jar: requestp.jar(),
  headers: {
    Referer: 'https://www.kilometrikisa.fi/contest/log/',
    Origin: 'https://www.kilometrikisa.fi'
  }
})

async function login () {
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

const logMinutes = async (commonData, minutes, date) => {
  let options = {
    method: 'POST',
    uri: 'https://www.kilometrikisa.fi/contest/minute-log-save/',
    form: {
      ...commonData,
      hours: Math.floor(minutes / 60),
      minutes: minutes % 60,
      date
    }
  }

  // Uses sessionId from previous requests
  await rp(options)
}

const logKilometers = async (commonData, kilometers, date) => {
  let options = {
    method: 'POST',
    uri: 'https://www.kilometrikisa.fi/contest/log-save/',
    form: {
      ...commonData,
      km_amount: kilometers,
      km_date: date
    }
  }

  // Uses sessionId from previous requests
  await rp(options)
}

module.exports = { login, logMinutes, logKilometers }
