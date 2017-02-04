import * as React from "react";
import MapUI from "./MapUI";
import { connect } from 'react-redux';
import { fetchMapDefinition } from '../actions';

import 'openlayers/css/ol.css';

interface MapContainerRouteParams {
    mapId: Number
}

export interface MapContainerProps {
    dispatch: Function,
    params: any,
    mapDefinition: MapContainerRouteParams,
}

export class MapContainer extends React.Component<MapContainerProps, undefined> {
    componentDidMount() {
        const { dispatch, params } = this.props
        if(params.mapId !== undefined) {
            dispatch(fetchMapDefinition(params.mapId))
        }
    }

    render() {
        const { mapDefinition } = this.props
        return <MapUI defn={mapDefinition} />;
    }
}

const mapStateToProps = (state: any) => {
    const { map_definition } = state
    return {
        mapDefinition: map_definition
    }
}

const MapContainerWrapped = connect(
    mapStateToProps
)(MapContainer)

export default MapContainerWrapped