import { Component } from 'react';
import Styles from '../styles/Timetable.module.css';

class TimeTable extends Component {
    render () {
        console.log(this.props.lessons);
        return (
            <div className={Styles.timetable}>
                {this.props.lessons.map((day, index) => {
                    return <div className={Styles.day} key={index}>
                        <div className={Styles.dayHeader}>{day[0]}</div>
                        <div className={Styles.times}>
                            {
                                (() => {
                                    let periods = day[1];

                                    periods.push(
                                        {room: "Break", start: "10:05", end: "10:20", class: "Break"},
                                    );

                                    periods.push(
                                        {room: "Break", start: "12:40", end:"13:40", class: "Lunch"}
                                    )

                                    const convertTime = time => {
                                        time = time.split(":")
                                        return parseInt(time[0]) * 60 + parseInt(time[1])
                                    }

                                    periods = periods.sort((a, b) => convertTime(a["start"]) - convertTime(b["start"]))

                                    // The magic number 1.5 comes from the number of pixels that are used for each minute in the day
                                    let position = 540 * 1.5; // The timetable starts at 9am, or 540 minutes after the start of the day
                                    return periods.map((lesson, index) => {
                                        let start = convertTime(lesson["start"])
                                        let end = convertTime(lesson["end"])

                                        let length = (end - start) * 1.5 - 3
                                        position += length;

                                        return lesson["room"] == "Break" ? (
                                            <div key={index} className={Styles.break} style={{top: `${start * 1.5 + length - position}px`, height: `${length}px`}}>
                                                <span>
                                                    {lesson["class"]}
                                                </span>
                                            </div>)
                                        : (
                                            <div key={index} className={Styles.lesson} style={{top: `${start * 1.5 + length - position}px`, height: `${length}px`}}>
                                                <span>
                                                    {lesson["class"]}<br/>
                                                    {lesson["teacher"]}<br/>
                                                    {`${lesson["start"]} to ${lesson["end"]} in ${lesson["room"]}`}
                                                </span>
                                            </div>
                                        )
                                    })
                                })()
                            }
                        </div>
                    </div>
                })}
            </div>
        )
    }
}

export default TimeTable;