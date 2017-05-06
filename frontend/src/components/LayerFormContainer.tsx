import * as React from "react";
import { connect } from 'react-redux';
import { formValueSelector, isDirty, submit, change } from 'redux-form';
import { withRouter } from 'react-router';
import * as debounce from "lodash/debounce";
import LayerForm from "./LayerForm";
import { layerUpsert, handleLayerFormChange, toggleModalState } from '../actions'

export interface LayerDefinitionProps {
    borderSize: number,
    fillColourSchemeLevels: number,
    fillOpacity: number,
    scaleMin: number,
    scaleMax: number,
    fillColourScheme: string,
    borderColour: object,
}

export interface LayerFormContainerProps {
    mapDefinition: object,
    layerId: string,
    tabId: string,
    layerDefinition: LayerDefinitionProps,
    originalLayerDefinition: LayerDefinitionProps,
    datainfo: object,
    colourinfo: object,
    onSubmit: Function,
    onFieldUpdate: Function,
    fillColourScheme: string,
    layerGeometry: object,
    onDiscardForm: Function,
    onSaveForm: Function,
    onToggleDirtyFormModalState: Function,
    dirtyFormModalOpen: boolean,
    isDirty: boolean,
}

export class LayerFormContainer extends React.Component<LayerFormContainerProps, undefined> {
    public static defaultProps: Partial<LayerFormContainerProps> = {
        layerDefinition: {
            "borderSize": 1,
            "fillColourSchemeLevels": 6,
            "fillOpacity": 0.5,
            "scaleMin": 0,
            "scaleMax": 100,
            "fillColourScheme": "Huey",
            "borderColour": {
                r: '51',
                g: '105',
                b: '30',
                a: '1',
            }
        }
    }

    private deriveLayerFormValuesFromLayer = function(layer: object, datainfo: object) {
        return {
            "fillOpacity": layer["fill"]["opacity"],
            "scaleMin": layer["fill"]["scale_min"],
            "scaleMax": layer["fill"]["scale_max"],
            "valueExpression": layer["fill"]["expression"],
            "fillColourScaleFlip": layer["fill"]["scale_flip"],
            "fillColourScheme": layer["fill"]["scale_name"],
            "filterExpression": layer["fill"]["conditional"],
            "fillColourSchemeLevels": layer["fill"]["scale_nlevels"],
            "borderSize": layer["line"]["width"],
            "borderColour": layer["line"]["colour"],
            "name": layer["name"],
            "description": layer["description"],
            "geometry": datainfo[layer["schema"] + "." + layer["geometry"]],
        }
    }

    private static deriveLayerFromLayerFormValues(formValues: Array<undefined>) {
        return {
            "fill": {
                "opacity": formValues["fillOpacity"],
                "scale_max": formValues["scaleMax"],
                "scale_min": formValues["scaleMin"],
                "expression": formValues["valueExpression"] ? formValues["valueExpression"] : "",
                "scale_flip": formValues["fillColourScaleFlip"] ? formValues["fillColourScaleFlip"] : false,
                "scale_name": formValues["fillColourScheme"],
                "conditional": formValues["filterExpression"] ? formValues["filterExpression"] : "",
                "scale_nlevels": formValues["fillColourSchemeLevels"],
            },
            "line": {
                "width": formValues["borderSize"],
                "colour": formValues["borderColour"],
            },
            "name": formValues["name"],
            "type": formValues["geometry"]["geometry_type"],
            "schema": formValues["geometry"]["schema_name"],
            "visible": true, // New layers are always visible
            "geometry": formValues["geometry"]["name"],
            "description": formValues["description"],
        }
    }

    componentWillMount() {
        const { onFieldUpdate } = this.props
        
        // http://stackoverflow.com/a/24679479/7368493
        this.onFieldChangeDebounced = debounce(function(fieldName: string, newValue: any, mapId: number, layerId: number) {
            onFieldUpdate(fieldName, newValue, mapId, layerId)
        }, 500);

        this.props.router.setRouteLeaveHook(
            this.props.route,
            this.routerWillLeave.bind(this)
        )
    }

    routerWillLeave(nextLocation: object) {
        const { isDirty, onToggleDirtyFormModalState } = this.props

        // return false to prevent a transition w/o prompting the user,
        // or return a string to allow the user to decide:
        if(isDirty) {
            onToggleDirtyFormModalState()
            // return 'Your layer is not saved! Are you sure you want to leave?'
            return false
        }
    }

