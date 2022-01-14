import './index.css';
import reportWebVitals from './reportWebVitals';
import * as React from "react";
import ReactDOM from "react-dom";
import * as d3 from "d3";

const margin = {top: 30, right: 30, bottom: 60, left: 30},
  width = 450 - margin.left - margin.right,
  height = 900 - margin.top - margin.bottom;

let linkStrengthBoundary = 5;
const nodesData = [];
const linksData = [];
let max_x = 0;
let svg;

class LoadButton extends React.Component{
  constructor(props) {
    super(props);
    this.state = {value: ''};
    this.label = props.label;
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange (event) {
    this.setState({value: event.target.value});
  }

  render() {
    return (
      <form>
        <label>{this.label} </label>
        <input type="file" accept="csv" value={this.state.value} onChange={this.handleChange} />
      </form>
    );
  }
}

class AdjacencyMatrixLoadButton extends LoadButton {
  handleChange (event) {
    super.handleChange(event);
    adjacencyMatrixFile = event.target.files[0];
  }
}

class MetricsFileLoadButton extends LoadButton {
  handleChange (event) {
    super.handleChange(event);
    metricsFile = event.target.files[0];
  }
}

class LinkStrengthBoundaryButton extends React.Component{
  constructor(props){
    super(props);
    this.state = {value: linkStrengthBoundary * 10};
    this.handleChange = this.handleChange.bind(this);
  }
  handleChange(event){
    this.setState({value: event.target.value});
    linkStrengthBoundary = event.target.value / 10;
    if(svg){
      updateLinkVisibility();
    }
  }

  render(){
    return (
      <div>
        <input type="range" min="0" max="100" value={this.state.value} onChange={this.handleChange}></input>
        <div>{linkStrengthBoundary}</div>
        <label>Min link strength</label>
      </div>
    );
  }
}

function getFilteredLinkData() {
  return linksData.filter((d)=>d.strength >= linkStrengthBoundary)
}

function updateLinkVisibility(){
  const t = svg.transition().duration(250);
  d3.select('#flat_network')
    .select('g')
    .select('#links')
    .selectAll('line')
    .data(getFilteredLinkData(), d=> d)
    .join(
      enter => {
        enter
        .append('line')
        .attr("stroke", '#aaa')
        .attr("stroke-width", .3)
        .attr("x1", (d)=>nodesData[d.source].x/max_x * width) 
        .attr("y1", (d)=>nodesData[d.source].y/max_x * width)
        .attr("x2", (d)=>nodesData[d.target].x/max_x * width)
        .attr("y2", (d)=>nodesData[d.target].y/max_x * width);
      },
      update => {update.attr("stroke", "blue");
    },
      exit => {
        exit.remove()
      }
    )
}

async function getData(url){
  const text = await d3.text(url);
  const csvParsedList = d3.csvParseRows(text).map(row => row.map(val => parseFloat(val)));
  //TODO: check for header with button
  csvParsedList.shift();
  return csvParsedList;
}

let adjacencyMatrixFile;
let metricsFile;

async function generateNetwork(){
  const adjacencyMatrixUrl = window.URL.createObjectURL(adjacencyMatrixFile);
  const metricsUrl = window.URL.createObjectURL(metricsFile);
  const data = await Promise.all([getData(adjacencyMatrixUrl), getData(metricsUrl)]);
  const adjacencyMatrix = data[0];
  const metrics = data[1];

  for (let i = 0; i < metrics.length; i++){
    nodesData.push({
      "id": i.toString(),
      "x": metrics[i][0],
      "y": metrics[i][1],
      "z": metrics[i][2],
      "hemisphere": metrics[i][3],
      "size": metrics[i][4]
    })
  }
  nodesData.sort((a,b) => b.strength - a.strength);

  for (let i = 0; i <  adjacencyMatrix.length; i++){
    for (let j = 0; j < i; j++){
      linksData.push({
        "id": i.toString() + ";" + j.toString(),
        "source": i.toString(),
        "target": j.toString(),
        "strength": adjacencyMatrix[i][j]
      })
    }
  }



  max_x = Math.max.apply(Math, metrics.map(row => row[0]));
  
  svg = d3.select('#flat_network')
    .append('svg')
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svg.append('g')
    .attr('id', 'links')
    .selectAll('line')
    .data(getFilteredLinkData())
    .enter()
    .append('line')
    .attr("stroke", "#aaa")
    .attr("stroke-width", .3)
    .attr("x1", (d)=>nodesData[d.source].x/max_x * width) 
    .attr("y1", (d)=>nodesData[d.source].y/max_x * width)
    .attr("x2", (d)=>nodesData[d.target].x/max_x * width)
    .attr("y2", (d)=>nodesData[d.target].y/max_x * width)
    .attr("id", (d)=>d.id);

  svg.append('g')
    .attr('id', 'nodes')
    .selectAll('circle')
    .data(nodesData)
    .enter()
    .append("circle")
    .attr("cx", d=>d.x/max_x * width )
    .attr("cy", d=>d.y/max_x * width )
    .attr("r", d=>d.size*2.5)
    .style("fill", d=>{
      switch (d.hemisphere) {
        case 1:
          return "#1E90FF"
        case 2:
          return "#FF8C00"
        default:
          return "black"
      }
    }); 

}

const IndexPage = () => {
  return (
    <main>
      <AdjacencyMatrixLoadButton label="Adjacency matrix"/>
      <MetricsFileLoadButton label="Metrics file"/>
      <button onClick={generateNetwork}>Generate</button>
      <LinkStrengthBoundaryButton></LinkStrengthBoundaryButton>
      <div id="flat_network"></div>
    </main>
  )
}

export default IndexPage

ReactDOM.render(
  <IndexPage />,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
