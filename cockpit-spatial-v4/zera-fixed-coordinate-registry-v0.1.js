/* Zera Fixed Coordinate Registry™ v0.1
 * Constitue des cellules de 0,36 m depuis la géométrie PADA EPSG:32630.
 * Les cellules sont déterministes et générées à la demande.
 * Le GPS observe une Présence; il ne crée ni ne déplace une cellule.
 */
(function(root){
  'use strict';
  const VERSION='0.1.0',ZERA_M=0.36,DEFAULT_WINDOW_CELLS=98,MIN_SAMPLES=4,CLEAR_MARGIN_M=0.18;
  const roadCache=new WeakMap();

  function wgs84ToUtm30(lat,lon){
    const a=6378137,e=.00669438,k=.9996,z=30,p=lat*Math.PI/180,l=lon*Math.PI/180,l0=((z-1)*6-177)*Math.PI/180,ep=e/(1-e),N=a/Math.sqrt(1-e*Math.sin(p)**2),T=Math.tan(p)**2,C=ep*Math.cos(p)**2,A=Math.cos(p)*(l-l0);
    const M=a*((1-e/4-3*e**2/64-5*e**3/256)*p-(3*e/8+3*e**2/32+45*e**3/1024)*Math.sin(2*p)+(15*e**2/256+45*e**3/1024)*Math.sin(4*p)-35*e**3/3072*Math.sin(6*p));
    return{x:k*N*(A+(1-T+C)*A**3/6+(5-18*T+T**2+72*C-58*ep)*A**5/120)+500000,y:k*(M+N*Math.tan(p)*(A**2/2+(5-T+9*C+4*C**2)*A**4/24+(61-58*T+T**2+600*C-330*ep)*A**6/720)),crs:'EPSG:32630'};
  }
  function utm30ToWgs84(x,y){
    const a=6378137,e=.00669438,k=.9996,e1=(1-Math.sqrt(1-e))/(1+Math.sqrt(1-e)),ep=e/(1-e);x-=500000;
    const M=y/k,mu=M/(a*(1-e/4-3*e**2/64-5*e**3/256)),p1=mu+(3*e1/2-27*e1**3/32)*Math.sin(2*mu)+(21*e1**2/16-55*e1**4/32)*Math.sin(4*mu)+(151*e1**3/96)*Math.sin(6*mu)+(1097*e1**4/512)*Math.sin(8*mu),N1=a/Math.sqrt(1-e*Math.sin(p1)**2),T1=Math.tan(p1)**2,C1=ep*Math.cos(p1)**2,R1=a*(1-e)/(1-e*Math.sin(p1)**2)**1.5,D=x/(N1*k);
    const lat=p1-N1*Math.tan(p1)/R1*(D**2/2-(5+3*T1+10*C1-4*C1**2-9*ep)*D**4/24+(61+90*T1+298*C1+45*T1**2-252*ep-3*C1**2)*D**6/720),lon=(-3*Math.PI/180)+(D-(1+2*T1+C1)*D**3/6+(5-2*C1+28*T1-3*C1**2+8*ep+24*T1**2)*D**5/120)/Math.cos(p1);
    return{lat:lat*180/Math.PI,lon:lon*180/Math.PI,crs:'EPSG:4326'};
  }
  function key(p){return p[0].toFixed(2)+'|'+p[1].toFixed(2)}
  function canonicalParts(road){return road[2].map(line=>{const copy=line.slice();if(key(copy[0])>key(copy[copy.length-1]))copy.reverse();return copy}).sort((a,b)=>key(a[0]).localeCompare(key(b[0])))}
  function lineLength(line){let total=0;for(let i=1;i<line.length;i++)total+=Math.hypot(line[i][0]-line[i-1][0],line[i][1]-line[i-1][1]);return total}
  function pointAt(line,chainage){let done=0;for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(done+length>=chainage||i===line.length-1){const t=length?Math.max(0,Math.min(1,(chainage-done)/length)):0;return{x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t}}done+=length}return{x:line[0][0],y:line[0][1]}}
  function median(values){if(!values.length)return null;const a=values.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
  function pad(n,w){return String(n).padStart(w,'0')}
  function metadata(data){
    let cache=roadCache.get(data);if(cache)return cache;
    cache=new Map();
    for(const road of data.roads){const parts=canonicalParts(road).map((line,partIndex)=>{const lengthM=lineLength(line);return{roadId:road[0],streetIndex:road[1],street:data.streets[road[1]],partIndex,line,lengthM,cellCount:Math.ceil(lengthM/ZERA_M)}});cache.set(road[0],parts)}
    roadCache.set(data,cache);return cache;
  }
  function getPart(data,roadId,partIndex){const parts=metadata(data).get(Number(roadId));return parts&&parts[Number(partIndex||0)]||null}
  function nearestPada(center,data,limit){
    return data.addresses.map(row=>({id:row[0],x:row[1],y:row[2],streetIndex:row[3],street:data.streets[row[3]],number:row[4],zip:row[5],distanceM:Math.hypot(center.x-row[1],center.y-row[2])})).sort((a,b)=>a.distanceM-b.distanceM).slice(0,limit||5);
  }
  function getCell(input){
    const data=input.data||root.TERRITORIAL_ANCHOR_DATA,part=getPart(data,input.roadId,input.partIndex);if(!part)return null;
    const index=Math.max(0,Math.min(part.cellCount-1,Math.trunc(Number(input.index)))),startM=index*ZERA_M,endM=Math.min(part.lengthM,startM+ZERA_M),centerM=(startM+endM)/2,start=pointAt(part.line,startM),center=pointAt(part.line,centerM),end=pointAt(part.line,endM),withAnchors=input.withAnchors!==false;
    return{zeraId:'ZTS.COCODY.R'+pad(part.roadId,4)+'.P'+pad(part.partIndex,2)+'.Z'+pad(index,6),territory:'COCODY',roadId:part.roadId,street:part.street,partIndex:part.partIndex,index,cellLengthM:ZERA_M,linearReference:{startM,endM,centerM},fixedCoordinate:{source:'PADA_ROAD_GEOMETRY',status:'COMPUTED',crs:'EPSG:4326',start:utm30ToWgs84(start.x,start.y),center:utm30ToWgs84(center.x,center.y),end:utm30ToWgs84(end.x,end.y)},utmCoordinate:{crs:'EPSG:32630',start,center,end},anchorConstellation:withAnchors?nearestPada(center,data,input.anchorLimit||5):[],validation:{level:'Z0',status:'COMPUTED_NOT_SURVEY_VALIDATED',groundTruthConfirmed:false},provenance:{registry:'Zera Fixed Coordinate Registry™',registryVersion:VERSION,library:data.schema,libraryVersion:data.version,geometryRule:'CANONICAL_PART_ENDPOINT_ORDER'}};
  }
  function roadSummary(input){const data=input.data||root.TERRITORIAL_ANCHOR_DATA,part=getPart(data,input.roadId,input.partIndex);if(!part)return null;return{roadId:part.roadId,street:part.street,partIndex:part.partIndex,lengthM:part.lengthM,cellCount:part.cellCount,firstZeraId:getCell({data,roadId:part.roadId,partIndex:part.partIndex,index:0,withAnchors:false}).zeraId,lastZeraId:getCell({data,roadId:part.roadId,partIndex:part.partIndex,index:part.cellCount-1,withAnchors:false}).zeraId}}
  function normalizeSamples(samples){return(Array.isArray(samples)?samples:[]).map((s,index)=>({index,lat:Number(s.lat==null?s.latitude:s.lat),lon:Number(s.lon==null?s.longitude:s.lon),accuracyM:Number(s.accuracyM==null?s.accuracy:s.accuracyM)})).filter(s=>Number.isFinite(s.lat)&&Number.isFinite(s.lon)).map(s=>Object.assign(s,{utm:wgs84ToUtm30(s.lat,s.lon)}))}
  function candidateCells(data,anchors,windowCells){
    const out=new Map(),radius=Math.max(1,Math.trunc(windowCells||DEFAULT_WINDOW_CELLS));
    anchors.filter(Boolean).forEach(anchor=>{const roadId=anchor.roadId||(anchor.road&&anchor.road.id),partIndex=anchor.partIndex==null?(anchor.road&&anchor.road.partIndex):anchor.partIndex,index=anchor.index==null?(anchor.zeraCell&&anchor.zeraCell.indexFromCanonicalPartStart):anchor.index,part=getPart(data,roadId,partIndex);if(!part||!Number.isFinite(Number(index)))return;const from=Math.max(0,Number(index)-radius),to=Math.min(part.cellCount-1,Number(index)+radius);for(let i=from;i<=to;i++){const cell=getCell({data,roadId,partIndex,index:i,withAnchors:false});out.set(cell.zeraId,cell)}});return Array.from(out.values())
  }
  function match(input){
    const data=input.data||root.TERRITORIAL_ANCHOR_DATA,samples=normalizeSamples(input.samples),previous=input.previousAnchor||null,current=input.currentAnchor||null,cells=candidateCells(data,[previous,current],input.windowCells);
    if(!samples.length||!cells.length)return{engine:'ZERA GPS MATCH™',version:VERSION,status:'INSUFFICIENT_DATA',sampleCount:samples.length,candidateCount:cells.length};
    const ranked=cells.map(cell=>{const distances=samples.map(sample=>({sampleIndex:sample.index,distanceM:Math.hypot(sample.utm.x-cell.utmCoordinate.center.x,sample.utm.y-cell.utmCoordinate.center.y)})),ordered=distances.slice().sort((a,b)=>a.distanceM-b.distanceM),values=distances.map(d=>d.distanceM);return{zeraId:cell.zeraId,roadId:cell.roadId,street:cell.street,partIndex:cell.partIndex,index:cell.index,fixedGpsCenter:cell.fixedCoordinate.center,minimumDistanceM:ordered[0].distanceM,medianDistanceM:median(values),maximumDistanceM:Math.max.apply(null,values),closestSampleIndex:ordered[0].sampleIndex,sampleDistances:distances}}).sort((a,b)=>a.medianDistanceM-b.medianDistanceM),best=ranked[0],second=ranked[1]||null,margin=second?second.medianDistanceM-best.medianDistanceM:null,previousIndex=previous&&previous.zeraCell&&previous.zeraCell.indexFromCanonicalPartStart,previousRoad=previous&&previous.road&&previous.road.id,sameReference=Number(previousRoad)===best.roadId&&Number(previous&&previous.road&&previous.road.partIndex)===best.partIndex,delta=sameReference&&Number.isFinite(previousIndex)?best.index-previousIndex:null;
    let status=!previous?'P1_FIXED_COORDINATE_CANDIDATE':samples.length<MIN_SAMPLES?'P2_PENDING_MORE_SAMPLES':margin!=null&&margin<CLEAR_MARGIN_M?'ZERA_GPS_MATCH_AMBIGUOUS':'ZERA_GPS_MATCH_CLEAR';
    const enriched=getCell({data,roadId:best.roadId,partIndex:best.partIndex,index:best.index,withAnchors:true});
    return{engine:'ZERA GPS MATCH™',version:VERSION,status,sampleCount:samples.length,candidateCount:ranked.length,governance:{minimumSamples:MIN_SAMPLES,clearMarginM:CLEAR_MARGIN_M,positionConfirmed:status==='ZERA_GPS_MATCH_CLEAR',rule:'FIXED_ZERA_COORDINATE_PLUS_PADA_PLUS_PREVIOUS_ANCHOR'},bestMatch:Object.assign({},best,{marginToSecondBestM:margin,distanceFromPreviousZera:delta==null?null:Math.abs(delta),signedDeltaFromPrevious:delta,anchorConstellation:enriched.anchorConstellation}),secondBest:second,ranked:ranked.slice(0,10)};
  }
  function depositObservation(input){const cell=input.cell;return{depositId:'PRESENCE-'+new Date().toISOString(),zeraId:cell&&cell.zeraId,observationType:input.type||'GPS_PRESENCE_OBSERVATION',coordinates:input.coordinates||null,capturedAt:input.capturedAt||new Date().toISOString(),status:input.confirmed?'ANCHOR_CONFIRMED':'ANCHOR_CANDIDATE',doesNotMutateFixedCoordinate:true}}
  function inventory(input){const data=input.data||root.TERRITORIAL_ANCHOR_DATA,roads=metadata(data);let parts=0,totalRoadMeters=0,totalZeraCells=0;roads.forEach(list=>list.forEach(part=>{parts++;totalRoadMeters+=part.lengthM;totalZeraCells+=part.cellCount}));return{registry:'Zera Fixed Coordinate Registry™',version:VERSION,generationMode:'DETERMINISTIC_LAZY',roads:roads.size,parts,totalRoadMeters,totalZeraCells,metersPerZera:ZERA_M}}
  root.ZeraFixedCoordinateRegistry=Object.freeze({version:VERSION,metersPerZera:ZERA_M,defaultWindowCells:DEFAULT_WINDOW_CELLS,minimumSamples:MIN_SAMPLES,clearMarginM:CLEAR_MARGIN_M,getCell,roadSummary,match,depositObservation,inventory,wgs84ToUtm30,utm30ToWgs84});
})(typeof window!=='undefined'?window:globalThis);
