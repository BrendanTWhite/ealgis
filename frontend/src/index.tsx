import * as React from "react";
import * as ReactDOM from "react-dom";
import { compose, combineReducers, createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import { Router, Route, IndexRoute, browserHistory } from 'react-router';
import { syncHistoryWithStore, routerReducer } from 'react-router-redux';
import thunkMiddleware from 'redux-thunk'

import * as injectTapEventPlugin from 'react-tap-event-plugin';
injectTapEventPlugin();

import reducers from './reducers/index';
import { reduxFormReducer } from './reducers/index';
import EalUIContainerWrapped from "./components/EalUIContainer";
import MapUIContainerWrapped from "./components/MapUIContainer";
import MapUINavContainerWrapped from "./components/MapUINavContainer";
import LayerFormContainerWrapped from "./components/LayerFormContainer";
import MapFormContainerWrapped from "./components/MapFormContainer";
import MapList from "./components/MapList";
import About from "./components/About";

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const store = createStore(
    combineReducers({
        ...reducers,
        routing: routerReducer,
        form: reduxFormReducer,
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
                <Route path="map/:mapId/:mapName" components={{ content: MapUIContainerWrapped, sidebar: MapUINavContainerWrapped }}/>
                <Route path="map/:mapId/:mapName/edit" components={{ content: MapUIContainerWrapped, sidebar: MapFormContainerWrapped }}/>
                <Route path="map/:mapId/:mapName/layer(/:layerId)(/:tabName)" components={{ content: MapUIContainerWrapped, sidebar: LayerFormContainerWrapped }}/>
                <Route path="new/map/" components={{ content: MapUIContainerWrapped, sidebar: MapFormContainerWrapped }}/>
                <Route path="about" components={{ content: About }} />
                <IndexRoute components={{ content: MapUIContainerWrapped, sidebar: MapList }}/>
            </Route>
        </Router>
    </Provider>,
    document.getElementById("ealgis")
);
