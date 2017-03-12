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
    render() {
        const { mapDefinition } = this.props
        return <MapUI defn={mapDefinition} />;
    }
}

const mapStateToProps = (state: any, ownProps: any) => {
    const { map_definition, maps } = state
    return {
        mapDefinition: maps[ownProps.params.mapId]
    }
}

const MapContainerWrapped = connect(
    mapStateToProps
)(MapContainer)

export default MapContainerWrapped