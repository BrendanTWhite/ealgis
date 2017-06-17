import * as React from "react"
import MapUI from "./components/MapUI"
import { connect } from "react-redux"
import { proj } from "openlayers"
import { loadRecords as loadDataInspector } from "../../redux/modules/datainspector"
import { savePosition, setHighlightedFeatures, IPosition } from "../../redux/modules/map"

import "openlayers/css/ol.css"

interface MapContainerRouteParams {
    mapId: Number
}

export interface MapContainerProps {
    dispatch: Function
    params: any
    mapDefinition: MapContainerRouteParams
    position: IPosition
    onSingleClick: Function
    onMoveEnd: Function
}

export class MapContainer extends React.Component<MapContainerProps, undefined> {
    render() {
        const { mapDefinition, position, onSingleClick, onMoveEnd } = this.props

        return (
            <MapUI
                defn={mapDefinition}
                position={position}
                onSingleClick={(evt: any) => onSingleClick(mapDefinition.id, evt)}
                onMoveEnd={onMoveEnd}
            />
        )
    }
}

const mapStateToProps = (state: any, ownProps: any) => {
    const { map, maps } = state

    return {
        mapDefinition: maps[ownProps.params.mapId],
        position: map.position,
    }
}

const mapDispatchToProps = (dispatch: any) => {
    return {
        onSingleClick: (mapId: number, evt: any) => {
            let features: Array<any> = []
            let featurGids: Array<number> = []

            evt.map.forEachFeatureAtPixel(evt.pixel, function(feature: any, layer: any) {
                const layerProps = layer.getProperties().properties
                const featureProps = feature.getProperties()
                delete featureProps.geometry

                features.push({
                    mapId: layerProps["mapId"],
                    layerId: layerProps["layerId"],
                    featureProps: featureProps,
                })

                featurGids.push(featureProps.gid)
            })

            dispatch(setHighlightedFeatures(featurGids))
            dispatch(loadDataInspector(mapId, features))
        },
        onMoveEnd: (event: object) => {
            const view = event.map.getView()

            const position: IPosition = {
                center: proj.transform(view.getCenter(), "EPSG:900913", "EPSG:4326"),
                zoom: view.getZoom(),
                resolution: view.getResolution(),
                extent: view.calculateExtent(event.map.getSize()),
            }
            dispatch(savePosition(position))
        },
    }
}

const MapContainerWrapped = connect(mapStateToProps, mapDispatchToProps)(MapContainer as any)

export default MapContainerWrapped
