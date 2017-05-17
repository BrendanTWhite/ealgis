import * as React from "react";
import { Link } from 'react-router';
import AppBar from 'material-ui/AppBar';
import Snackbar from 'material-ui/Snackbar';
import { ToolbarGroup } from 'material-ui/Toolbar';
import FlatButton from 'material-ui/FlatButton';
import IconMenu from 'material-ui/IconMenu';
import MenuItem from 'material-ui/MenuItem';
import IconButton from 'material-ui/IconButton';
import LinearProgress from 'material-ui/LinearProgress';
import {cyanA400} from 'material-ui/styles/colors';
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';
import Toggle from 'material-ui/Toggle';
import { LoginDialog } from './LoginDialog';

export interface EalUISnackbarNotificationProps {
    message: string,
    key: string,
    action: string,
    autoHideDuration: number,
    onActionTouchTap: any,
}

export interface EalUISnackbarProps {
    open: boolean,
    active: EalUISnackbarNotificationProps,
    messages: Array<EalUISnackbarNotificationProps>,
}

export interface EalUIAppProps {
    loading: boolean,
    sidebarOpen: boolean,
    snackbar: EalUISnackbarProps,
}

export interface EalUIProps {
    app: EalUIAppProps,
    user: any,
    sidebar: any,
    content: any,
    onTapAppBarLeft: any,
    handleRequestClose: any,
    doLogout: Function,
    onDebugToggle: any,
}

const appBarButtonStyle = {
    "color": "#ffffff",
    "margin": "4px 0px",
}

export class EalUI extends React.Component<EalUIProps, undefined> {
    render() {
        const { app, user, content, sidebar, onTapAppBarLeft, handleRequestClose, doLogout, onDebugToggle } = this.props

        const linearProgressStyle = {
            "position": "fixed",
            "top": "0px",
            "zIndex": 1200,
            "display": app.requestsInProgress > 0 ? "block": "none",
        }

        return <div className="page">
            <div className="page-header">
                <LinearProgress mode="indeterminate" color={cyanA400} style={linearProgressStyle} />
                <AppBar 
                    title={user.username}
                    onLeftIconButtonTouchTap={onTapAppBarLeft}
                    iconElementRight={<ToolbarGroup>
                        <FlatButton label="Home" containerElement={<Link to={"/"} />} style={appBarButtonStyle} />
                        <FlatButton label="About" containerElement={<Link to={"/about"} />} style={appBarButtonStyle} />
                        <FlatButton label="Logout" onClick={doLogout} style={appBarButtonStyle} />
                        {user.is_staff ? 
                            <IconMenu
                                iconButtonElement={<IconButton><MoreVertIcon color={"white"} /></IconButton>}
                                anchorOrigin={{horizontal: 'left', vertical: 'top'}}
                                targetOrigin={{horizontal: 'left', vertical: 'top'}}
                            >
                                <MenuItem>
                                    <Toggle
                                        label="Debug"
                                        toggled={app.debug}
                                        onToggle={onDebugToggle}
                                    />
                                </MenuItem>
                            </IconMenu>
                            :
                            <div></div>}
                    </ToolbarGroup>}
                />
            </div>
            <div className="page-content" style={{"display": app.sidebarOpen ? "flex" : "block"}}>
                <LoginDialog open={user.url === null} />
                <main className="page-main-content">
                    {content || this.props.children}
                </main>
                <nav className="page-nav" style={{"display": app.sidebarOpen ? "" : "none"}}>
                    {sidebar || <div></div>}
                </nav>
            </div>
            <Snackbar
                open={app.snackbar.open}
                message={app.snackbar.active.message}
                action={app.snackbar.active.action}
                autoHideDuration={app.snackbar.active.autoHideDuration}
                onActionTouchTap={() => app.snackbar.active.onActionTouchTap()}
                onRequestClose={handleRequestClose}
            />
        </div>
    }
}

export default EalUI