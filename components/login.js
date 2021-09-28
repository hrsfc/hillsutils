import { Component } from "react";
import Styles from "../styles/Login.module.css";

class Login extends Component {
    constructor(props) {
        super(props);
        this.state = {username: "", password: ""};
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleChange(field) {
        return (event) => {
            if (this.frozen) return;
            let modifier = {};

            modifier[field] = event.target.value;

            this.setState(modifier);
        }
    }

    handleSubmit(event) {
        event.preventDefault();
        if (this.frozen) return;
        this.frozen = true;
        this.props.attemptToLogin(this.state.username, this.state.password);
    }

    render () {
        return (
            <form className={Styles.form} onSubmit={this.handleSubmit}>
                {this.props.reason}<br/>
                Username: <input className={Styles.input} type='text' value={this.state.username} onChange={this.handleChange('username')}/><br/>
                Password: <input className={Styles.input} type='password' value={this.state.password} onChange={this.handleChange('password')}/><br/>
                <button className={Styles.submit} type='submit'>Login</button>
            </form>
        );
    }
}

export default Login;