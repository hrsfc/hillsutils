import axios from 'axios';
import axiosCookieJarSupport from 'axios-cookiejar-support';
import { NtlmClient } from 'axios-ntlm';
import { CookieJar } from 'tough-cookie';
import dateFormat from 'dateformat';
import * as jsdom from 'jsdom';

// Longer subject codes should *always* be first
const subjects = {
  "ENR": "Enrichment",
  "MT": "Music Technology",
  "SP": "Spanish",
  "MF": "Maths",
  "CG": "Computer Science",
  "TU": "Tutorial",
  "FP": "Future-ready Program",
  "EP": "Extended Project",
  "PH": "Physics",
  "BS": "Business Studies",
  "IL": "Suggested learning time",
};

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
    this.independent = this.class.startsWith("IL");

    if (this.independent) {
      this.teacher = "no teacher";
    }
    for (const [code, subject] of Object.entries(subjects)) {
      if (this.class.startsWith(code)) {
        this.class = subject;
        break;
      }
    }
  }
}

function getHUWeekStart(date) {
  let day = date.getDay();
  date.setDate(date.getDate() - day + (day == 6 ? 8 : 1))
  date.setHours(0);
  date.setMinutes(0);
  date.setSeconds(0);
  return date;
}

function getPPWeekStart(date) {
  let day = date.getDay();
  date.setDate(date.getDate() - day + (day == 0 ? -6 : 1))
  date.setHours(0);
  date.setMinutes(0);
  date.setSeconds(0);
  return date;
}

