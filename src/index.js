import './index.css';
import reportWebVitals from './reportWebVitals';
import * as React from "react";
import ReactDOM from "react-dom";
import * as d3 from "d3";

const leftNodeColor = "#FF8C00";
const rightNodeColor = "#1E90FF";
const defaultNodeColor = "black";

const margin = {top: 30, right: 30, bottom: 30, left: 30},
  width = 450 - margin.left - margin.right,
  height = 450 - margin.top - margin.bottom;

const R = 12;

let linkStrengthBoundary = 1;
const nodesData = [];
const allLinksData = [];
const hemisphere1LinksData = [];
const hemisphere2LinksData = [];
let max_x;
let max_y;
let max_z;
let min_x;
let min_y ;
let min_z;
let mean_x;
let mean_y;
let mean_z;
let max_r;
let scaling_factor;
let topView;
let sideView1;
let sideView2;
let adjacencyMatrixFile;
let metricsFile;

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
    this.state = {value: linkStrengthBoundary};
    this.handleChange = this.handleChange.bind(this);
  }
  handleChange(event){
    this.setState({value: event.target.value});
    linkStrengthBoundary = Math.exp(event.target.value) -1;
    if(topView){
      updateLinkVisibility();
    }
  }

  render(){
    return (
      <div>
        <input type="range" min="0" max="2.5" step=".0001" value={this.state.value} onChange={this.handleChange}></input>
        <div>{linkStrengthBoundary}</div>
        <label>Min link strength</label>
      </div>
    );
  }
}

function getFilteredLinkData(linksData) {
  return linksData.filter((d)=>d.strength >= linkStrengthBoundary)
}

function updateLinkVisibility(){
  d3.select('#top_view')
    .select('#links')
    .selectAll('line')
    .data(getFilteredLinkData(allLinksData), d => d.id)
    .join(
      enter => {
        enter
        .append('line')
        .attr("stroke", '#aaa')
        .attr("stroke-width", .3)
        .attr("x1", (d)=>getXTopView(nodesData[d.source])) 
        .attr("y1", (d)=>getYTopView(nodesData[d.source]))
        .attr("x2", (d)=>getXTopView(nodesData[d.target]))
        .attr("y2", (d)=>getYTopView(nodesData[d.target]));
      },
      update => {},
      exit => {
        exit.remove()
      }
    );

    d3.select('#side_view_1')
    .select('#links')
    .selectAll('line')
    .data(getFilteredLinkData(hemisphere1LinksData), d => d.id)
    .join(
      enter => {
        enter
        .append('line')
        .attr("stroke", '#aaa')
        .attr("stroke-width", .3)
        .attr("x1", (d)=>getXSideView1(nodesData[d.source])) 
        .attr("y1", (d)=>getYSideView1(nodesData[d.source]))
        .attr("x2", (d)=>getXSideView1(nodesData[d.target]))
        .attr("y2", (d)=>getYSideView1(nodesData[d.target]));
      },
      update => {},
      exit => {
        exit.remove()
      }
    );


    d3.select('#side_view_2')
    .select('#links')
    .selectAll('line')
    .data(getFilteredLinkData(hemisphere2LinksData), d => d.id)
    .join(
      enter => {
        enter
        .append('line')
        .attr("stroke", '#aaa')
        .attr("stroke-width", .3)
        .attr("x1", (d)=> getXSideView2(nodesData[d.source])) 
        .attr("y1", (d)=> getYSideView2(nodesData[d.source]))
        .attr("x2", (d)=> getXSideView2(nodesData[d.target]))
        .attr("y2", (d)=> getYSideView2(nodesData[d.target]));
      },
      update => {},
      exit => {
        exit.remove()
      }
    );
}

async function getData(url){
  const text = await d3.text(url);
  const csvParsedList = d3.csvParseRows(text).map(row => row.map(val => parseFloat(val)));
  //TODO: check for header with button
  csvParsedList.shift();
  return csvParsedList;
}

