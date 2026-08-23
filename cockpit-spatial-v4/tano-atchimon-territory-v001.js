/* Territory Canonical Fixture™ · Rue Tano Atchimon · V001
 * Constitue les 281 Zera de la voie PADA R11895 avant toute observation GPS.
 * La fixture ne crée aucune géométrie : elle matérialise les données PADA
 * déjà chargées par Territorial Anchor Library™.
 */
(function(root){
  'use strict';
  const VERSION='V001',ROAD_ID=11895,PART_INDEX=0,STREET='RUE TANO ATCHIMON';
  let cached=null;
  function freeze(value){
    if(value&&typeof value==='object'&&!Object.isFrozen(value)){
      Object.keys(value).forEach(function(key){freeze(value[key]);});
      Object.freeze(value);
    }
    return value;
  }
  function round7(value){return Number(Number(value).toFixed(7));}
  function build(){
    if(cached)return cached;
    const data=root.TERRITORIAL_ANCHOR_DATA;
    const coordinates=root.ZeraFixedCoordinateRegistry;
    const domains=root.ZeraAddressDomainRegistry;
    if(!data||!coordinates||!domains){
      return{schema:'ZERA_CANONICAL_STREET_TERRITORY',version:VERSION,status:'DEPENDENCIES_UNAVAILABLE',missing:{territorialData:!data,fixedCoordinateRegistry:!coordinates,addressDomainRegistry:!domains}};
    }
    const roadSummary=coordinates.roadSummary({data:data,roadId:ROAD_ID,partIndex:PART_INDEX});
    if(!roadSummary||roadSummary.street!==STREET)return{schema:'ZERA_CANONICAL_STREET_TERRITORY',version:VERSION,status:'PADA_ROAD_NOT_FOUND',roadId:ROAD_ID,street:STREET};
    const addressDomains=domains.domainsForRoad({data:data,roadId:ROAD_ID,partIndex:PART_INDEX});
    const domainByCell=new Map();
    addressDomains.forEach(function(domain){
      for(let index=domain.zeraReservation.startIndex;index<=domain.zeraReservation.endIndex;index++){
        if(!domainByCell.has(index))domainByCell.set(index,[]);
        domainByCell.get(index).push(domain.domainId);
      }
    });
    const cells=[];
    for(let index=0;index<roadSummary.cellCount;index++){
      const source=coordinates.getCell({data:data,roadId:ROAD_ID,partIndex:PART_INDEX,index:index,withAnchors:false});
      cells.push({
        zeraId:source.zeraId,index:index,streetId:'R'+ROAD_ID,roadId:ROAD_ID,partIndex:PART_INDEX,
        metric:{unit:'ZERA',metersPerZera:coordinates.metersPerZera,startM:source.linearReference.startM,endM:source.linearReference.endM,centerM:source.linearReference.centerM},
        fixedGps:{lat:round7(source.fixedCoordinate.center.lat),lon:round7(source.fixedCoordinate.center.lon),status:'COMPUTED_FROM_PADA_ROAD_GEOMETRY',surveyValidated:false},
        fixedUtm:{x:Number(source.utmCoordinate.center.x.toFixed(2)),y:Number(source.utmCoordinate.center.y.toFixed(2)),crs:'EPSG:32630'},
        adjacency:{previous:index>0?cells[index-1].zeraId:null,next:index<roadSummary.cellCount-1?'ZTS.COCODY.R'+String(ROAD_ID).padStart(4,'0')+'.P00.Z'+String(index+1).padStart(6,'0'):null},
        addressDomainIds:domainByCell.get(index)||[],
        icl:{pcntV31:null,constitutionV22:null,status:'PENDING_DUAL_ENGINE_CONSTITUTION'},
        territorialObjects:[],validation:{level:'Z0',status:'COMPUTED_NOT_SURVEY_VALIDATED'}
      });
    }
    const addresses=addressDomains.map(function(domain){
      return{
        domainId:domain.domainId,padaAddressId:domain.identity.padaAddressId,number:domain.identity.civicNumber,street:domain.identity.streetName,
        fixedUtm:domain.projection.addressUtm,projection:{chainageM:domain.projection.chainageM,lateralDistanceM:domain.projection.lateralDistanceM},
        zeraReservation:domain.zeraReservation,status:domain.status,allocationMethod:domain.longitudinalAllocation.method,
        parcelGeometryStatus:domain.governance.parcelGeometryStatus,source:'PADA_ADDRESS_PLUS_PADA_OFFICIAL_STREET'
      };
    });
    cached=freeze({
      schema:'ZERA_CANONICAL_STREET_TERRITORY',schemaVersion:'1.0.0',territoryId:'ZTS.COCODY.R11895',territoryVersion:VERSION,status:'TERRITORY_READY',territoryType:'STREET',territory:'COCODY',
      street:{roadId:ROAD_ID,streetId:'R11895',name:STREET,partIndex:PART_INDEX,lengthM:roadSummary.lengthM,geometrySource:'PADA_ROAD_GEOMETRY',sourceCrs:'EPSG:32630'},
      entry:{zeraId:roadSummary.firstZeraId,fixedGps:cells[0].fixedGps,iclStatus:'PENDING_DUAL_ENGINE_CONSTITUTION'},
      exit:{zeraId:roadSummary.lastZeraId,fixedGps:cells[cells.length-1].fixedGps,iclStatus:'PENDING_DUAL_ENGINE_CONSTITUTION'},
      zeraRegistry:{metersPerZera:coordinates.metersPerZera,count:cells.length,firstZeraId:roadSummary.firstZeraId,lastZeraId:roadSummary.lastZeraId,cells:cells},
      zeraGraph:{type:'LINEAR_ADJACENCY_GRAPH',nodeCount:cells.length,edgeCount:Math.max(0,cells.length-1),allTransitionsPreconstituted:true},
      addressDomains:{count:addresses.length,allocationStatus:'PROVISIONAL_ADDRESS_DOMAIN',allocationMethod:'NEIGHBOR_MIDPOINTS',items:addresses},
      qedimah:{status:'QEDEMAH_READY',generation:1,law:'P0_PRECEDES_P1_WITH_COMPLETE_STREET_ZERA_POTENTIAL',gpsMayObserveButCannotCreateCell:true},
      provenance:{territorialLibrary:data.schema,territorialLibraryVersion:data.version,addressSource:data.source.addresses,roadSource:data.source.roads,coordinatePrecisionM:data.coordinatePrecisionM,fixture:'Territory Canonical Fixture™ · Rue Tano Atchimon',fixtureVersion:VERSION},
      governance:{googleRequired:false,gpsRole:'OBSERVATION_ONLY',fixedTerritoryAuthority:'PADA',iclBindingRule:'SAME_FIXED_ZERA_GPS_TO_BOTH_ICL_ENGINES',surveyClaim:false}
    });
    return cached;
  }
  function getCell(index){const territory=build();return territory.status==='TERRITORY_READY'?territory.zeraRegistry.cells[Number(index)]||null:null;}
  function getDomain(number){const territory=build();return territory.status==='TERRITORY_READY'?territory.addressDomains.items.find(function(item){return Number(item.number)===Number(number);})||null:null;}
  function summary(){const territory=build();if(territory.status!=='TERRITORY_READY')return territory;return{territoryId:territory.territoryId,territoryVersion:territory.territoryVersion,status:territory.status,street:territory.street,zeraCount:territory.zeraRegistry.count,firstZeraId:territory.zeraRegistry.firstZeraId,lastZeraId:territory.zeraRegistry.lastZeraId,addressCount:territory.addressDomains.count,entry:territory.entry,exit:territory.exit,qedimah:territory.qedimah,provenance:territory.provenance};}
  root.TanoAtchimonTerritoryV001=Object.freeze({version:VERSION,roadId:ROAD_ID,street:STREET,build:build,getCell:getCell,getDomain:getDomain,summary:summary});
})(typeof window!=='undefined'?window:globalThis);
