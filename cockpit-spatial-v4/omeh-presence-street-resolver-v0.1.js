/* OmeH Presence Street Resolver™ v0.1
 * Une activation GPS, sans destination, situe l'observation par rapport
 * aux adresses PADA fixes et a leur rue officielle.
 * Ce lecteur est experimental et ne modifie jamais P0 ni la Zera du Cockpit.
 */
(function(root){
  'use strict';
  const VERSION='0.1.0';

  function wgs84ToUtm30(lat,lon){
    const a=6378137,e=.00669438,k=.9996,p=lat*Math.PI/180,l=lon*Math.PI/180,l0=-3*Math.PI/180,ep=e/(1-e),N=a/Math.sqrt(1-e*Math.sin(p)**2),T=Math.tan(p)**2,C=ep*Math.cos(p)**2,A=Math.cos(p)*(l-l0),M=a*((1-e/4-3*e**2/64-5*e**3/256)*p-(3*e/8+3*e**2/32+45*e**3/1024)*Math.sin(2*p)+(15*e**2/256+45*e**3/1024)*Math.sin(4*p)-35*e**3/3072*Math.sin(6*p));
    return{x:k*N*(A+(1-T+C)*A**3/6+(5-18*T+T**2+72*C-58*ep)*A**5/120)+500000,y:k*(M+N*Math.tan(p)*(A**2/2+(5-T+9*C+4*C**2)*A**4/24+(61-58*T+T**2+600*C-330*ep)*A**6/720)),crs:'EPSG:32630'};
  }
  function address(row,data){return{id:row[0],x:row[1],y:row[2],streetIndex:row[3],street:data.streets[row[3]],number:String(row[4]),zip:row[5]}}
  function distance(a,b){return Math.hypot(Number(a.x)-Number(b.x),Number(a.y)-Number(b.y))}
  function nearestAddresses(point,data,limit){
    return data.addresses.map(row=>{const a=address(row,data);return Object.assign(a,{distanceM:distance(point,a)})}).sort((a,b)=>a.distanceM-b.distanceM).slice(0,limit||5);
  }
  function project(point,a,b){
    const dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy,t=l2?Math.max(0,Math.min(1,((point.x-a[0])*dx+(point.y-a[1])*dy)/l2)):0,x=a[0]+t*dx,y=a[1]+t*dy;
    return{x,y,t,distanceM:Math.hypot(point.x-x,point.y-y),segmentLengthM:Math.sqrt(l2)};
  }
  function officialRoadProjection(point,streetIndex,data){
    let best=null;
    for(const road of data.roads){
      if(Number(road[1])!==Number(streetIndex))continue;
      for(let partIndex=0;partIndex<road[2].length;partIndex++){
        const line=road[2][partIndex];let before=0;
        for(let i=1;i<line.length;i++){
          const p=project(point,line[i-1],line[i]),chainageM=before+p.t*p.segmentLengthM;
          if(!best||p.distanceM<best.distanceM)best={roadId:road[0],partIndex,distanceM:p.distanceM,chainageM,x:p.x,y:p.y};
          before+=p.segmentLengthM;
        }
      }
    }
    return best;
  }
  function rankOnStreet(target,data){
    const rows=data.addresses.map(r=>address(r,data)).filter(a=>a.streetIndex===target.streetIndex).sort((a,b)=>Number(a.number)-Number(b.number)||a.id-b.id),index=rows.findIndex(a=>a.id===target.id);
    return{index:index<0?null:index+1,total:rows.length,position:index===0?'FIRST_INDEXED_ADDRESS':index===rows.length-1?'LAST_INDEXED_ADDRESS':'INDEXED_ADDRESS'};
  }
  function resolve(input){
    const data=input.data||root.TERRITORIAL_ANCHOR_DATA;
    if(!data)return{engine:'OmeH Presence Street Resolver™',version:VERSION,status:'LIBRARY_UNAVAILABLE'};
    const lat=Number(input.lat),lon=Number(input.lon),accuracyM=input.accuracyM==null?null:Number(input.accuracyM);
    if(!Number.isFinite(lat)||!Number.isFinite(lon))return{engine:'OmeH Presence Street Resolver™',version:VERSION,status:'INVALID_COORDINATES'};
    const point=wgs84ToUtm30(lat,lon),near=nearestAddresses(point,data,5),anchor=near[0]||null;
    if(!anchor)return{engine:'OmeH Presence Street Resolver™',version:VERSION,status:'NO_PADA_ADDRESS'};
    const road=officialRoadProjection(point,anchor.streetIndex,data);
    return{
      engine:'OmeH Presence Street Resolver™',version:VERSION,status:'STREET_PRESENCE_OBSERVED',generatedAt:new Date().toISOString(),
      logic:'ONE_GPS_SAMPLE_TO_NEAREST_FIXED_PADA_ADDRESS_AND_OFFICIAL_STREET',
      gpsObservation:{lat,lon,accuracyM,sampleCount:1,utm:point,role:'OVERVIEW_AND_STREET_PRESENCE_OBSERVATION'},
      observedStreet:{streetIndex:anchor.streetIndex,street:anchor.street,roadId:road&&road.roadId,partIndex:road&&road.partIndex,distanceToRoadM:road&&Number(road.distanceM.toFixed(3)),chainageM:road&&Number(road.chainageM.toFixed(3))},
      nearestPadaAddress:Object.assign({},anchor,{distanceM:Number(anchor.distanceM.toFixed(3)),rankOnStreet:rankOnStreet(anchor,data)}),
      nearbyPadaAddresses:near.map(a=>Object.assign({},a,{distanceM:Number(a.distanceM.toFixed(3))})),
      governance:{singleGpsObservation:true,padaAddressesAreFixed:true,doesNotResolveZera:true,doesNotMutateQedimah:true,isDeviceAccuracyClaim:false,rule:'OMEH_OBSERVES_STREET_INDEPENDENTLY_FOR_COMPARISON'}
    };
  }
  root.OmeHPresenceStreetResolver=Object.freeze({version:VERSION,resolve});
})(typeof window!=='undefined'?window:globalThis);
