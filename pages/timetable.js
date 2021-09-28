import { Component } from 'react';
import { parseCookies, setCookie, destroyCookie } from 'nookies'
import TimeTable from '../components/timetable';
import Login from '../components/login';

const TimeTablePageStates = {
    loading: 0,
    login: 1,
    timetable: 2,
}

class TimeTablePage extends Component {
    constructor(props) {
        super(props);
        this.state = {
            lessons: [],
            state: TimeTablePageStates.loading,
            reason: undefined
        }
        this.req;
        this.updateTimetable = this.updateTimetable.bind(this);
        this.attemptToLogin = this.attemptToLogin.bind(this);
    }
    componentDidMount() {
        const cookies = parseCookies();
        let username = cookies.username;
        let password = cookies.password;
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
                    this.setState({lessons: data.data, state: TimeTablePageStates.timetable});
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
                    this.setState({state: TimeTablePageStates.login, reason: `Request to server failed with status ${this.req.status}`});
                }
            }
        };
        this.req.open("GET", `/api/timetable?username=${username}&password=${password}`);
        this.req.send();
    }
    render() {
        switch (this.state.state) {
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
                    <TimeTable lessons={this.state.lessons}/>
                );
            default:
                throw "ProgrammerError: TimeTablePageStates is not a valid enum value";
        }
    }
}

export default TimeTablePage;