import * as React from "react";
import { connect } from 'react-redux';
import { formValueSelector, getFormValues, isDirty, initialize, submit, change } from 'redux-form';
import { withRouter } from 'react-router';
import * as debounce from "lodash/debounce";
import LayerForm from "./LayerForm";
import { initDraftLayer, editDraftLayer, publishLayer, restoreMasterLayer, restoreMasterLayerAndDiscardForm, handleLayerFormChange, toggleModalState } from '../actions'

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
    layerId: number,
    tabId: string,
    layerDefinition: LayerDefinitionProps,
    datainfo: object,
    colourinfo: object,
    startLayerEditSession: Function,
    onSubmit: Function,
    onFieldUpdate: Function,
    layerFillColourScheme: string,
    layerGeometry: object,
    onSaveForm: Function,
    onResetForm: Function,
    onModalSaveForm: Function,
    onModalDiscardForm: Function,
    onToggleDirtyFormModalState: Function,
    dirtyFormModalOpen: boolean,
    isDirty: boolean,
    onFitScaleToData: Function,
}

const getLayerFormValuesFromLayer = (layer: object, datainfo: object) => {
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
        "geometry": JSON.stringify(datainfo[layer["schema"] + "." + layer["geometry"]]),
    }
}

const getLayerFromLayerFormValues = (formValues: object) => {
    const geometry = JSON.parse(formValues["geometry"])
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
        "type": geometry["geometry_type"],
        "schema": geometry["schema_name"],
        "visible": true,
        "geometry": geometry["name"],
        "description": formValues["description"],
    }
}

const mapLayerFormFieldNameToLayerProp = (fieldName: any) => {
    switch(fieldName) {
        case "fillOpacity": return "opacity"
        case "scaleMax": return "scale_max"
        case "scaleMin": return "scale_min"
        case "valueExpression": return "expression"
        case "fillColourScaleFlip": return "scale_flip"
        case "fillColourScheme": return "scale_name"
        case "filterExpression": return "conditional"
        case "fillColourSchemeLevels": return "scale_nlevels"
        case "borderSize": return "width"
        case "borderColour": return "colour"
        default: return fieldName
    }
}

const mapLayerFormValuesToLayer = (layer: object, fieldName: any, fieldValue: any) => {
    const layerPropName = mapLayerFormFieldNameToLayerProp(fieldName)

    switch(fieldName) {
        case "fillOpacity":
        case "scaleMax":
        case "scaleMin":
        case "valueExpression":
        case "fillColourScaleFlip":
        case "fillColourScheme":
        case "filterExpression":
        case "fillColourSchemeLevels":
            if(layer["fill"] === undefined) {
                layer["fill"] = {}
            }
            layer["fill"][layerPropName] = fieldValue
            break;
        
        case "borderSize":
        case "borderColour":
            if(layer["line"] === undefined) {
                layer["line"] = {}
            }
            layer["line"][layerPropName] = fieldValue
            break;
        
        case "geometry":
            const geometry = JSON.parse(fieldValue)
            layer["type"] = geometry["geometry_type"]
            layer["schema"] = geometry["schema_name"]
            layer["geometry"] = geometry["name"]
            break;
        
        default:
            layer[layerPropName] = fieldValue
    }
    return layer
}

const getLayerFromLayerFormValuesPartial = (formValues: object) => {
    let layer = {}
    for(let fieldName in formValues) {
        const fieldValue = formValues[fieldName]
        layer = mapLayerFormValuesToLayer(layer, fieldName, fieldValue)
    }
    return layer
}

export class LayerFormContainer extends React.Component<LayerFormContainerProps, undefined> {
    constructor(props: LayerFormContainerProps) {
        super(props)
        const { onFieldUpdate } = props
        
        // http://stackoverflow.com/a/24679479/7368493
        this.onFieldChangeDebounced = debounce(function(fieldName: string, newValue: any, mapId: number, layerId: number) {
            onFieldUpdate(fieldName, newValue, mapId, layerId)
        }, 500);

        props.router.setRouteLeaveHook(
            props.route,
            this.routerWillLeave.bind(this)
        )
    }

    componentWillMount() {
        const { mapDefinition, layerId, startLayerEditSession } = this.props
        
        // Start a new layer edit session whenever the form is initialised.
        // This happens for each layer
        startLayerEditSession(mapDefinition.id, layerId)
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
        const { mapDefinition, layerId, layerFillColourScheme, layerGeometry, dirtyFormModalOpen } = this.props
        console.log("shouldComponentUpdate?")

        // Re-render LayerForm if...

        // We've changed the map or layer we're looking at
        if(mapDefinition.id != nextProps.mapDefinition.id || layerId != nextProps.layerId) {
            console.log("Re-render because this is a different map or layer")
            return true
        }

        if(layerFillColourScheme !== nextProps.layerFillColourScheme || layerGeometry !== nextProps.layerGeometry) {
            console.log("Re-render because layerFillColourScheme/geometry changed")
            return true
        }

        // We need to open or close the dirty form modal
        if(dirtyFormModalOpen != nextProps.dirtyFormModalOpen) {
            console.log("Re-render because we need to open the modal")
            return true
        }
        console.log("Skip updating")
        return false
    }

