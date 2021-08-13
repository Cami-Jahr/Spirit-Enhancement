import React from 'react';
import { Line } from 'react-lineto';
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
      u_type3: "DEFENSE",
      nodes_in_best_paths: {}
    };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);

    this.colours = {
      "DEFENSE": {[false]:"#ccffff", [true]:"#00ccff"},
      "HP": {[false]:"#936262", [true]:"#f00000"},
      "ATTACK": {[false]:"#c8bf84", [true]:"#ffd22e"},
      "START": {[false]:"#000000", [true]:"#000000"},
    }
  }

  makeMap (data) {
    let dep = {};
    let starts = {};
    for (let [key, value] of Object.entries(data)) {
      let sub = {};
      let start = 0;

      for (let val of Object.values(value.enhancementCellList)) {
        sub[val.charaEnhancementCellId] = {
          ...val,
          pointX: 100 + (val.pointX-1196) / 2 || 0,
          pointY: 200 + (val.pointY-1048) / 3 || 0
        }

        if (val.enhancementType === "START") {
          start = val.charaEnhancementCellId
        }
      }

      if (Object.keys(sub).length !== 0){
        dep[key] = sub
        starts[key] = start
      }
    }

    return {dep, starts};
  }

  comparator = (a, b) => {
    if (a[0][this.state.u_type1] < b[0][this.state.u_type1]) return 1;
    if (a[0][this.state.u_type1] > b[0][this.state.u_type1]) return -1;
    if (a[0][this.state.u_type2] < b[0][this.state.u_type2]) return 1;
    if (a[0][this.state.u_type2] > b[0][this.state.u_type2]) return -1;
    if (a[0][this.state.u_type3] < b[0][this.state.u_type3]) return 1;
    if (a[0][this.state.u_type3] > b[0][this.state.u_type3]) return -1;
    return 0;
  }

  countArrayEntriesNotInObject (obj, array) {
    let c = 0
    for (let n of array) {
      c += !obj[n]
    }
    return c;
  }

  calculateGain = (charInfo, original_memo, nodes_in_best_paths) => {
    const balanced_memo = original_memo.map(path => {
      const path_gain = {}
      const new_nodes_in_path = path.filter(nodeId => !nodes_in_best_paths[nodeId])
      const remaining_values = {ATTACK: 0, DEFENSE: 0, HP: 0}
      new_nodes_in_path.forEach(nodeId => {
        remaining_values[charInfo[nodeId].enhancementType] = (charInfo[nodeId].effectValue || 0)
      });
      Object.entries(remaining_values).map(([type, value]) => {path_gain[type] = value / new_nodes_in_path.length})
      return [path_gain, path]
    })
    return balanced_memo
  }

  addBestBranch = (memo, nodes_in_best_paths) => {
    let path_was_added
    for (let [_, path] of memo.sort(this.comparator)) {
      if (Object.values(nodes_in_best_paths).reduce((a, b) => a + b, 0) + this.countArrayEntriesNotInObject(nodes_in_best_paths, path) <= this.state.u_tiles + 1) {
        path_was_added = false
        for (let p of path) {
          if(!nodes_in_best_paths[p]) {
            path_was_added = true
            nodes_in_best_paths[p] = true
          }
        }
        if(path_was_added) {
          return path;
        }
      }
    }
    return false;
  }

  /**
   * Greedy approach for calculating on the fly best paths
   */
  best_path (id, type) {
    if (!this.state.data.dep[id]) return "Not defined"
    let memory = []
    const nodes_in_best_paths = {[this.state.data.starts[id]]: true}

    for (let c_id of this.state.data.dep[id][this.state.data.starts[id]].connectedCellIdList) {
      this.find_paths(id, c_id, type, memory, nodes_in_best_paths, []);
    }

    let weight_and_memo, chosen_path
    while (true) {
      weight_and_memo = this.calculateGain(this.state.data.dep[id], memory, nodes_in_best_paths)
      chosen_path = this.addBestBranch(weight_and_memo, nodes_in_best_paths)
      if(!chosen_path) break;
      memory = memory.filter(path_to_value => {
        for (const nodeId of path_to_value) {
          if(!nodes_in_best_paths[nodeId]){
            return true
          }
        }
        return false
      })
    }

    return nodes_in_best_paths;
  }

  build_dp_memo = (girl_se, dp_memo, left_nodes, other_paths) => {
    for (const right_nodes of other_paths) {
      const total_nodes = Array.from(new Set([...left_nodes, ...right_nodes]))
      if(total_nodes.length > this.state.u_tiles) {
        continue
      }
      const key = total_nodes.sort().join(",")
      if (key in dp_memo) {
        continue
      }
      const value = {ATTACK: 0, DEFENSE: 0, HP: 0}
      for (const nodeId of total_nodes) {
        value[girl_se[nodeId].enhancementType] += (girl_se[nodeId].effectValue || 0)
      }
      dp_memo[key] = value
      const new_other_paths = other_paths.filter(path => path !== right_nodes)
      this.build_dp_memo(girl_se, dp_memo, total_nodes, new_other_paths)
    }
}

  dp_comparator = (a, b) => {
    if (a[1][this.state.u_type1] < b[1][this.state.u_type1]) return 1;
    if (a[1][this.state.u_type1] > b[1][this.state.u_type1]) return -1;
    if (a[1][this.state.u_type2] < b[1][this.state.u_type2]) return 1;
    if (a[1][this.state.u_type2] > b[1][this.state.u_type2]) return -1;
    if (a[1][this.state.u_type3] < b[1][this.state.u_type3]) return 1;
    if (a[1][this.state.u_type3] > b[1][this.state.u_type3]) return -1;
    return 0;
  }

  /**
   * DP approach, finds optimal solution
   */
  optimal_path = (id, type) => {
    const girl_se = this.state.data.dep[id]
    if (!girl_se) return "Not defined"
    let paths = {}
    const nodes_in_best_paths = {[this.state.data.starts[id]]: true}

    for (let c_id of girl_se[this.state.data.starts[id]].connectedCellIdList) {
      this.find_paths(id, c_id, type, paths, nodes_in_best_paths, []);
    }
    const paths_to_consider = Object.entries(paths)
        .filter(([_, shouldTake]) => shouldTake)
        .map(([path, _]) => path.split(","))

    const dp_memo = {}
    this.build_dp_memo(girl_se, dp_memo, [], paths_to_consider)

    let chosen_nodes = []
    for (let [path, _] of Object.entries(dp_memo).sort(this.dp_comparator)) {
      const nodes = path.split(",");
      const new_chosen_nodes = Array.from(new Set([...chosen_nodes, ...nodes]))
      if(new_chosen_nodes.length <= this.state.u_tiles) {
        chosen_nodes = new_chosen_nodes
      }
    }
    for (const chosenNode of chosen_nodes) {
      nodes_in_best_paths[chosenNode] = true
    }
    return nodes_in_best_paths
  }

  find_paths (id, node, type, memo, nodes_in_best_paths, path=[]) {
    let obj = this.state.data.dep[id][node];
    if(!obj) return;
    nodes_in_best_paths[node] = false

    const should_evalute_in_pathfinding = obj.enhancementType === this.state.u_type1
        //|| obj.enhancementType === this.state.u_type2 // Also considering this adds significant time
    path = [...path, node]
    memo[path.sort().join(",")] = should_evalute_in_pathfinding

    if (obj.connectedCellIdList) {
      for (let c_id of obj.connectedCellIdList) {
        this.find_paths(id, c_id, type, memo, nodes_in_best_paths, path);
      }
    }
  }

  handleChange(event) {
    if (event.target.type === "select-one"){
      try{
        this.setState({
          [event.target.name]: event.target.value
        }, () => this.handleSubmit(null));
      } catch (e) { }
    } else {
      this.setState({[event.target.name]: event.target.value ? parseInt(event.target.value) : ""});
    }
  }

  handleKeyPress(event) {
    if (event.key === 'Enter') {
      this.handleSubmit(null);
    }
  }

  handleSubmit(event) {
    if(this.state.data.dep[this.state.u_id]) {
      this.setState({id: this.state.u_id, type: this.state.u_type, tiles: this.state.u_tiles, nodes_in_best_paths: this.optimal_path(this.state.u_id, this.state.u_type)})
    } else {
      this.setState({u_id: "invalid"})
    }
    //event.preventDefault();
  }

  createLines(key) {
    const lines = []
    let obj = this.state.data.dep[this.state.id][key];

    if (obj.connectedCellIdList) {
      for (let c_id of obj.connectedCellIdList) {
        if(!this.state.data.dep[this.state.id][c_id]) continue;
        lines.push(<Line key={`${key}-${c_id}`}
                         borderColor={this.state.nodes_in_best_paths[c_id] ? "#ff0000": "#723131"}
                         borderStyle={this.state.nodes_in_best_paths[c_id] ? "solid": "dashed"}
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
    let colour = (this.colours[node.enhancementType]|| {[false]:"#efe0f0", [true]:"#f99eff"})[this.state.nodes_in_best_paths[key]]
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
          </div>
          <div
              style={styleBot}
              className="hexagon-bot"
          />
          {this.createLines(key)}
        </div>
    );
  };

  createBoxes () {
    const boxes = []
    for (let [key, value] of Object.entries(this.state.data.dep[this.state.id])) {
      boxes.push(
          this.createBox(value.pointY, value.pointX, key)
      )
    }
    return boxes;
  }

  options() {
    const opts = []
    for (let id of Object.keys(this.state.data.starts)){
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
              {this.state.u_type1 !== "ATTACK" && this.state.u_type2 !== "ATTACK" && <option value="ATTACK">Attack</option>}
              {this.state.u_type1 !== "HP" && this.state.u_type2 !== "HP" && <option value="HP">HP</option>}
              {this.state.u_type1 !== "DEFENSE" && this.state.u_type2 !== "DEFENSE" && <option value="DEFENSE">Defense</option>}
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
