import React, { Component } from 'react';
import SatSetting from './SatSetting';
import SatelliteList from './SatelliteList';
import { NEARBY_SATELLITE, STARLINK_CATEGORY, SAT_API_KEY, SATELLITE_POSITION_URL} from '../constant';
import Axios from 'axios';
import WorldMap from './WorldMap';
import * as d3Scale from 'd3-scale';
import { schemeCategory10  } from 'd3-scale-chromatic';
import { timeFormat as d3TimeFormat } from 'd3-time-format';
import { select as d3Select } from 'd3-selection';
import { geoKavrayskiy7 } from 'd3-geo-projection';


const width = 960;
const height = 600;
class Main extends Component {
    constructor(){
        super();
        this.state={
            satInfo: null,
            satPositions: null,
            showStatelliteLoading: false,
            loadingSatPosition: false,
            setting: undefined,
            selected: []
        }
        //reference for the canvas html element in worldmap
        this.refTrack = React.createRef();
    }
    showNearbySatellite = (setting) =>{
        this.setState({
            setting: setting,
        })
       this.fetchSatellite(setting);
    }

    fetchSatellite = (setting) => {
        const {observerLat, observerLong, observerAlt, radius} = setting;
        const url = `${NEARBY_SATELLITE}/${observerLat}/${observerLong}/${observerAlt}/${radius}/${STARLINK_CATEGORY}/&apiKey=${SAT_API_KEY}`;
        //发送请求之前，页面显示loading
        this.setState({ showStatelliteLoading: true})
        //请求发送后 异步操作
        //get--发送请求
        //then-- 请求成功，返回结果后做一系列事（函数体）
        //catch-- 请求失败，返回捕获到的一些error
        Axios.get(url)
            .then(response =>{
                this.setState({
                    satInfo: response.data,
                    showStatelliteLoading: false,
                    selected : [],
                })
            })
            .catch(error =>{
                console.log('err in fetch satellite -> ', error);
                this.setState({
                    showStatelliteLoading: false,
                })
            })
    }
    //check box in Satellite list involving "track on the map" button
    //the button would be hover if there are some of the satellites in the list is selected
    addOrRemove = (item, status) => {
        let { selected: list } = this.state;
        //let list = this.state.selected;
        //
        const found = list.some( entry => entry.satid === item.satid);
  
        if(status && !found){
            list.push(item)
        }
        //remove the satellites unchecked.
        //using filter keep the satellites which satid is not the item(unchecked)'s satid
        if(!status && found){
            list = list.filter( entry => {
                return entry.satid !== item.satid;
            });
        }
        console.log(list);
        this.setState({
            selected: list
        })
    }

    trackOnClick = (duration)=>{
        console.log(duration);
        const {observerLat, observerLong, observerEle} = this.state.setting;
        const endTime = duration *60;
        this.setState({ 
            loadingSatPositions: true,
            duration: duration,
        });
        //The urls here is mapping all the selected satellites and get all urls.
        const urls = this.state.selected.map( sat => {
          const { satid } = sat;
          const url = `${SATELLITE_POSITION_URL}/${satid}/${observerLat}/${observerLong}/${observerEle}/${endTime}/&apiKey=${SAT_API_KEY}`;
          return Axios.get(url);
        });
        //.all: 处理多个请求的结果
        Axios.all(urls)
        .then(
            //get all data
            //spread一一解析传进来的所有response
            Axios.spread((...args) => {
                return args.map(item => item.data);
            })
        )
        .then( res => {
            //set the data 
            this.setState({
                satPositions: res,
                loadingSatPositions: false,
            });
            this.track();
        })
        .catch( e => {
            console.log('err in fetch satellite position -> ', e.message);
        })
    }
    //drawing(track) on the worldmap
    track = () => {
        const data = this.state.satPositions;
  
        const len = data[0].positions.length;
        const startTime = this.state.duration; //
        
        const canvas2 = d3Select(this.refTrack.current)
              .attr("width", width)
              .attr("height", height);
        const context2 = canvas2.node().getContext("2d");
  
        let now = new Date();
        let i = startTime;
        //setIntervel用于每隔1s运行前面的函数, 1s一打点
        //前面的函数用来作画，先把前面的点擦除一下，再画新的点
        let timer = setInterval( () => {
            let timePassed = Date.now() - now;
            if(i === startTime) {
                now.setTime(now.getTime() + startTime * 60)
            }
  
            let time = new Date(now.getTime() + 60 * timePassed);
            //clearRect擦除整个画布
            context2.clearRect(0, 0, width, height);
            //map最上方的时间显示
            context2.font = "bold 14px sans-serif";
            context2.fillStyle = "#333";
            context2.textAlign = "center";
            context2.fillText(d3TimeFormat(time), width / 2, 10);
            //i >= len ??
            if(i >= len) {
                clearInterval(timer);
                this.setState({isDrawing: false});
                const oHint = document.getElementsByClassName('hint')[0];
                oHint.innerHTML = ''
                return;
            }
            data.forEach( sat => {
                const { info, positions } = sat;
                this.drawSat(info, positions[i], context2)
            });
  
            i += 60;
        }, 1000)
    }
  
    drawSat = (sat, pos, context2) => {
        const { satlongitude, satlatitude } = pos;
        if(!satlongitude || !satlatitude ) return;
        const { satname } = sat;
        const nameWithNumber = satname.match(/\d+/g).join('');
  
        const projection = geoKavrayskiy7()
              .scale(170)
              .translate([width / 2, height / 2])
              .precision(.1);
  
        const xy = projection([satlongitude, satlatitude]);
        context2.fillStyle = d3Scale.scaleOrdinal(schemeCategory10)(nameWithNumber);
        context2.beginPath();
        //这里是卫星的形状画图，包括一个实心圆 + starlink的id(数字)
        //arc表示画一个弧线表示圆
        context2.arc(xy[0], xy[1], 4, 0, 2*Math.PI);
        context2.fill();
        context2.font = "bold 11px sans-serif";
        context2.textAlign = "center";
        context2.fillText(nameWithNumber, xy[0], xy[1]+14);
    }
  
  
    render() {
        return ( 
            <div className = "main" >
                <div className = "left-side" >
                    <SatSetting onShow = {this.showNearbySatellite}/>
                    <SatelliteList satInfo = {this.state.satInfo}
                                   loading = {this.state.showStatelliteLoading}
                                   onSelectionChange = {this.addOrRemove}
                                   disableTrack = {this.state.selected.length === 0}
                                   trackOnclick={this.trackOnClick}
                    />
                </div> 
            <div className = "right-side" >
                <WorldMap 
                    refTrack={this.refTrack}
                    loading = {this.state.loadingSatPositions}/>
            </div> 
            </div>
        );
    }
}
export default Main;