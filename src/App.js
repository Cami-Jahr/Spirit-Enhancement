import React from 'react';
import {Line} from 'react-lineto';
import data from './data/charaCard.json';
import "./App.css"

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            data: this.makeMap(data),
            id: 3031,
            tiles: 60,
            type: "ATTACK",
            u_id: 3031,
            u_tiles: 10,
            u_type1: "ATTACK",
            u_type2: "DEFENSE",
            u_type3: "HP",
            u_nodes: "",
            nodes_in_best_paths: {}
        };
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);

        this.colours = {
            "DEFENSE": {[false]: "#ccffff", [true]: "#00ccff"},
            "HP": {[false]: "#936262", [true]: "#f00000"},
            "ATTACK": {[false]: "#c8bf84", [true]: "#ffd22e"},
            "START": {[false]: "#000000", [true]: "#000000"},
        }
    }

    makeMap(data) {
        const dep = {};
        const starts = {};
        for (const [key, value] of Object.entries(data)) {
            const sub = {};
            let start = 0;
            for (const val of Object.values(value.enhancementCellList)) {
                sub[val.charaEnhancementCellId] = {
                    ...val,
                    pointX: 100 + (val.pointX - 1196) / 2 || 0,
                    pointY: 200 + (val.pointY - 1048) / 3 || 0
                }
                if (val.enhancementType === "START") {
                    start = val.charaEnhancementCellId
                }
            }
            if (Object.keys(sub).length !== 0) {
                dep[key] = sub
                starts[key] = start
            }
        }
        return {dep, starts};
    }

    optimal_path = () => {
        const girl_id = this.state.u_id
        const girl_se = this.state.data.dep[girl_id]
        if (!girl_se) return "Not defined"
        const start = performance.now();
        const nodes_in_best_paths = {}
        console.log("Making graph with " + this.state.u_tiles + " nodes for " + girl_id + " for types in order: " + this.state.u_type1 + ", " + this.state.u_type2 + ", " + this.state.u_type3)

        const parents = {}
        const possible_best_paths = []
        const special_nodes = []
        for (const c_id of girl_se[this.state.data.starts[girl_id]].connectedCellIdList) {
            this.find_parents(girl_id, c_id, parents, special_nodes)
        }
        console.log("" + special_nodes.length + " special nodes: " + special_nodes.join(", "))
        for (let preselected_node of this.state.u_nodes.split(",")) {
            preselected_node = preselected_node.trim()
            if (preselected_node in parents) {
                let node = preselected_node
                while (node) {
                    nodes_in_best_paths[node] = true
                    node = parents[node]
                }
            }
        }
        console.log("Preselected nodes: ", Object.keys(nodes_in_best_paths).sort().join(", "))
        nodes_in_best_paths[this.state.data.starts[girl_id]] = true

        const chosen_nodes = this.__optimal_path(girl_id, girl_se, nodes_in_best_paths, this.state.u_type1, this.state.u_type2, this.state.u_type3)
        for (const nodes of chosen_nodes) {
            const local_nodes_in_best_paths = {...nodes_in_best_paths}
            for (const node of nodes) {
                local_nodes_in_best_paths[node] = true
            }
            const chosen_nodes2 = this.__optimal_path(girl_id, girl_se, local_nodes_in_best_paths, this.state.u_type2, this.state.u_type1, this.state.u_type3)
            if (chosen_nodes2.length === 0) {
                possible_best_paths.push(local_nodes_in_best_paths)
            }
            for (const nodes2 of chosen_nodes2) {
                const local_nodes_in_best_paths2 = {...local_nodes_in_best_paths}
                for (const node2 of nodes2) {
                    local_nodes_in_best_paths2[node2] = true
                }
                const chosen_nodes3 = this.__optimal_path(girl_id, girl_se, local_nodes_in_best_paths2, this.state.u_type3, this.state.u_type1, this.state.u_type2)
                if (chosen_nodes3.length === 0) {
                    possible_best_paths.push(local_nodes_in_best_paths2)
                }
                for (const nodes3 of chosen_nodes3) {
                    const local_nodes_in_best_paths3 = {...local_nodes_in_best_paths2}
                    for (const node3 of nodes3) {
                        local_nodes_in_best_paths3[node3] = true
                    }
                    possible_best_paths.push(local_nodes_in_best_paths3)
                }
            }
        }
        const optimal_results = {}

        for (const possible_path of possible_best_paths) {
            const value = {[this.state.u_type1]: 0, [this.state.u_type2]: 0, [this.state.u_type3]: 0}
            for (const nodeId of Object.keys(possible_path)) {
                value[girl_se[nodeId].enhancementType] += (girl_se[nodeId].effectValue || 0)
            }
            optimal_results[Object.keys(possible_path).sort().join(",")] = value
        }
        let optimal_nodes
        try {
            optimal_nodes = Object.entries(optimal_results).sort(this.comparator(this.state.u_type1, this.state.u_type2, this.state.u_type3))[0][0].split(",")
        } catch (e) {
            console.warn("No valid paths found")
            optimal_nodes = []
        }
        const optimal_result = {}
        let enhancementType, effectValue
        for (const nodeId of optimal_nodes) {
            nodes_in_best_paths[nodeId] = true
            enhancementType = girl_se[nodeId].enhancementType
            effectValue = enhancementType === "SKILL" || enhancementType.includes("DISK") ? 1 : girl_se[nodeId].effectValue
            if (enhancementType in optimal_result) {
                optimal_result[enhancementType] += effectValue
            } else {
                optimal_result[enhancementType] = effectValue
            }
        }
        delete optimal_result.START
        console.log('It took ' + (performance.now() - start) + ' ms.');
        console.log("Best result: ", optimal_result)
        return nodes_in_best_paths
    }

    __optimal_path = (girl_id, girl_se, nodes_in_path, type1, type2, type3) => {
        const count_chosen_nodes = Object.values(nodes_in_path).filter(k => k).length - 1 // remove start
        const remaining_nodes = this.state.u_tiles - count_chosen_nodes
        if (remaining_nodes === 0) {
            return []
        }
        return this.find_optimal_path_for_type(girl_id, girl_se, nodes_in_path, type1, type2, type3, remaining_nodes)
    }

    find_optimal_path_for_type = (girl_id, girl_se, nodes_in_path, type1, type2, type3, max_node_count) => {
        const paths_to_consider = []
        const paths_weights = {}
        const local_parents = {}
        const shared_weight_between_siblings = {}
        for (const c_id of girl_se[this.state.data.starts[girl_id]].connectedCellIdList) {
            this.find_paths(girl_id, c_id, nodes_in_path, type1, paths_to_consider, paths_weights, [], 0, local_parents, shared_weight_between_siblings);
        }

        for (const node of Object.keys(paths_weights)) {
            let parent_node = node
            do {
                parent_node = local_parents[parent_node]
                if (parent_node in paths_weights) { // if parent is of type without any siblings showing up it can keep it's heuristic
                    break
                }
                if (parent_node in shared_weight_between_siblings) {
                    // TODO: Rather than remove the weight in all cases, remove it only if any other node with this as a parent is present in the set
                    //  Not sure how, nor do I care to take the time. Would make the heuristic a bit better and improve time by reducing surplus iterations
                    paths_weights[node] -= shared_weight_between_siblings[parent_node]
                    if (paths_weights[node] < 0) {
                        paths_weights[node] = 0
                    }
                }
            } while (parent_node)
        }

        const dp_memo = {}
        this.build_dp_memo(girl_se, type1, dp_memo, max_node_count, [], paths_to_consider, paths_weights)
        const possible_chosen_nodes = []
        let best_type1 = undefined
        for (const [path, value] of Object.entries(dp_memo).sort(this.comparator(type1, type2, type3))) {
            const nodes = this.calculate_parents(local_parents, path)
            if (best_type1 && best_type1 > value[type1]) {
                break
            }
            if (nodes.length <= max_node_count) {
                possible_chosen_nodes.push(nodes)
                best_type1 = value[type1]
            }
        }
        for (let i = 0; i < possible_chosen_nodes.length; i++) {
            for (const [path, _] of Object.entries(dp_memo).sort(this.comparator(type1, type2, type3))) {
                const nodes = this.calculate_parents(local_parents, path)
                const new_chosen_nodes = Array.from(new Set([...possible_chosen_nodes[i], ...nodes]))
                if (new_chosen_nodes.length <= max_node_count) {
                    possible_chosen_nodes[i] = new_chosen_nodes
                }
            }
        }
        console.log("dp_memo made for " + type1 + ", considered " + Object.keys(dp_memo).length + " different combinations")
        return possible_chosen_nodes
    }

    find_paths(girl_id, node, nodes_in_path, type, paths, weight_of_node, path, steps_since_type, parents, siblings) {
        const obj = this.state.data.dep[girl_id][node];
        if (!obj) return;
        steps_since_type++

        if (node in nodes_in_path) {
            steps_since_type = 0
        } else if (obj.enhancementType === type) {
            path = [...path, node]
            paths.push(path.sort())
            weight_of_node[node] = steps_since_type
            steps_since_type = 0
        }
        const children = obj.connectedCellIdList
        if (children) {
            for (const c_id of children) {
                if (steps_since_type > 0 && children.length > 1) { // Dont need to consider for branches that happen in a node of the wanted type
                    siblings[c_id] = steps_since_type
                }
                if (!(node in nodes_in_path)) {
                    parents[c_id] = node
                }
                this.find_paths(girl_id, c_id, nodes_in_path, type, paths, weight_of_node, path, steps_since_type, parents, siblings);
            }
        }
    }

    find_parents(girl_id, node, parents, special_nodes) {
        const obj = this.state.data.dep[girl_id][node];
        if (!obj) return;
        const children = obj.connectedCellIdList
        if (obj.enhancementType === "SKILL" || obj.enhancementType.includes("DISK")) {
            special_nodes.push(node)
        }
        if (children) {
            for (const c_id of children) {
                parents[c_id] = node
                this.find_parents(girl_id, c_id, parents, special_nodes)
            }
        }
    }

    calculate_parents = (parents, path) => {
        const nodes = new Set();
        for (let node of path.split(",")) {
            do {
                nodes.add(node.toString())
                node = parents[node]
            } while (node)
        }
        return Array.from(nodes)
    }

    build_dp_memo = (girl_se, type, dp_memo, max_length, left_nodes, other_paths, paths_weights) => {
        for (const right_nodes of other_paths) {
            const total_nodes = Array.from(new Set([...left_nodes, ...right_nodes]))
            if (total_nodes.reduce((a, b) => a + paths_weights[b], 0) > max_length) {
                continue
            }
            const key = total_nodes.sort().join(",")
            if (key in dp_memo) {
                continue
            }
            const value = {[type]: 0}
            for (const nodeId of total_nodes) {
                value[girl_se[nodeId].enhancementType] += (girl_se[nodeId].effectValue || 0)
            }
            dp_memo[key] = value
            const new_other_paths = other_paths.filter(path => path !== right_nodes)
            this.build_dp_memo(girl_se, type, dp_memo, max_length, total_nodes, new_other_paths, paths_weights)
        }
    }

    comparator = (type1, type2, type3) => (a, b) => {
        if (a[1][type1] < b[1][type1]) return 1;
        if (a[1][type1] > b[1][type1]) return -1;
        if (a[1][type2] < b[1][type2]) return 1;
        if (a[1][type2] > b[1][type2]) return -1;
        if (a[1][type3] < b[1][type3]) return 1;
        if (a[1][type3] > b[1][type3]) return -1;
        return 0;
    }

    handleNodes = event => this.setState({u_nodes: event.target.value})

    handleChange(event) {
        if (event.target.type === "select-one") {
            try {
                if (event.target.name.includes("type")) {
                    const other = event.target.name === "u_type1" && event.target.value === this.state.u_type2 ?
                        "u_type2" : "u_type3" // This is horrible but whatever
                    this.setState({
                        [other]: this.state[event.target.name],
                        [event.target.name]: event.target.value
                    }, () => this.handleSubmit(null));
                } else {
                    this.setState({
                        [event.target.name]: event.target.value
                    }, () => this.handleSubmit(null));
                }
            } catch (e) {
            }
        } else {
            this.setState({[event.target.name]: event.target.value ? parseInt(event.target.value) : ""});
        }
    }

    handleKeyPress(event) {
        if (event.key === 'Enter') {
            this.handleSubmit(null);
        }
    }

    handleSubmit() {
        if (this.state.data.dep[this.state.u_id]) {
            this.setState({
                id: this.state.u_id,
                tiles: this.state.u_tiles,
                nodes_in_best_paths: this.optimal_path()
            })
        } else {
            this.setState({u_id: "invalid"})
        }
    }

    createLines(key) {
        const lines = []
        const obj = this.state.data.dep[this.state.id][key];

        if (obj.connectedCellIdList) {
            for (const c_id of obj.connectedCellIdList) {
                if (!this.state.data.dep[this.state.id][c_id]) {
                    continue;
                }
                lines.push(
                    <Line
                        key={`${key}-${c_id}`}
                        borderColor={this.state.nodes_in_best_paths[c_id] ? "#ff0000" : "#723131"}
                        borderStyle={this.state.nodes_in_best_paths[c_id] ? "solid" : "dashed"}
                        borderWidth={2}
                        x0={obj.pointX + 26}
                        y0={obj.pointY + 15}
                        x1={this.state.data.dep[this.state.id][c_id].pointX + 26}
                        y1={this.state.data.dep[this.state.id][c_id].pointY + 15}
                    />)
            }
        }
        return lines;
    }

    createBox(Y, X, key) {
        const node = this.state.data.dep[this.state.id][key]
        const colour = (this.colours[node.enhancementType]
            || {[false]: "#efe0f0", [true]: "#f99eff"}
        )[this.state.nodes_in_best_paths[key] || false]
        const styleTop = {
            position: "absolute",
            left: X + "px",
            top: Y - 15 + "px",
            borderBottomColor: colour,
        }
        const styleMid = {
            position: "absolute",
            left: X + "px",
            top: Y + "px",
            backgroundColor: colour,
            textAlign: "center"
        }
        const styleBot = {
            position: "absolute",
            left: X + "px",
            top: Y + 30 + "px",
            borderTopColor: colour,
            zIndex: -1
        }
        return (
            <div key={key}>
                <div
                    style={styleTop}
                    className="hexagon-top"
                />
                <div
                    style={styleMid}
                    className="hexagon"
                >
                    {node.enhancementType !== "SKILL" && !node.enhancementType.includes("DISK") ? node.effectValue : ""}
                    <br/>
                    {key}
                </div>
                <div
                    style={styleBot}
                    className="hexagon-bot"
                />
                {this.createLines(key)}
            </div>
        );
    };

    createBoxes() {
        const boxes = []
        for (const [key, value] of Object.entries(this.state.data.dep[this.state.id])) {
            boxes.push(
                this.createBox(value.pointY, value.pointX, key)
            )
        }
        return boxes;
    }

    options() {
        const opts = []
        for (const id of Object.keys(this.state.data.starts)) {
            opts.push(<option key={id} value={id}>{id}</option>)
        }
        return opts;
    }

    render() {
        return (
            <div>
                <label>
                    ID:
                    <select
                        type="select"
                        name="u_id"
                        value={this.state.u_id}
                        onChange={this.handleChange}
                    >
                        {this.options()}
                    </select>
                </label>
                <label>
                    Primary Type:
                    <select
                        value={this.state.u_type1}
                        onChange={this.handleChange}
                        name="u_type1"
                    >
                        <option value="ATTACK">Attack</option>
                        <option value="HP">HP</option>
                        <option value="DEFENSE">Defense</option>
                    </select>
                </label>
                <label>
                    Secondary Type:
                    <select
                        value={this.state.u_type2}
                        onChange={this.handleChange}
                        name="u_type2"
                    >
                        {this.state.u_type1 !== "ATTACK" && <option value="ATTACK">Attack</option>}
                        {this.state.u_type1 !== "HP" && <option value="HP">HP</option>}
                        {this.state.u_type1 !== "DEFENSE" && <option value="DEFENSE">Defense</option>}
                    </select>
                </label>
                <label>
                    Tertiary Type:
                    <select
                        value={this.state.u_type3}
                        onChange={this.handleChange}
                        name="u_type3"
                    >
                        {this.state.u_type1 !== "ATTACK" && this.state.u_type2 !== "ATTACK" &&
                        <option value="ATTACK">Attack</option>}
                        {this.state.u_type1 !== "HP" && this.state.u_type2 !== "HP" && <option value="HP">HP</option>}
                        {this.state.u_type1 !== "DEFENSE" && this.state.u_type2 !== "DEFENSE" &&
                        <option value="DEFENSE">Defense</option>}
                    </select>
                </label>
                <label>
                    Tiles:
                    <input
                        name="u_tiles"
                        type="number"
                        value={this.state.u_tiles}
                        onChange={this.handleChange}
                        onKeyPress={this.handleKeyPress}
                    />
                </label>
                <label>
                    Selected nodes:
                    <input
                        name="u_nodes"
                        type="text"
                        value={this.state.u_nodes}
                        onChange={this.handleNodes}
                        onKeyPress={this.handleKeyPress}
                    />
                </label>
                <label>
                    Free:
                    {this.state.tiles - Object.values(this.state.nodes_in_best_paths).reduce((a, b) => a + b, 0) + 1}
                </label>
                <div className="boxContainer">
                    <div className="innerBox">
                        {this.createBoxes()}
                    </div>
                </div>
            </div>
        );
    }
}


export default App;
