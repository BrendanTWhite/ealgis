import * as React from "react";
import { Link } from 'react-router';
import { connect } from 'react-redux';
import RaisedButton from 'material-ui/RaisedButton';
import FlatButton from 'material-ui/FlatButton';
import {Tabs, Tab} from 'material-ui/Tabs';
import Dialog from 'material-ui/Dialog';
import ContentCreate from 'material-ui/svg-icons/content/create';
import EditorInsertChart from 'material-ui/svg-icons/editor/insert-chart';
import ImagePalette from 'material-ui/svg-icons/image/palette';
import NavigationClose from 'material-ui/svg-icons/navigation/close';
import DatasetSearch from "./DatasetSearchContainer";
import LayerQuerySummary from "./LayerQuerySummaryContainer";

import { Field, reduxForm } from 'redux-form';
import {
  SelectField,
  TextField,
  Checkbox,
  Slider,
} from 'redux-form-material-ui';
import ColourPicker from './FormControls/ColourPickerContainer';
import AlphaPicker from './FormControls/AlphaPickerContainer';

import Divider from 'material-ui/Divider';
import MenuItem from 'material-ui/MenuItem';

import IconButton from 'material-ui/IconButton';
import {Toolbar, ToolbarGroup, ToolbarSeparator, ToolbarTitle} from 'material-ui/Toolbar';

const required = value => value || value === 0 ? undefined : 'Required'

const styles = {
  tabBody: {
      margin: "10px",
  },
  hiddenSubmitButton: {
      "display": "none",
  },
  // FIXME What is the proper way to do CSS styling in JSX? -> ReactCSS
  flexboxContainer: {
    "display": "-ms-flex",
    "display": "-webkit-flex",
    "display": "flex",
    "justifyContent": "center",
    "alignItems": "center",
  },
  flexboxFirstColumn: {
    "flex": "1",
    "marginRight": "20px",
  },
  flexboxSecondColumn: {
    "flex": "1",
  },
  fauxFiedlLabel: {
      "fontSize": "12px",
      "color": "rgba(0, 0, 0, 0.3)",
      "marginBottom": "10px",
      "transform": "scale(1) translate(0px, -4px)",
      "transformOrigin": "left top 0px",
  },
  fillOpacityPicker: {
      "marginTop": "14px",
      "marginBottom": "10px",
  },
}

export interface LayerFormProps {
    mapId: number,
    layerId: string,
    layerHash: string,
    tabId: string,
    initialValues: object,
    onSubmit: Function,
    onFieldBlur: Function,
    onFieldChange: Function,
    onGeometryChange: Function,
    datainfo: object,
    colourinfo: object,
    fillColourScheme: string,
    onDiscardForm: Function,
    onSaveForm: Function,
    dirtyFormModalOpen: boolean,
    isDirty: boolean,
    onClickApplyScale: Function,
}

export class LayerForm extends React.Component<LayerFormProps, undefined> {
    geometryTables: Array<JSX.Element>
    colourSchemes: Array<JSX.Element>

    componentWillMount() {
        const { datainfo, colourinfo } = this.props

        this.geometryTables = []
        for(let geomtable_name in datainfo) {
            this.geometryTables.push(<MenuItem key={geomtable_name} value={datainfo[geomtable_name]} primaryText={datainfo[geomtable_name].description} />)
        }

        this.colourSchemes = []
        for(let colour in colourinfo) {
            this.colourSchemes.push(<MenuItem key={colour} value={colour} primaryText={colour} />)
        }
    }

