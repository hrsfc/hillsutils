import { Component } from 'react';
import { parseCookies, setCookie, destroyCookie } from 'nookies'
import TimeTable from '../components/timetable';
import Login from '../components/login';
import Image from 'next/image';
import Styles from '../styles/TimetablePage.module.css';
import LoginStyles from '../styles/Login.module.css';
import Datetime from 'react-datetime';
import { withRouter } from 'next/router';
import Link from 'next/link';

const TimeTablePageStates = {
    loading: 0,
    login: 1,
    timetable: 2,
}

class TimeTablePage extends Component {
    constructor(props) {
        super(props);
	const cookies = parseCookies();
        this.state = {
            lessons: [],
            state: TimeTablePageStates.loading,
            reason: undefined,
	    date: {weeks: 1, start: null},
	    username: cookies.username,
	    password: cookies.password,
            excludeIL: true
	}
        this.req;
        this.updateTimetable = this.updateTimetable.bind(this);
        this.attemptToLogin = this.attemptToLogin.bind(this);
	this.handleWeeksChange = this.handleWeeksChange.bind(this);
	this.handleDateChange = this.handleDateChange.bind(this);
        this.handleILChange = this.handleILChange.bind(this);
    }
    componentDidMount() {
        let username = this.state.username;
        let password = this.state.password;
        if (username && password) {
            this.updateTimetable(username, password);
        } else {
            console.log("Could not get username & password from cookies, switching to login page")
            this.setState({state: TimeTablePageStates.login});
        }
    }
    componentWillUnmount() {
        if (this.req) this.req.abort();
    }
    attemptToLogin(username, password) {
        this.setState({state: TimeTablePageStates.loading});
        this.updateTimetable(username, password)
    }
    updateTimetable(username, password) {
        if (this.req) this.req.abort();
        this.req = new XMLHttpRequest();
        this.req.onreadystatechange = () => {
            if (this.req.readyState == 4) {
                if (this.req.status == 200) {
                    console.log(`Resp: ${this.req.response}`);
                    let data;
                    try {
                        data = JSON.parse(this.req.response);
                    } catch (e) {
                        return this.setState({state: TimeTablePageStates.login, reason: `Failed to parse server response: ${e}`})
                    }
                    if (data.error) {
                        return this.setState({state: TimeTablePageStates.login, reason: data.error});
                    }
                    this.setState({lessons: data.data, state: TimeTablePageStates.timetable, username: username, password: password});
                    this.req = null;
                    setCookie(
                        null, 'username', username, {
                            maxAge: 30 * 24 * 60 * 60,
                            sameSite: 'None',
                            secure: true
                        }
                    )
                    setCookie(
                        null, 'password', password, {
                            maxAge: 30 * 24 * 60 * 60,
                            sameSite: 'None',
                            secure: true
                        }
                    )
                } else {
                    if (this.req.status == 0) return  // status 0 means cancelled
                    this.setState({state: TimeTablePageStates.login, reason: `Request to server failed with status ${this.req.status}`});
                }
            }
        };
        this.req.open("GET", `/api/timetable?excludeIL=${this.state.excludeIL}&username=${username}&password=${password}&weeks=${this.state.date.weeks}&start=${this.state.date.start ?? new Date().toDateString()}`);
        this.req.send();
    }

    handleWeeksChange(e) {
	e.preventDefault();
	if (e.target.value >= 1 || e.target.value == "") {
	    this.setState(
		state => {
		    return {
			date: {
			    start: state.date.start,
			    weeks: e.target.value
			}
		    }
		}
	    );
	}
    }

    handleDateChange(moment) {
	this.setState(
	    state => {
		return {
		    date: {
			start: moment,
			weeks: state.date.weeks
		    }
		}
	    }
	);
    }

    handleILChange(e) {
//        e.preventDefault();
        this.setState(state => {
            console.log(state.excludeIL)
            return {excludeIL: !state.excludeIL}
        });
    }

    render() {
        return (
		<>
                <div className={Styles.backgroundWave}>
                {(() => {switch (this.state.state) {
		    case TimeTablePageStates.loading:
		    return (
			    <div>
			    Loading...
			    </div>
		    );
		    case TimeTablePageStates.login:
		    return (
			    <Login reason={this.state.reason} attemptToLogin={this.attemptToLogin} />
		    );
		    case TimeTablePageStates.timetable:
		    return (
			    <>
			    <TimeTable lessons={this.state.lessons}/>
			    <div className={LoginStyles.form + " " + Styles.form} >
			    <span className={LoginStyles.inputTypeText}>Start week:</span>
			    <Datetime className={Styles.outer} onChange={this.handleDateChange} value={this.state.date.start ?? new Date()} dateFormat="D / M / Y" timeFormat={false} />
			    <span className={LoginStyles.inputTypeText}>Number of weeks:</span>
			    <input type="number" className={LoginStyles.input + " " + Styles.input} onChange={this.handleWeeksChange} value={this.state.date.weeks} />
			    <span className={LoginStyles.inputTypeText}>Ignore suggested independent study:</span>
			    <input type="checkbox" className={LoginStyles.input + " " + Styles.input} onChange={this.handleILChange} value="excludeIL" checked={this.state.excludeIL} />
			    <button className={LoginStyles.submit + " " + Styles.checkbox} onClick={() => this.updateTimetable(this.state.username, this.state.password)}>Refresh timetable</button>
                <Link href={`${this.props.router.basePath}/api/ical?excludeIL=${this.state.excludeIL}&username=${this.state.username}&password=${this.state.password}&weeks=${this.state.date.weeks}&start=${this.state.date.start ?? new Date().toDateString()}`}><a className={LoginStyles.submit + " " + Styles.submit}>Export as ical</a></Link>
                <Link href={`${this.props.router.basePath}/api/ical?excludeIL=${this.state.excludeIL}&username=${this.state.username}&password=${this.state.password}&weeks=${this.state.date.weeks}`}><a className={LoginStyles.submit + " " + Styles.submit}>Export as rolling ical</a></Link>
			    </div>
			    </>
		    );
		    default:
		    throw "ProgrammerError: TimeTablePageStates is not a valid enum value";
            }})()}
	    </div>
		</>
        );
    }
}

export default withRouter(TimeTablePage);
