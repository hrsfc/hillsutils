import axios from 'axios';
import axiosCookieJarSupport from 'axios-cookiejar-support';
import { NtlmClient } from 'axios-ntlm';
import { CookieJar } from 'tough-cookie';
import * as jsdom from 'jsdom';

const subjects = {
  "MF": "Maths",
  "CG": "Computer Science",
  "TU": "Tutorial",
  "EP": "Extended Project",
}

axiosCookieJarSupport(axios);

const interceptor = response => {
  return response;
};
const errorInterceptor = error => {
  return error.response;
};

class Lesson {
  constructor(lessonData) {
    this.teacher = lessonData[2].split(', ')
    this.teacher = this.teacher[1] + " " + (this.teacher[0][0] + this.teacher[0].slice(1).toLowerCase()).replace(/ ./g, char => { return char.toUpperCase() });

    this.room = lessonData[3].trim()

    const classInfo = lessonData[1].trim().split(" ")
    
    this.start = classInfo[0]
    this.end = classInfo[2]
    this.class = classInfo[3]
  }
}

export default async function handler(req, res) {
  const cookieJar = new CookieJar();
  const credentials = {
    username: req.query.username,
    password: req.query.password,
//    domain: ""
  }
  const config = {
    baseURL: 'https://intranet.hrsfc.ac.uk/ProPortal/pages',
    method: 'get',
    jar: cookieJar,
    withCredentials: true,
  }
  
  const client = NtlmClient(credentials, config);
  client.interceptors.response.use(interceptor, errorInterceptor);

  await client.get('/Index/StudentSelection.aspx', {
    jar: cookieJar,
    withCredentials: true,
  })
  await client.get('/Index/StudentSelection.aspx', {
    jar: cookieJar,
    withCredentials: true,
    headers: {
      'Authorization': 'NTLM TlRMTVNTUAABAAAAMYCI4gAAAAAoAAAAAAAAACgAAAAGAbEdAAAADw=='
    }
  })

  let response = await client.get('/Index/StudentSelection.aspx')

  if (!response.headers.location) return res.status(200).json({error: "The supplied password was incorrect or your account is locked for too many incorrect password attempts. Please try again and if you still can't login wait 1 hour before retrying. If the problem persists, please make sure your username and password work on https://intranet.hrsfc.ac.uk/internal/, and if they do contact st137303@hrsfc.ac.uk"})

  const query = response.headers.location.split(/\?(.+)/)[1]

  response = await client.get(`ilp/prosolution/21_3/pstimetable.aspx?${query}`)

  const timetableDom = new jsdom.JSDOM(response.data);

  let periods = Array.from(timetableDom.window.document.querySelectorAll('div.activity,td.normal'));
  let dates = Array.from(timetableDom.window.document.querySelectorAll('th.date')).map(date => [date.textContent, []])

  periods.forEach((period, index) => {
    if(period.tagName == "TD") return;
    dates[index % 5][1].push(new Lesson(period.textContent.split("\n")));
  })

  res.status(200).json({data: dates});
}