    render() {
        const { error, handleSubmit, pristine, reset, submitting, change, initialValues } = this.props // from react-form
        const { mapId, layerId, layerHash, tabId, onSubmit, onFieldBlur, onFieldChange, onGeometryChange, colourinfo, fillColourScheme, onDiscardForm, onSaveForm, dirtyFormModalOpen, onClickApplyScale } = this.props

        const layerIdOrNew = (parseInt(layerId) > 0) ? layerId : "new"
        
        // Make sure that the Colour Scheme Level resets when we change our colour scheme
        const colourSchemeLevels = (colourinfo[fillColourScheme]) ? colourinfo[fillColourScheme] : []

        // FIXME See OneTab for a bunch of saved links about how to express dependencies between fields in redux-form

        return <div>
            <Toolbar>
                <ToolbarGroup firstChild={true}>
                    <RaisedButton 
                        label={(layerIdOrNew === "new") ? "Create Layer" : "Save Layer"}
                        disabled={submitting}
                        primary={true}
                        onClick={handleSubmit(onSubmit)}
                    />
                    <RaisedButton 
                        label={"Undo"}
                        primary={true}
                    />
                </ToolbarGroup>

                <ToolbarGroup lastChild={true}>
                    <IconButton tooltip="Close this layer and return to your map" tooltipPosition="bottom-right" containerElement={<Link to={`/map/${mapId}`} />}><NavigationClose /></IconButton>
                </ToolbarGroup>
            </Toolbar>

            <form onSubmit={handleSubmit(onSubmit)}>
                <Tabs
                    initialSelectedIndex={(tabId === undefined) ? 0 : parseInt(tabId)}
                >
                    {/* START DESCRIBE TAB */}
                    <Tab
                        icon={<ContentCreate />}
                        label="DESCRIBE"
                        containerElement={<Link to={`/map/${mapId}/layer/${layerIdOrNew}`}/>}
                    >
                        <div style={styles.tabBody}>
                            <Field 
                                name="name" 
                                component={TextField} 
                                hintText="Give your layer a name..."
                                floatingLabelText="Layer name"
                                floatingLabelFixed={true}
                                validate={[ required ]} 
                                fullWidth={true}
                                autoComplete="off"
                                onBlur={(event: any, newValue: string, previousValue: string) => onFieldBlur(event.target.name, newValue)}
                            />

                            <Field 
                                name="description" 
                                component={TextField}
                                multiLine={true}
                                rows={2}
                                hintText="Give your layer a description..."
                                floatingLabelText="Layer description"
                                floatingLabelFixed={true}
                                validate={[ required ]}
                                fullWidth={true}
                                autoComplete="off"
                                onBlur={(event: any, newValue: string, previousValue: string) => onFieldBlur(event.target.name, newValue)}
                            />
                            
                            <Field
                                name="geometry"
                                component={SelectField}
                                hintText="Choose your geometry..."
                                floatingLabelText="Geometry"
                                floatingLabelFixed={true}
                                validate={[ required ]} 
                                fullWidth={true}
                                onChange={(junk: object, newValue: object, previousValue: object) => onFieldChange("geometry", newValue)}
                            >
                                {this.geometryTables}
                            </Field>
                        </div>
                    </Tab>
                    {/* END DESCRIBE TAB */}

                    {/* START DATA TAB */}
                    <Tab
                        icon={<EditorInsertChart />}
                        label="DATA"
                        containerElement={<Link to={`/map/${mapId}/layer/${layerIdOrNew}/1`}/>}
                    >
                        <div style={styles.tabBody}>
                            <Field 
                                name="valueExpression" 
                                component={TextField}
                                multiLine={true}
                                rows={2}
                                hintText="Write an expression..."
                                floatingLabelText="Value expression"
                                floatingLabelFixed={true}
                                fullWidth={true}
                                autoComplete="off"
                                onBlur={(event: any, newValue: string, previousValue: string) => onFieldBlur(event.target.name, newValue)}
                            />

                            <Field 
                                name="filterExpression" 
                                component={TextField}
                                multiLine={true}
                                rows={2}
                                hintText="Write a filter expression..."
                                floatingLabelText="Filter expression"
                                floatingLabelFixed={true}
                                fullWidth={true}
                                autoComplete="off"
                                onBlur={(event: any, newValue: string, previousValue: string) => onFieldBlur(event.target.name, newValue)}
                            />

                            <DatasetSearch />
                        </div>
                    </Tab>
                    {/* END DATA TAB */}

                    {/* START VISUALISE TAB */}
                    <Tab
                        icon={<ImagePalette />}
                        label="VISUALISE"
                        containerElement={<Link to={`/map/${mapId}/layer/${layerIdOrNew}/2`}/>}
                    >
                        <div style={styles.tabBody}>
                            <div style={styles.flexboxContainer}>
                                <div style={styles.flexboxFirstColumn}>
                                    <h5 style={styles.fauxFiedlLabel}>Border colour</h5>
                                    <Field
                                        name="borderColour"
                                        component={ColourPicker}
                                        color={initialValues["borderColour"]}
                                        onChange={(junk: object, newValue: object, previousValue: object) => onFieldChange("borderColour", newValue)}
                                    />
                                </div>

                                <div style={styles.flexboxSecondColumn}>
                                    <Field 
                                        name="borderSize" 
                                        component={TextField} 
                                        hintText="Border size (pixels)"
                                        floatingLabelText="Border size"
                                        floatingLabelFixed={true}
                                        validate={[ required ]}
                                        fullWidth={true}
                                        type="number"
                                        min="0"
                                        max="20"
                                        onChange={(event: any, newValue: string, previousValue: string) => onFieldChange(event.target.name, newValue)}
                                    />
                                </div>
                            </div>

                            <div style={styles.flexboxContainer}>
                                <div style={styles.flexboxFirstColumn}>
                                    <Field
                                        name="fillColourScheme"
                                        component={SelectField}
                                        hintText="Choose your colour scheme..."
                                        floatingLabelText="Fill colour scheme"
                                        floatingLabelFixed={true}
                                        validate={[ required ]}
                                        fullWidth={true}
                                        onChange={
                                            (junk: object, newValue: string, previousValue: string) => {
                                                // There's two gotchas here:
                                                // 1. redux-form-material-ui doesn't pass (event, newValue, previousValue) for SelectFields like it does for other field types. Hence the `junk` argument and repeating the field name.
                                                // 2. We were (seemingly) seeing onChange firing before the application state had been updated with the new value for this SelectField. We'll work around this by using the debounced version.
                                                onFieldChange("fillColourScheme", newValue)
                                            }
                                        }
                                    >
                                        {this.colourSchemes}
                                    </Field>
                                </div>

                                <div style={styles.flexboxSecondColumn}>
                                    <Field
                                        name="fillColourScaleFlip"
                                        component={Checkbox}
                                        label={"Flip colours"}
                                        labelPosition={"left"}
                                        labelStyle={styles.fauxFiedlLabel}
                                        onChange={(event: any, newValue: string, previousValue: string) => onFieldChange("fillColourScaleFlip", newValue)}
                                    />
                                </div>
                            </div>

                            <div style={styles.flexboxContainer}>
                                <div style={styles.flexboxFirstColumn}>
                                    <Field 
                                        name="fillColourSchemeLevels" 
                                        component={SelectField} 
                                        hintText="Choose the number of colour levels..."
                                        floatingLabelText="Fill colour levels"
                                        floatingLabelFixed={true}
                                        fullWidth={true}
                                        onChange={(junk: object, newValue: string, previousValue: string) => onFieldChange("fillColourSchemeLevels", newValue)}
                                        value={initialValues["fillColourSchemeLevels"]}
                                    >
                                    {
                                        colourSchemeLevels.map((colourLevel: any, key: any) => 
                                            <MenuItem key={key} value={colourLevel} primaryText={colourLevel} />
                                        )
                                    }
                                    </Field>
                                </div>

                                <div style={styles.flexboxSecondColumn}>
                                    <h5 style={styles.fauxFiedlLabel}>Fill opacity</h5>
                                    <div style={styles.fillOpacityPicker}>
                                        <Field
                                            name="fillOpacity"
                                            component={AlphaPicker}
                                            rgb={{"r": 0, "g": 0, "b": 0, "a": initialValues["fillOpacity"]}}
                                            onChange={(event: any, newValue: object, previousValue: object) => onFieldChange("fillOpacity", newValue)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={styles.flexboxContainer}>
                                <div style={styles.flexboxFirstColumn}>
                                    <Field 
                                        name="scaleMin" 
                                        component={TextField} 
                                        hintText="Scale minimum"
                                        floatingLabelText="Scale minimum"
                                        floatingLabelFixed={true}
                                        validate={[ required ]}
                                        fullWidth={true}
                                        type="number"
                                        min="0"
                                        onChange={(event: any, newValue: string, previousValue: string) => onFieldChange(event.target.name, newValue)}
                                    />
                                </div>

                                <div style={styles.flexboxSecondColumn}>
                                    <Field 
                                        name="scaleMax" 
                                        component={TextField} 
                                        hintText="Scale maximum"
                                        floatingLabelText="Scale maximum"
                                        floatingLabelFixed={true}
                                        validate={[ required ]}
                                        fullWidth={true}
                                        type="number"
                                        min="0"
                                        onChange={(event: any, newValue: string, previousValue: string) => onFieldChange(event.target.name, newValue)}
                                    />
                                </div>
                            </div>

                            <LayerQuerySummary mapId={mapId} layerHash={layerHash} onClickApplyScale={onClickApplyScale} />
                        </div>
                    </Tab>
                    {/* END VISUALISE TAB */}
                </Tabs>

                <button type="submit" style={styles.hiddenSubmitButton} />
            </form>

            <Dialog
                title="You have unsaved changes - what would you like to do?"
                actions={[
                    <FlatButton
                        label="Discard Changes"
                        secondary={true}
                        onTouchTap={onDiscardForm}
                    />,
                    <FlatButton
                        label="Save Changes"
                        primary={true}
                        onTouchTap={onSaveForm}
                    />,
                ]}
                modal={true}
                open={dirtyFormModalOpen}
            />
        </div>
    }
}

// Decorate the form component
let LayerForm = reduxForm({
  form: 'layerForm', // a unique name for this form
  enableReinitialize: true,
})(LayerForm)

export default LayerForm
