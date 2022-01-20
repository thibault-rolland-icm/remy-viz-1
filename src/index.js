import './index.css';
import reportWebVitals from './reportWebVitals';
import * as React from "react";
import ReactDOM from "react-dom";
import * as d3 from "d3";

const margin = {top: 30, right: 30, bottom: 60, left: 30},
  width = 400 - margin.left - margin.right,
  height = 700 - margin.top - margin.bottom;

let linkStrengthBoundary = 5;
const nodesData = [];
const allLinksData = [];
const hemisphere1LinksData = [];
const hemisphere2LinksData = [];
let max_x = 0;
let max_y = 0;
let max_z = 0;
let mean_y = 0;
let topView;
let sideView1;
let sideView2;

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
    if(topView){
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
        .attr("x1", (d)=>nodesData[d.source].x/max_x * width) 
        .attr("y1", (d)=>(max_y - nodesData[d.source].y)/max_x * width)
        .attr("x2", (d)=>nodesData[d.target].x/max_x * width)
        .attr("y2", (d)=>(max_y - nodesData[d.target].y)/max_x * width);
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
        .attr("x1", (d)=>nodesData[d.source].y/max_x * width) 
        .attr("y1", (d)=>(max_z - nodesData[d.source].z)/max_x * width)
        .attr("x2", (d)=>nodesData[d.target].y/max_x * width)
        .attr("y2", (d)=>(max_z - nodesData[d.target].z)/max_x * width);
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
        .attr("x1", (d)=> (2 * mean_y - nodesData[d.source].y)/max_x * width) 
        .attr("y1", (d)=>(max_z - nodesData[d.source].z)/max_x * width)
        .attr("x2", (d)=> (2 * mean_y - nodesData[d.target].y)/max_x * width)
        .attr("y2", (d)=>(max_z - nodesData[d.target].z)/max_x * width);
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
      let dat = {"id": i.toString() + ";" + j.toString(),
      "source": i.toString(),
      "target": j.toString(),
      "strength": adjacencyMatrix[i][j]};
      allLinksData.push(dat)
      if (nodesData[i].hemisphere == 1 && nodesData[j].hemisphere == 1){
        hemisphere1LinksData.push(dat);
      }
      if (nodesData[i].hemisphere == 2 && nodesData[j].hemisphere == 2){
        hemisphere2LinksData.push(dat);
      }
    }
  }

  max_x = Math.max.apply(Math, metrics.map(row => row[0]));
  max_y = Math.max.apply(Math, metrics.map(row => row[1]));
  max_z = Math.max.apply(Math, metrics.map(row => row[2]));
  mean_y = metrics.map(row => row[1]).reduce((a,b) => a + b) / metrics.length;

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
    .attr("cx", d=>d.x/max_x * width )
    .attr("cy", d=>(max_y-d.y)/max_x * width )
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
    .attr("cx", d=>d.y/max_x * width )
    .attr("cy", d=>(max_z-d.z)/max_x * width )
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

    sideView2 = d3.select('#side_view_2')
    .append('svg')
    .attr("width", height + margin.left + margin.right)
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
    .attr("cx", d=>(2*mean_y- d.y)/max_x * width )
    .attr("cy", d=>(max_z-d.z)/max_x * width )
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
