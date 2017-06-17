import * as React from "react"
import { connect } from "react-redux"
import { browserHistory } from "react-router"
import LayerUINav from "./components/LayerUINav"
import { toggleModalState } from "../../redux/modules/app"
import { cloneMapLayer } from "../../redux/modules/maps"

interface LayerUINavContainerRouteParams {
    id: Number
}

export interface LayerUINavContainerProps {
    layerDefinition: LayerUINavContainerRouteParams
    mapId: number
    isMapOwner: boolean
    mapNameURLSafe: string
    mapDefinition: object
    layerId: number
    onCloneLayer: Function
    onDeleteLayer: Function
    geominfo: object
}

export class LayerUINavContainer extends React.Component<LayerUINavContainerProps, undefined> {
    private getGeometryDescription(defn: object, geominfo) {
        return geominfo[defn["schema"] + "." + defn["geometry"]].description
    }

    render() {
        const {
            layerDefinition,
            mapId,
            isMapOwner,
            mapNameURLSafe,
            layerId,
            onCloneLayer,
            onDeleteLayer,
            geominfo,
        } = this.props
        const deleteConfirmModalId = "LayerDeleteConfirmDialog_" + mapId + "_" + layerId

        return (
            <LayerUINav
                defn={layerDefinition}
                layerId={layerId}
                mapId={mapId}
                isMapOwner={isMapOwner}
                mapNameURLSafe={mapNameURLSafe}
                onCloneLayer={() => onCloneLayer(mapId, layerId)}
                onDeleteLayer={() => onDeleteLayer(deleteConfirmModalId)}
                deleteConfirmModalId={deleteConfirmModalId}
                getGeometryDescription={(defn: object) => this.getGeometryDescription(defn, geominfo)}
            />
        )
    }
}

const mapStateToProps = (state: any, ownProps: any) => {
    const { maps, ealgis } = state
    return {
        layerDefinition: ownProps.layerDefinition,
        mapId: ownProps.mapId,
        geominfo: ealgis.geominfo,
    }
}

const mapDispatchToProps = (dispatch: any) => {
    return {
        onCloneLayer: (mapId: number, layerId: number) => {
            dispatch(cloneMapLayer(mapId, layerId))
        },
        onDeleteLayer: (modalId: string) => {
            dispatch(toggleModalState(modalId))
        },
    }
}

const LayerUINavContainerWrapped = connect(mapStateToProps, mapDispatchToProps)(LayerUINavContainer as any)

export default LayerUINavContainerWrapped