function getDates(start, weeks) {
  const number_of_weeks = weeks - 1;
  if (number_of_weeks < 0) throw "Error: Weeks was not positive";
  start = getHUWeekStart(start);

  // if (number_of_weeks < 0) return res.status(200).json({error: "The number_of_weeks to return *must* be positive"});

  const dates = [start];

  for (var i = 0; i < number_of_weeks; i++) {
    let date = new Date(dates[dates.length - 1])
    date.setDate(date.getDate() + 7)
    dates.push(date);
  }
  
  return dates;
}

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @returns 
 * 
 * This API route takes query parameters specifying username, password, start_date, and number_of_weeks and outputs a JSON containing days of the timetable contained within those weeks
 * 
 * The username should be a proportal username for hills road 6th form college, generally these are in the form [a-z]{2}[0-9]{6}, where the letters are the student initials and the numbers are the student ID
 * The password should be the password for the proportal account
 * The start_date should be convertable to a date by new Date(). It should be noted that here weeks start on saturday despite starting on Monday on proportal. This is so that fetching the timetable for saturday does not give you the previous week
 * The number_of_weeks should be a number of weeks that you would like to output after the start date. Putting 1 will only output 1 week, putting 2 will output the selected week and the next week etc. You may only input positive values. It's considered good practice to output only as many weeks as you need. If there is a demand for skipping weeks, please contact st137303@hrsfc.ac.uk and another solution may be implemented
 * The excludeIL should be a boolean, denoting if independent learning periods should be excluded. The default is false
 *
 * The JSON is in the format
 * {"data":[["Mon 13/09/21", [{"teacher":"Maya Marty","room":"M204","start":"09:00","end":"10:05","class":"TU1-Esa"}, ...], ...]}
 * 
 * If there is an error, the JSON will not have a 'data' key and will instead have an 'error' key like so
 * {"error": "This is a generic error message!"}
 * The error message is generally not so technical that it should not be shown to the user, although you may wish to add extra details such as your contact information when displaying it
 */
export default async function handler(req, res) {
    let number_of_weeks = parseInt(req.query.weeks);
    number_of_weeks = number_of_weeks == NaN ? 1 : number_of_weeks;
    number_of_weeks = number_of_weeks < 1 ? 1 : number_of_weeks;

    let excludeIL = (req.query.excludeIL != "false");

    let start = new Date(req.query.start);
    start = start == "Invalid Date" ? new Date() : start;

    let weeks = getDates(start, number_of_weeks);
    let currentWeek = getPPWeekStart(new Date());

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

    /*  await client.get('/Index/StudentSelection.aspx', {
	jar: cookieJar,
	withCredentials: true,
	})*/  // I initially thought this request was needed; it doesn't appear to be. 
    await client.get('/Index/StudentSelection.aspx', {
	jar: cookieJar,
	withCredentials: true,
	headers: {
	    'Authorization': 'NTLM TlRMTVNTUAABAAAAMYCI4gAAAAAoAAAAAAAAACgAAAAGAbEdAAAADw=='
	}
    })


	       let response = await client.get('/Index/StudentSelection.aspx')
	       // This one is though :cries:

	       if (!response.headers.location) return res.status(200).json({error: "The supplied password was incorrect or your account is locked for too many incorrect password attempts. Please try again and if you still can't login wait 1 hour before retrying. If the problem persists, please make sure your username and password work on https://intranet.hrsfc.ac.uk/internal/, and if they do contact st137303@hrsfc.ac.uk"})

	       const query = response.headers.location.split(/\?(.+)/)[1]

	       response = await client.get(`ilp/prosolution/21_3/pstimetable.aspx?${query}`)
	       const initialResponse = response;

  /*, data, {
    headers: { 
      "Content-Type": "application/x-www-form-urlencoded"
    }
  })*/
  let allDates = [];
  for (let week of weeks) {
    let timetableDom = new jsdom.JSDOM(response.data);

    const form = timetableDom.window.document.querySelector('form#form1');
    
    const formData = new timetableDom.window.FormData(form);
    formData.set("ctl00$ctl00$ctl00$ctl00$Content$Content$Content$MainContent$calWeekBeginning", dateFormat(week, "dd/mm/yyyy"))
    formData.set("ctl00$ctl00$ctl00$ctl00$Content$Content$Content$MainContent$btnView", "Refresh")  // Note: we don't know where this is set on the actual client application, please investigate if this doesn't start working quickly
    formData.set("__EVENTTARGET", "")  // Note: we don't know where this is set on the actual client application, please investigate if this doesn't start working quickly
    formData.set("__EVENTARGUMENT", "")  // Note: we don't know where this is set on the actual client application, please investigate if this doesn't start working quickly
    formData.set("__LASTFOCUS", "")  // Note: we don't know where this is set on the actual client application, please investigate if this doesn't start working quickly
    formData.set("__SCROLLPOSITIONX", "0")  // Note: we don't know where this is set on the actual client application, please investigate if this doesn't start working quickly
    formData.set("__SCROLLPOSITIONY", "0")  // Note: we don't know where this is set on the actual client application, please investigate if this doesn't start working quickly
    // Note: it started working so I'm going to leave further investigation & reverse engineering out of the question for now. If it stops returning custom date ranges, this may be something we should investigate

    if (currentWeek.getDate() === week.getDate()) {
      response = initialResponse;
      //console.log("Optimisation successful (using current week instead of week)")
    } else {
      response = await client.post(`ilp/prosolution/21_3/pstimetable.aspx?${query}`, new URLSearchParams(formData), {headers: {'Content-Type': 'application/x-www-form-urlencoded'}})
    }

    timetableDom = new jsdom.JSDOM(response.data);

    let periods = Array.from(timetableDom.window.document.querySelectorAll('div.activity,td.normal'));
    let dates = Array.from(timetableDom.window.document.querySelectorAll('th.date')).map(date => [date.textContent, []])

    periods.forEach((period, index) => {
      if(period.tagName == "TD") return;
      let lesson = new Lesson(period.textContent.split("\n"));
      if (excludeIL && lesson.independent) return;
      dates[index % 5][1].push(lesson);
    })

    allDates = allDates.concat(dates);
  };

  res.status(200).json({data: allDates});
}
