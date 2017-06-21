import * as React from "react"
import { connect } from "react-redux"
import { List, ListItem } from "material-ui/List"
import InsertChart from "material-ui/svg-icons/editor/insert-chart"
import MapsLayers from "material-ui/svg-icons/maps/layers"
import { IStore, IFeature } from "../../redux/modules/interfaces"

export interface IProps {
    // From Store
    records?: Array<IFeature>
}

export class DataInspector extends React.Component<IProps, {}> {
    render() {
        const { records } = this.props

        return (
            <List>
                <ListItem
                    primaryText="Data Inspector"
                    secondaryText="Click on the map to drilldown into the data"
                    leftIcon={<InsertChart />}
                    disabled={true}
                />
                {records !== undefined &&
                    records.map((row: any, key: number) =>
                        <ListItem
                            key={key}
                            primaryText={row.name}
                            leftIcon={<MapsLayers />}
                            initiallyOpen={true}
                            primaryTogglesNestedList={true}
                            nestedItems={row.properties.map((propRow: any, key: any) =>
                                <ListItem
                                    key={key}
                                    primaryText={propRow.value.toString()}
                                    secondaryText={propRow.name}
                                />
                            )}
                        />
                    )}
            </List>
        )
    }
}

const mapStateToProps = (state: IStore, ownProps: IProps) => {
    const { datainspector } = state

    return {
        records: datainspector.records,
    }
}

const mapDispatchToProps = (dispatch: Function) => {
    return {}
}

const DataInspectorWrapped = connect(mapStateToProps, mapDispatchToProps)(DataInspector as any)

export default DataInspectorWrapped