    shouldComponentUpdate(nextProps: any, nextState: any) {
        const { mapDefinition, layerId, layerDefinition, fillColourScheme, dirtyFormModalOpen } = this.props

        
        if(mapDefinition.id != nextProps.mapDefinition.id || layerId != nextProps.layerId || layerDefinition.hash != nextProps.layerDefinition.hash || fillColourScheme != nextProps.fillColourScheme || dirtyFormModalOpen != nextProps.dirtyFormModalOpen) {
            this.originalLayerDefinition = JSON.parse(JSON.stringify(layerDefinition))
            return true
        }
        return false
    }

    render() {
        const { layerId, tabId, mapDefinition, layerDefinition, onSubmit, onFieldUpdate, datainfo, colourinfo, fillColourScheme, onDiscardForm, onSaveForm, dirtyFormModalOpen, isDirty, onClickApplyScale, layerGeometry } = this.props

        // Initiable values either comes from defaultProps (creating a new layer)
        // or from our layerDef (editing an existing layer)
        let initialValues = JSON.parse(JSON.stringify(layerDefinition))
        if(parseInt(layerId) > 0) {
            initialValues = this.deriveLayerFormValuesFromLayer(layerDefinition, datainfo)
        }

        return <LayerForm 
            mapId={mapDefinition.id} 
            layerId={layerId}
            layerHash={layerDefinition.hash}
            tabId={tabId}
            initialValues={initialValues}
            fillColourScheme={fillColourScheme}
            layerGeometry={layerGeometry}
            onSubmit={
                (formValues: Array<undefined>) => 
                    onSubmit(mapDefinition, layerId, LayerFormContainer.deriveLayerFromLayerFormValues(formValues))
            }
            onFieldBlur={
                (fieldName: string, newValue: any) => 
                    onFieldUpdate(fieldName, newValue, mapDefinition.id, layerId)
            }
            onFieldChange={
                (fieldName: string, newValue: any) => 
                    this.onFieldChangeDebounced(fieldName, newValue, mapDefinition.id, layerId)
            }
            onClickApplyScale={
                (stats: object) => onClickApplyScale(mapDefinition.id, layerId, stats)
            }
            datainfo={datainfo} 
            colourinfo={colourinfo}
            onDiscardForm={() => onDiscardForm()}
            onSaveForm={() => onSaveForm()}
            dirtyFormModalOpen={dirtyFormModalOpen}
            isDirty={isDirty}
        />;
    }
}

const mapStateToProps = (state: any, ownProps: any) => {
    const { app, maps, datainfo, colourinfo } = state

    const layerFormValues = formValueSelector("layerForm")

    return {
        mapDefinition: maps[ownProps.params.mapId],
        layerId: ownProps.params.layerId,
        tabId: ownProps.params.tabId,
        layerDefinition: maps[ownProps.params.mapId].json.layers[ownProps.params.layerId],
        datainfo: datainfo,
        colourinfo: colourinfo,
        fillColourScheme: layerFormValues(state, "fillColourScheme"),
        layerGeometry: layerFormValues(state, "geometry"),
        dirtyFormModalOpen: app.dialogs["dirtyLayerForm"] || false,
        isDirty: isDirty("layerForm")(state),
    }
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    onSubmit: (mapDefinition: object, layerId: number, layer: object) => {
        console.log("onSubmit", layer)
        dispatch(layerUpsert(mapDefinition, layerId, layer))
    },
    onFieldUpdate: (fieldName: string, newValue: any, mapId: number, layerId: number) => {
        dispatch(handleLayerFormChange(fieldName, newValue, mapId, layerId))
    },
    onToggleDirtyFormModalState: () => {
        dispatch(toggleModalState("dirtyLayerForm"))
    },
    onDiscardForm: () => {
        // @TODO Implement
        // @TODO Navigate to /map/150/
        // dispatch(toggleModalState("dirtyLayerForm"))
    },
    onSaveForm: () => {
        // @TOOD Navigate to /map/150/
        console.log("onSaveForm")
        dispatch(submit("layerForm"))
        dispatch(toggleModalState("dirtyLayerForm"))
    },
    onClickApplyScale: (mapId: number, layerId: number, stats: object) => {
        dispatch(change("layerForm", "scaleMin", stats.min))
        dispatch(change("layerForm", "scaleMax", stats.max))
        
        // Race condition?
        // https://github.com/erikras/redux-form/issues/1366
        setTimeout(() => dispatch(submit("layerForm")))
    }
  };
}

const LayerFormContainerWrapped = connect(
    mapStateToProps,
    mapDispatchToProps
)(LayerFormContainer as any)

export default withRouter(LayerFormContainerWrapped)