function getXTopView(d){
  return d.x * width;
}
function getYTopView(d){
  return (1 - d.y) * width;
}
function getXSideView1(d){
  return d.y * width;
}
function getYSideView1(d){
  return (1 - d.z) * width;
}
function getXSideView2(d){
  return (1 - d.y) * width;
}
function getYSideView2(d){
  return (1 - d.z) * width;
}
function getR(d){
  return d.size / max_r * R;
}

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
  max_x = Math.max.apply(Math, nodesData.map(row => row.x));
  max_y = Math.max.apply(Math, nodesData.map(row => row.y));
  max_z = Math.max.apply(Math, nodesData.map(row => row.z));
  min_x = Math.min.apply(Math, nodesData.map(row => row.x));
  min_y = Math.min.apply(Math, nodesData.map(row => row.y));
  min_z = Math.min.apply(Math, nodesData.map(row => row.z));
  mean_x = nodesData.map(row => row.x).reduce((a,b) => a + b) / nodesData.length;
  mean_y = nodesData.map(row => row.y).reduce((a,b) => a + b) / nodesData.length;
  mean_z = nodesData.map(row => row.z).reduce((a,b) => a + b) / nodesData.length;
  max_r = Math.max.apply(Math, nodesData.map(row => row.size));
  scaling_factor = Math.max(max_x - min_x, max_y - min_y, max_z - min_z);
  for (let node of nodesData){
    node.x = (node.x - min_x) / scaling_factor;
    node.y = (node.y - min_y) / scaling_factor;
    node.z = (node.z - min_z) / scaling_factor;
  }
  nodesData.sort((a,b) => b.strength - a.strength);

  for (let i = 0; i <  adjacencyMatrix.length; i++){
    for (let j = 0; j < i; j++){
      if (adjacencyMatrix[i][j] == 0) {continue;}
      let dat = {"id": i.toString() + ";" + j.toString(),
      "source": i.toString(),
      "target": j.toString(),
      "strength": adjacencyMatrix[i][j]};
      allLinksData.push(dat);
      if (nodesData[i].hemisphere == 1 && nodesData[j].hemisphere == 1){
        hemisphere1LinksData.push(dat);
      }
      if (nodesData[i].hemisphere == 2 && nodesData[j].hemisphere == 2){
        hemisphere2LinksData.push(dat);
      }
    }
  }

  topView = d3.select('#top_view')
    .append('svg')
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  topView.append('g')
    .attr('id', 'links');

  topView.append('g')
    .attr('id', 'nodes')
    .selectAll('circle')
    .data(nodesData)
    .enter()
    .append("circle")
    .attr("cx", getXTopView)
    .attr("cy", getYTopView)
    .attr("r", getR)
    .style("fill", d=>{
      switch (d.hemisphere) {
        case 1:
          return leftNodeColor
        case 2:
          return rightNodeColor
        default:
          return defaultNodeColor
      }
    }); 

  sideView1 = d3.select('#side_view_1')
    .append('svg')
    .attr("width", height + margin.left + margin.right)
    .attr("height", width + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


  sideView1.append('g')
    .attr('id', 'links');

  sideView1.append('g')
    .attr('id', 'nodes')
    .selectAll('circle')
    .data(nodesData)
    .enter()
    .filter(function(d) { return d.hemisphere == 1 })
    .append("circle")
    .attr("cx", getXSideView1)
    .attr("cy", getYSideView1)
    .attr("r", getR)
    .style("fill", d=>{
      switch (d.hemisphere) {
        case 1:
          return leftNodeColor
        case 2:
          return rightNodeColor
        default:
          return defaultNodeColor
      }
    }); 

    sideView2 = d3.select('#side_view_2')
    .append('svg')
    .attr("width", width + margin.top + margin.bottom)
    .attr("height", width + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


  sideView2.append('g')
    .attr('id', 'links');

  sideView2.append('g')
    .attr('id', 'nodes')
    .selectAll('circle')
    .data(nodesData)
    .enter()
    .filter(function(d) { return d.hemisphere == 2 })
    .append("circle")
    .attr("cx", getXSideView2 )
    .attr("cy", getYSideView2 )
    .attr("r", getR)
    .style("fill", d=>{
      switch (d.hemisphere) {
        case 1:
          return leftNodeColor
        case 2:
          return rightNodeColor
        default:
          return defaultNodeColor
      }
    }); 

    updateLinkVisibility();
}

const IndexPage = () => {
  return (
    <main>
      <AdjacencyMatrixLoadButton label="Adjacency matrix"/>
      <MetricsFileLoadButton label="Metrics file"/>
      <button onClick={generateNetwork}>Generate</button>
      <LinkStrengthBoundaryButton></LinkStrengthBoundaryButton>
      <div id="networks">
        <div id="top_view"></div>
        <div id="side_networks">
          <div id="side_view_1"></div>
          <div id="side_view_2"></div>
        </div>
      </div>
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
