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
      u_tiles: 60,
      u_type: "ATTACK",
      taken: {},
    };
    this.state.taken = this.best_path(3031, "ATTACK", 60)
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);

    this.colours = {
      "DEFENSE": {[false]:"#8691a7", [true]:"#0812a1"},
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
        //console.log("før", val.pointX, val.pointY);
        // TODO: Normalize off of min and max
        sub[val.charaEnhancementCellId] = {...val, 
          pointX: 100 + (val.pointX-1150) / 2 | 0,
          pointY: 200 +(val.pointY-1000) / 3 | 0,
        }

        if (val.enhancementType === "START") {
          start = val.charaEnhancementCellId
        }
        //console.log("etter", val.pointX, val.pointY);
      }

      if (Object.keys(sub).length !== 0){
        dep[key] = sub
        starts[key] = start
      }
    }
    //console.log(dep);
    //console.log(starts);
    
    
    return {dep, starts};
  }

  Comparator(a, b) {
    if (a[0] < b[0]) return 1;
    if (a[0] > b[0]) return -1;
    return 0;
  }

  count (obj, array) {
    let c = 0
    for (let n of array) {
      c += !obj[n]
    }
    return c;
  }

  best_path (id, type, max_tiles) {    
    console.log(id, type, max_tiles);
    
    if (!this.state.data.dep[id]) return "Not defined"
    const memo = []
    const taken = {[this.state.data.starts[id]]: true}   

    for (let c_id of this.state.data.dep[id][this.state.data.starts[id]].connectedCellIdList) {
      this.b_path(id, c_id, type, memo, taken, []);
    }
    
    for (let entry of memo.sort(this.Comparator)){
      if (Object.values(taken).reduce((a, b) => a + b, 0) + this.count(taken, entry[1]) <= max_tiles + 1) {
        for (let p of entry[1]) {
          taken[p] = true
        }
      }
    }

    /*let val = 0
    for (let node of Object.keys(taken)) {
      if (taken[node] && this.state.data.dep[id][node].enhancementType === type) {
        val += this.state.data.dep[id][node].effectValue
      }
    }*/
  
    return taken;
  }

  b_path (id, node, type, memo, taken, path=[], count=0, curr_val=0) {
    taken[node] = false
    count++;
    path = [...path, node]
    let obj = this.state.data.dep[id][node];
    if (obj.enhancementType === type) {
      curr_val += obj.effectValue;
      memo.push([curr_val / count, path])
    }
    if (obj.connectedCellIdList) {
      for (let c_id of obj.connectedCellIdList) {
        this.b_path(id, c_id, type, memo, taken, path, count, curr_val);
      }
    }
  }

  handleChange(event) {
    console.log(event.target, event.target.value);
    console.log(this.state);
    console.log(event.target.type);
    
    if (event.target.type === "select-one"){
      console.log("this", event.target.name, event.target.value);
      
      this.setState({[event.target.name]: event.target.value}, () => this.handleSubmit(null));
    } else {
       this.setState({[event.target.name]: event.target.value ? parseInt(event.target.value) : ""});
    }
  }

  handleKeyPress(event) {
    if (event.key === 'Enter') {
      console.log(this);
      
      this.handleSubmit(null);
    }
  }

  handleSubmit(event) {
    console.log("updating");
    
    if(this.state.data.dep[this.state.u_id]) {
      console.log("valid", this.state);
      
      this.setState({id: this.state.u_id, type: this.state.u_type, tiles: this.state.u_tiles, taken: this.best_path(this.state.u_id, this.state.u_type, this.state.u_tiles)})
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
        //console.log(obj.pointX, obj.pointY, this.state.data.dep[this.state.id][c_id].pointX, this.state.data.dep[this.state.id][c_id].pointY);
        lines.push(<Line key={`${key}-${c_id}`} 
          borderColor={this.state.taken[c_id] ? "#ff0000": "#723131"}
          borderStyle={this.state.taken[c_id] ? "solid": "dashed"}
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

    let colour = (this.colours[this.state.data.dep[this.state.id][key].enhancementType]|| {[false]:"#efe0f0", [true]:"#f99eff"})[this.state.taken[key]] 
    console.log(key, colour, this.state.taken[key]);
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
        />      
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
            Type:
            <select 
              value={this.state.u_type} 
              onChange={this.handleChange}
              name="u_type"
            >
              <option value="ATTACK">Attack</option>
              <option value="HP">HP</option>
              <option value="DEFENSE">Defense</option>
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
            {this.state.tiles - Object.values(this.state.taken).reduce((a, b) => a + b, 0) + 1} 
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
