import * as React from "react"
import { Link } from "react-router"
import { connect } from "react-redux"
import RaisedButton from "material-ui/RaisedButton"
import ChipInput from "material-ui-chip-input"
import Chip from "material-ui/Chip"
import { List, ListItem } from "material-ui/List"
import ContentCopy from "material-ui/svg-icons/content/content-copy"
import ContentFilterList from "material-ui/svg-icons/content/filter-list"
import ActionSearch from "material-ui/svg-icons/action/search"
import { Card, CardActions, CardHeader, CardMedia, CardTitle, CardText } from "material-ui/Card"
import * as ReactList from "react-list"
import * as CopyToClipboard from "react-copy-to-clipboard"

import Divider from "material-ui/Divider"

import { blue300, grey500, indigo900, orange400, cyan400 } from "material-ui/styles/colors"

const styles = {
    datasetSearchHeader: {
        marginTop: "20px",
        marginBottom: "0px",
        paddingBottom: "0px",
    },
    datasetSearchTitle: {
        marginBottom: "0px",
    },
    datasetSearchHintTextListItem: {
        padding: "0px",
    },
    datasetSearchHintText: {
        fontSize: "smaller",
        fontStyle: "italic",
        color: grey500,
        marginTop: "0px",
        marginBottom: "0px",
    },
    datasetSearchHintHighlight: {
        textDecoration: "underline",
    },
    chipInput: {
        marginTop: "0px",
    },
    searchResultsCard: {
        marginBottom: "10px",
    },
    searchResultsCardText: {
        backgroundColor: indigo900,
    },
    searchResultsReactList: {
        overflow: "auto",
        maxHeight: 400,
    },
    searchResultItemCard: {
        marginBottom: "5px",
        boxShadow: "",
    },
    searchResultItemTextStyle: {
        paddingRight: "0px",
    },
    searchResultItemStyle: {
        paddingBottom: "0px",
    },
    copyColumnButton: {
        margin: "8px",
    },
    lookupTableButton: {
        margin: "8px",
    },
}

export interface DatasetSearchProps {
    onChipAdd: Function
    onChipDelete: Function
    chipValues: Array<string>
    dataDiscovery: Array<any>
    onCopyToClipboard: Function
    onTableLookup: Function
}

export class DatasetSearch extends React.Component<DatasetSearchProps, undefined> {
    render() {
        const { onChipAdd, onChipDelete, chipValues, dataDiscovery, onCopyToClipboard, onTableLookup } = this.props

        const dataDiscoveryResultLength = Object.keys(dataDiscovery).length
        let showExpandableButton = dataDiscoveryResultLength == 1 ? false : true
        let actAsExpander = dataDiscoveryResultLength == 1 ? false : true
        let expandable = dataDiscoveryResultLength == 1 ? false : true

        return (
            <div>
                <List style={styles.datasetSearchHeader}>
                    <ListItem
                        primaryText="Search for datasets"
                        leftIcon={<ActionSearch />}
                        disabled={true}
                        style={styles.datasetSearchTitle}
                    />
                    <ListItem disabled={true} style={styles.datasetSearchHintTextListItem}>
                        <p style={styles.datasetSearchHintText}>
                            Enter one or more keywords for the data you want to find.<br />
                            <span style={styles.datasetSearchHintHighlight}>Hint:</span> If you want to lookup a column
                            or table simply prefix your keywords with "column:" or "table:" e.g. "column:B117".
                        </p>
                    </ListItem>
                </List>

                <ChipInput
                    style={styles.chipInput}
                    value={chipValues}
                    onRequestAdd={(chip: string) => onChipAdd(chip)}
                    onRequestDelete={(chip: string) => onChipDelete(chip)}
                    newChipKeyCodes={[13, 188]}
                    fullWidth={true}
                    floatingLabelText={"Search for datasets e.g. mortgage, repayment, total"}
                    chipRenderer={(
                        { value, text, isFocused, isDisabled, handleClick, handleRequestDelete, defaultStyle },
                        key
                    ) => {
                        let backgroundColor = null

                        if (value.startsWith("column:")) {
                            text = "Column " + text.split(":")[1]
                            backgroundColor = blue300
                        }

                        if (value.startsWith("table:")) {
                            text = "Table " + text.split(":")[1]
                            backgroundColor = orange400
                        }

                        if (isFocused) {
                            backgroundColor = cyan400
                        }

                        return (
                            <Chip
                                key={key}
                                backgroundColor={backgroundColor}
                                onRequestDelete={handleRequestDelete}
                                onTouchTap={handleClick}
                                style={defaultStyle}
                                value={value}
                            >
                                {text}
                            </Chip>
                        )
                    }}
                />

                {Object.keys(dataDiscovery).map((tableId: any, key: number) =>
                    <Card key={key} style={styles.searchResultsCard}>
                        <CardHeader
                            title={`${dataDiscovery[tableId]["table"].metadata_json["type"]} (${dataDiscovery[tableId][
                                "columns"
                            ].length})`}
                            subtitle={dataDiscovery[tableId]["table"].metadata_json["kind"]}
                            showExpandableButton={showExpandableButton}
                            actAsExpander={actAsExpander}
                        />
                        <CardText style={styles.searchResultsCardText} expandable={expandable}>
                            <div style={styles.searchResultsReactList}>
                                <ReactList
                                    itemRenderer={(index: any, key: any) =>
                                        <div key={key}>
                                            <Card style={styles.searchResultItemCard}>
                                                <CardHeader
                                                    title={`${dataDiscovery[tableId]["columns"][key].metadata_json[
                                                        "kind"
                                                    ]} (${dataDiscovery[tableId]["columns"][key].name})`}
                                                    subtitle={
                                                        dataDiscovery[tableId]["columns"][key].metadata_json["type"]
                                                    }
                                                    textStyle={styles.searchResultItemTextStyle}
                                                    style={styles.searchResultItemStyle}
                                                />
                                                <CardActions>
                                                    <CopyToClipboard
                                                        text={dataDiscovery[tableId]["columns"][key].name}
                                                        onCopy={() =>
                                                            onCopyToClipboard(
                                                                dataDiscovery[tableId]["columns"][key].name
                                                            )}
                                                    >
                                                        <RaisedButton
                                                            label="Copy Column"
                                                            secondary={true}
                                                            style={styles.copyColumnButton}
                                                            icon={<ContentCopy />}
                                                        />
                                                    </CopyToClipboard>
                                                </CardActions>
                                            </Card>
                                            <Divider />
                                        </div>}
                                    length={dataDiscovery[tableId]["columns"].length}
                                    type={"simple"}
                                />
                            </div>
                        </CardText>
                        <CardActions>
                            <RaisedButton
                                label="Lookup Table"
                                primary={true}
                                style={styles.lookupTableButton}
                                icon={<ContentFilterList />}
                                onTouchTap={(evt: object) => onTableLookup(dataDiscovery[tableId]["table"])}
                            />
                        </CardActions>
                    </Card>
                )}
            </div>
        )
    }
}

export default DatasetSearch
