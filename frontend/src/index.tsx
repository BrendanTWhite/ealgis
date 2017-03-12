import * as React from "react";
import * as ReactDOM from "react-dom";
import { compose, combineReducers, createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import { Router, Route, IndexRoute, browserHistory } from 'react-router';
import { syncHistoryWithStore, routerReducer } from 'react-router-redux';
import thunkMiddleware from 'redux-thunk'

import { reducer as formReducer } from 'redux-form'

import * as injectTapEventPlugin from 'react-tap-event-plugin';
injectTapEventPlugin();

import reducers from './reducers/index';
import EalUIContainerWrapped from "./components/EalUIContainer";
import MapUIContainerWrapped from "./components/MapUIContainer";
import MapUINavContainerWrapped from "./components/MapUINavContainer";
import CreateMapContainerWrapped from "./components/CreateMapContainer";
import MapList from "./components/MapList";

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const store = createStore(
    combineReducers({
        ...reducers,
        routing: routerReducer,
        form: formReducer
    }),
    composeEnhancers(applyMiddleware(
        thunkMiddleware
    ))
);

const history = syncHistoryWithStore(browserHistory, store);

ReactDOM.render(
    <Provider store={store}>
        <Router history={history}>
            <Route path="/" component={EalUIContainerWrapped}>
                <Route path="map/:mapId" components={{ content: MapUIContainerWrapped, sidebar: MapUINavContainerWrapped }}/>
                <Route path="new/map/" components={{ content: MapUIContainerWrapped, sidebar: CreateMapContainerWrapped }}/>
                <IndexRoute components={{ content: MapList }}/>
            </Route>
        </Router>
    </Provider>,
    document.getElementById("ealgis")
);
