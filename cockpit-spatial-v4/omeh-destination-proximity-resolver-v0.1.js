/* OmeH Destination Proximity Resolver™ v0.1
 * Une prise GPS unique + une destination PADA fixe.
 * Répond à : quelle distance sépare l'observation de la destination ?
 */
(function(root){
  'use strict';
  const VERSION='0.1.0',ZERA_M=0.36;
  function norm(v){return String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim()}
  function distance(a,b){return Math.hypot(Number(a.x)-Number(b.x),Number(a.y)-Number(b.y))}
  function wgs84ToUtm30(lat,lon){
    if(root.TerritorialAnchorResolver&&root.TerritorialAnchorResolver.wgs84ToUtm30)return root.TerritorialAnchorResolver.wgs84ToUtm30(lat,lon);
    const a=6378137,e=.00669438,k=.9996,p=lat*Math.PI/180,l=lon*Math.PI/180,l0=-3*Math.PI/180,ep=e/(1-e),N=a/Math.sqrt(1-e*Math.sin(p)**2),T=Math.tan(p)**2,C=ep*Math.cos(p)**2,A=Math.cos(p)*(l-l0),M=a*((1-e/4-3*e**2/64-5*e**3/256)*p-(3*e/8+3*e**2/32+45*e**3/1024)*Math.sin(2*p)+(15*e**2/256+45*e**3/1024)*Math.sin(4*p)-35*e**3/3072*Math.sin(6*p));
    return{x:k*N*(A+(1-T+C)*A**3/6+(5-18*T+T**2+72*C-58*ep)*A**5/120)+500000,y:k*(M+N*Math.tan(p)*(A**2/2+(5-T+9*C+4*C**2)*A**4/24+(61-58*T+T**2+600*C-330*ep)*A**6/720)),crs:'EPSG:32630'};
  }
  function address(row,data){return{id:row[0],x:row[1],y:row[2],streetIndex:row[3],street:data.streets[row[3]],number:String(row[4]),zip:row[5]}}
  function findDestination(query,data){
    if(query&&query.addressId!=null){const row=data.addresses.find(r=>String(r[0])===String(query.addressId));return row?[address(row,data)]:[]}
    const number=norm(query&&query.number),street=norm(query&&query.street);if(!number||!street)return[];
    return data.addresses.map(r=>address(r,data)).filter(a=>norm(a.number)===number&&norm(a.street)===street);
  }
  function rankOnStreet(target,data){const rows=data.addresses.map(r=>address(r,data)).filter(a=>a.streetIndex===target.streetIndex).sort((a,b)=>Number(a.number)-Number(b.number)||a.id-b.id),i=rows.findIndex(a=>a.id===target.id);return{index:i<0?null:i+1,total:rows.length,position:i===0?'FIRST_INDEXED_ADDRESS':i===rows.length-1?'LAST_INDEXED_ADDRESS':'INDEXED_ADDRESS',orderedBy:'PADA_ADDRESS_NUMBER'}}
  function nearest(point,data){let best=null;for(const row of data.addresses){const a=address(row,data),d=distance(point,a);if(!best||d<best.distanceM)best=Object.assign(a,{distanceM:d})}return best}
  function resolve(input){
    const data=input.data||root.TERRITORIAL_ANCHOR_DATA;if(!data)return{engine:'OmeH Destination Proximity Resolver™',version:VERSION,status:'LIBRARY_UNAVAILABLE'};
    const lat=Number(input.lat),lon=Number(input.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon))return{engine:'OmeH Destination Proximity Resolver™',version:VERSION,status:'INVALID_COORDINATES'};
    const matches=findDestination(input.destination||{},data),gps={lat,lon,accuracyM:input.accuracyM==null?null:Number(input.accuracyM),sampleCount:1};
    if(!matches.length)return{engine:'OmeH Destination Proximity Resolver™',version:VERSION,status:'DESTINATION_REQUIRED_OR_NOT_FOUND',gpsObservation:gps,destinationQuery:input.destination||null};
    if(matches.length>1)return{engine:'OmeH Destination Proximity Resolver™',version:VERSION,status:'DESTINATION_AMBIGUOUS',gpsObservation:gps,destinationQuery:input.destination,candidates:matches};
    const target=matches[0],point=wgs84ToUtm30(lat,lon),meters=distance(point,target);
    return{engine:'OmeH Destination Proximity Resolver™',version:VERSION,status:'DESTINATION_DISTANCE_COMPUTED',generatedAt:new Date().toISOString(),logic:'SINGLE_GPS_TO_FIXED_PADA_DESTINATION',question:'RESIDENT_DISTANCE_TO_TARGET',gpsObservation:Object.assign(gps,{role:'OVERVIEW_AND_PROXIMITY_OBSERVATION',utm:point}),destination:Object.assign({},target,{rankOnStreet:rankOnStreet(target,data)}),observedContext:{nearestPadaAddress:nearest(point,data)},measurement:{distanceM:Number(meters.toFixed(3)),distanceZeraEquivalent:Number((meters/ZERA_M).toFixed(3)),method:'EUCLIDEAN_EPSG_32630',isDeviceAccuracyClaim:false,interpretation:'DISTANCE_FROM_OBSERVED_GPS_TO_FIXED_PADA_TARGET'},governance:{padaTargetIsFixed:true,gpsObservationIsVariable:true,zeraPresenceResolved:false,rule:'PROXIMITY_DOES_NOT_PROVE_ZERA_PRESENCE'}};
  }
  root.OmeHDestinationProximityResolver=Object.freeze({version:VERSION,zeraMeters:ZERA_M,resolve});
})(typeof window!=='undefined'?window:globalThis);
