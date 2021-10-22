import getTimetable from './timetable';
import { createIcsFileBuilder } from 'ical-toolkit';

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @returns 
 * 
 * This API route takes query parameters specifying username, password, start_date, and number_of_weeks and outputs an ical containing days of the timetable contained within those weeks
 * 
 * The username should be a proportal username for hills road 6th form college, generally these are in the form [a-z]{2}[0-9]{6}, where the letters are the student initials and the numbers are the student ID
 * The password should be the password for the proportal account
 * The start_date should be convertable to a date by new Date(). It should be noted that here weeks start on saturday despite starting on Monday on proportal. This is so that fetching the timetable for saturday does not give you the previous week
 * The number_of_weeks should be a number of weeks that you would like to output after the start date. Putting 1 will only output 1 week, putting 2 will output the selected week and the next week etc. You may only input positive values. It's considered good practice to output only as many weeks as you need. If there is a demand for skipping weeks, please contact st137303@hrsfc.ac.uk and another solution may be implemented
 * 
 * This route does not currently check for errors, and will return an internal error 500 if it finds one
 */

class FakeResTm {
    constructor(resolve) {
        this.promise = resolve;
    }

    status(_) {
        return this;
    }

    json(data) {
        this.promise(data);
    }
}

export default async function handler(req, res) {
    let data = await new Promise((resolve) => {
        getTimetable(req, new FakeResTm(resolve))
    })

    var builder = createIcsFileBuilder();

    builder.calname = 'Hills road 6th form';
    builder.timezone = 'europe/london';
    builder.method = 'REQUEST';

    data.data.forEach(dayInfo => {
        dayInfo[1].forEach(lesson => {
            let date = dayInfo[0].split(" ")[1]
            let [day, month, year] = date.split("/")
            
            console.log(date)
            console.log(lesson.start)
            
            let [start_hours, start_minutes] = lesson.start.split(":")
            let [end_hours, end_minutes] = lesson.end.split(":")
            let teacher_names = lesson.teacher.split(" ");
            
            year = "20" + year
            month = parseInt(month) - 1
            start_hours = parseInt(start_hours)
            end_hours = parseInt(end_hours)

            console.log(start_hours)
            console.log(new Date(year, month, day, start_hours, start_minutes).toUTCString())
            
            builder.events.push({
                start: new Date(year, month, day, start_hours, start_minutes),
                end: new Date(year, month, day, end_hours, end_minutes),
                transp: 'OPAQUE',
                summary: lesson.class,
                alarms: [15, 10, 5], 
                location: lesson.room,
                description: `${lesson.class} with ${lesson.teacher}`,

                organizer: {
                    name: lesson.teacher,
                    email: `${teacher_names[0][0]}${teacher_names[-1]}@hillsroad.ac.uk`.toLowerCase(),
                    sentBy: 'absence@hillsroad.ac.uk' //OPTIONAL email address of the person who is acting on behalf of organizer.
                },

                method: 'PUBLISH',
                status: 'CONFIRMED',

                url: 'https://hillsutils.clicksminuteper.net/timetable'
            });        
        })
    })


    var icsFileContent = builder.toString();

    res.setHeader("Content-Type", "text/calendar");
    res.status(200).send(icsFileContent);
}