    render() {
        const { layerId, tabId, mapDefinition, layerDefinition, onSubmit, onFieldUpdate, datainfo, colourinfo, onSaveForm, onResetForm, onModalSaveForm, onModalDiscardForm, dirtyFormModalOpen, isDirty, onFitScaleToData, layerFillColourScheme, layerGeometry } = this.props

        const initialValues = JSON.parse(JSON.stringify(getLayerFormValuesFromLayer(layerDefinition, datainfo)))

        return <LayerForm 
            tabId={tabId}
            mapId={mapDefinition.id} 
            layerId={layerId}
            layerHash={layerDefinition.hash}
            initialValues={initialValues}
            layerFillColourScheme={layerFillColourScheme}
            layerGeometry={layerGeometry}
            onSubmit={
                (formValues: Array<any>) => 
                    onSubmit(mapDefinition.id, layerId, formValues)
            }
            onFieldBlur={
                (fieldName: string, newValue: any, previousValue: any) => 
                    onFieldUpdate(fieldName, newValue, mapDefinition.id, layerId)
            }
            onFieldChange={
                (fieldName: string, newValue: any) => 
                    this.onFieldChangeDebounced(fieldName, newValue, mapDefinition.id, layerId)
            }
            onFitScaleToData={
                (stats: object) => 
                    onFitScaleToData(mapDefinition.id, layerId, stats)
            }
            onSaveForm={
                () => 
                    onSaveForm(mapDefinition.id, layerId)}
            onResetForm={
                () => 
                    onResetForm(mapDefinition.id, layerId, initialValues)}
            onModalSaveForm={
                () => 
                    onModalSaveForm(mapDefinition.id, layerId)}
            onModalDiscardForm={
                () => 
                    onModalDiscardForm(mapDefinition.id, layerId)}
            dirtyFormModalOpen={dirtyFormModalOpen}
            isDirty={isDirty}
            datainfo={datainfo} 
            colourinfo={colourinfo}
        />;
    }
}

const mapStateToProps = (state: any, ownProps: any) => {
    const { app, maps, datainfo, colourinfo } = state

    const layerFormValues = formValueSelector("layerForm")

    return {
        tabId: ownProps.params.tabId,
        mapDefinition: maps[ownProps.params.mapId],
        layerId: ownProps.params.layerId,
        layerDefinition: maps[ownProps.params.mapId].json.layers[ownProps.params.layerId],
        layerFillColourScheme: layerFormValues(state, "fillColourScheme"),
        layerGeometry: layerFormValues(state, "geometry"),
        dirtyFormModalOpen: app.dialogs["dirtyLayerForm"] || false,
        isDirty: isDirty("layerForm")(state),
        datainfo: datainfo,
        colourinfo: colourinfo,
    }
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    startLayerEditSession: (mapId: number, layerId: number) => {
        dispatch(initDraftLayer(mapId, layerId))
    },
    onSubmit: (mapId: number, layerId: number, layerFormValues: object) => { 
        const layer = getLayerFromLayerFormValues(layerFormValues)
        dispatch(publishLayer(mapId, layerId, layer))
        dispatch(initialize("layerForm", layerFormValues, false))
    },
    onFieldUpdate: (fieldName: string, newValue: any, mapId: number, layerId: number) => {
        const layerPartial = getLayerFromLayerFormValuesPartial({[fieldName]: newValue})
        dispatch(handleLayerFormChange(layerPartial, mapId, layerId))
    },
    onFitScaleToData: (mapId: number, layerId: number, stats: object) => {
        const layerPartial = getLayerFromLayerFormValuesPartial({
            "scaleMin": stats.min,
            "scaleMax": stats.max,
        })
        dispatch(handleLayerFormChange(layerPartial, mapId, layerId))
    },
    onSaveForm: (mapId: number, layerId: number) => {
        dispatch(submit("layerForm"))
    },
    onResetForm: (mapId: number, layerId: number, initialLayerFormValues: object) => {
        dispatch(initialize("layerForm", initialLayerFormValues, false))
        dispatch(restoreMasterLayer(mapId, layerId))
    },
    onModalSaveForm: (mapId: number, layerId: number) => {
        dispatch(submit("layerForm"))
        dispatch(toggleModalState("dirtyLayerForm"))
    },
    onModalDiscardForm: (mapId: number, layerId: number) => {
        dispatch(restoreMasterLayerAndDiscardForm(mapId, layerId))
        dispatch(toggleModalState("dirtyLayerForm"))
    },
    onToggleDirtyFormModalState: () => {
        dispatch(toggleModalState("dirtyLayerForm"))
    },
  };
}

const LayerFormContainerWrapped = connect(
    mapStateToProps,
    mapDispatchToProps
)(LayerFormContainer as any)

export default withRouter(LayerFormContainerWrapped)