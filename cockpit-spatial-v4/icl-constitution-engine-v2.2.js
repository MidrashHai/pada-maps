(function () {
  "use strict";

  const ENGINE_VERSION = "2.2";
  const PCNT_VERSION = "3.0";
  const SEQUENCE_ID = "SEQ✦ICL✦CONSTITUTE✦001";
  const SEQUENCE_VERSION = "1.0";
  const CONTRACT_STATUS = "COMPILED";

  // Pont canonique vers le témoin historique. Ces valeurs reprennent les tables
  // de genQuatreShem sans modifier le chemin de calcul v3.1.
  const MAKOM_TBL = {
    0:{h:'מָקוֹם עֵין הַמָּקוֹם',l:'Makom Ein haMakom',fr:'Le Lieu du Regard Fondateur',s:'Ce lieu voit ce qui précède toute forme · la vision est sa nature constitutive'},
    1:{h:'מָקוֹם רֵאשִׁית',l:'Makom Reshit',fr:"Le Lieu de l'Origine",s:"Ce lieu porte en lui le commencement · l'impulsion naît ici"},
    2:{h:'מָקוֹם הַבַּיִת',l:'Makom haBayit',fr:'Le Lieu de la Demeure',s:"Ce lieu est structure vivante · il protège ce qui s'y loge"},
    3:{h:'מָקוֹם הַנָּהָר',l:'Makom haNahar',fr:'Le Lieu du Fleuve',s:'Ce lieu transmet en circulant · le passage lui-même est la révélation'},
    4:{h:'מָקוֹם הַסַּף',l:'Makom haSaf',fr:'Le Lieu du Seuil',s:'Ce lieu est seuil constitutif · ce qui entre est déjà en train de traverser'},
    5:{h:'מָקוֹם הָאוֹר',l:'Makom haOr',fr:'Le Lieu de la Lumière',s:"Ce lieu révèle · ce qui y entre ne reste pas dans l'ombre"},
    6:{h:'מָקוֹם הַצִּיר',l:'Makom haTzir',fr:"Le Lieu de l'Axe",s:'Ce lieu est point de connexion · il relie ce qui ne pouvait se rejoindre'},
    7:{h:'מָקוֹם הַהַבְחָנָה',l:'Makom haHavhanah',fr:'Le Lieu du Discernement',s:'Ce lieu tranche avec justesse · la coupure juste est sa loi'},
    8:{h:'מָקוֹם הַמָּעוֹן',l:'Makom haMaon',fr:"Le Lieu de l'Abri",s:"Ce lieu protège · l'espace protégé est sa première nature"},
    9:{h:'מָקוֹם הַסּוֹד',l:'Makom haSod',fr:'Le Lieu du Secret',s:"Ce lieu porte ce qui n'est pas encore visible · la gestation est sa loi"}
  };
  const SHAAR_TBL = {
    0:{h:'שַׁעַר הָרְאִיָּה',l:"Sha'ar haR'iyah",fr:'La Porte de la Vision',s:'La porte filtre par le regard · seul ce qui peut être vu entre'},
    1:{h:'שַׁעַר הָרֵאשִׁית',l:"Sha'ar haReshit",fr:"La Porte de l'Origine",s:"La porte réinitialise · ce qui entre recommence depuis l'origine"},
    2:{h:'שַׁעַר הַבַּיִת',l:"Sha'ar haBayit",fr:'La Porte de la Demeure',s:'La porte accueille · elle reçoit dans un espace constitué'},
    3:{h:'שַׁעַר הַמַּסָּע',l:"Sha'ar haMasa",fr:'La Porte du Voyage',s:'La porte met en mouvement · ce qui entre sort en direction'},
    4:{h:'שַׁעַר הַמַּעֲבָר',l:"Sha'ar haMaavar",fr:'La Porte du Passage',s:"La porte est elle-même le passage · franchir est l'acte"},
    5:{h:'שַׁעַר הַגִּלּוּי',l:"Sha'ar haGilui",fr:'La Porte de la Révélation',s:'La porte révèle · ce qui était caché devient lisible en franchissant'},
    6:{h:'שַׁעַר הַחִבּוּר',l:"Sha'ar haHibbur",fr:'La Porte de la Connexion',s:"La porte relie · traverser ici c'est entrer dans un réseau"},
    7:{h:'שַׁעַר הַהַבְחָנָה',l:"Sha'ar haHavhanah",fr:'La Porte du Discernement',s:"La porte sépare · seul ce qui a traversé l'épreuve continue"},
    8:{h:'שַׁעַר הַקַּבָּלָה',l:"Sha'ar haKabalah",fr:'La Porte de la Réception',s:"La porte prépare ce qu'elle reçoit · la réception est conditionnée"},
    9:{h:'שַׁעַר הַבִּכּוּרִים',l:"Sha'ar haBikkurim",fr:'La Porte des Premiers Fruits',s:"La porte s'ouvre à maturité · pas à la demande"}
  };
  const MISHKAN_TBL = {
    0:{h:'מִשְׁכַּן הָאַיִן',l:'Mishkan haAyin',fr:'La Demeure du Regard',s:"Ce qui sort d'ici a été vu avant d'être formulé · la vision précède"},
    1:{h:'מִשְׁכַּן הָרֵאשִׁית',l:'Mishkan haReshit',fr:"La Demeure de l'Origine",s:"Ce qui sort d'ici porte une impulsion première · une fondation naît"},
    2:{h:'מִשְׁכַּן הַבַּיִת',l:'Mishkan haBayit',fr:'La Demeure de la Maison',s:"Ce qui sort d'ici est logé · il porte la structure de ce lieu"},
    3:{h:'מִשְׁכַּן הַנָּהָר',l:'Mishkan haNahar',fr:'La Demeure du Fleuve',s:"Ce qui sort d'ici est en mouvement · il transmet en circulant"},
    4:{h:'מִשְׁכַּן הַפֶּתַח',l:'Mishkan haPetah',fr:"La Demeure de l'Ouverture",s:"Ce qui sort d'ici s'ouvre · le seuil franchi donne direction"},
    5:{h:'מִשְׁכַּן הָאוֹר',l:'Mishkan haOr',fr:'La Demeure de la Lumière',s:"Ce qui sort d'ici éclaire · la révélation est son accomplissement"},
    6:{h:'מִשְׁכַּן הַחִבּוּר',l:'Mishkan haHibbur',fr:'La Demeure de la Connexion',s:"Ce qui sort d'ici relie · le lien établi ici ne se défait pas"},
    7:{h:'מִשְׁכַּן הַבֵּירּוּר',l:'Mishkan haBirrur',fr:'La Demeure du Discernement',s:"Ce qui sort d'ici est purifié · la coupure juste a opéré"},
    8:{h:'מִשְׁכַּן הַשּׁוֹמֵר',l:'Mishkan haShomer',fr:'La Demeure du Gardien',s:"Ce qui sort d'ici est protégé · le lieu a tenu son rôle de garde"},
    9:{h:'מִשְׁכַּן הַלֵּידָה',l:'Mishkan haLeidah',fr:'La Demeure de la Naissance',s:"Ce qui sort d'ici est né · la gestation s'est accomplie"}
  };

  function auditDependencies() {
    const checks = {
      LM: typeof LM !== 'undefined',
      SHEM_FAMILLE: typeof SHEM_FAMILLE !== 'undefined',
      entierToSeq: typeof entierToSeq === 'function',
      readSeqWithCodex: typeof readSeqWithCodex === 'function',
      genShemFamille: typeof genShemFamille === 'function',
      genChecksum: typeof genChecksum === 'function'
    };
    const missing = Object.keys(checks).filter(key => checks[key] !== true);
    return {status:missing.length?'ENGINE_DEPENDENCIES_MISSING':'ENGINE_DEPENDENCIES_OK',checks,missing};
  }

  function validateCoordinates(lat, lon) {
    const errors=[];
    if(typeof lat!=='number'||!Number.isFinite(lat)) errors.push('LAT_INVALID');
    if(typeof lon!=='number'||!Number.isFinite(lon)) errors.push('LON_INVALID');
    if(Number.isFinite(lat)&&Math.abs(lat)>90) errors.push('LAT_OUT_OF_RANGE');
    if(Number.isFinite(lon)&&Math.abs(lon)>180) errors.push('LON_OUT_OF_RANGE');
    return {passed:errors.length===0,errors};
  }

  function resolveGPS(lat,lon){
    const aL=Math.abs(lat),aO=Math.abs(lon),eL=Math.floor(aL),eO=Math.floor(aO);
    const d7L=(aL%1).toFixed(7).substring(2,9).split('').map(Number);
    const d7O=(aO%1).toFixed(7).substring(2,9).split('').map(Number);
    if(d7L.length!==7||d7O.length!==7) throw new Error('QTSE_DECIMAL_LENGTH_INVALID');
    return {eL,eO,d7L,d7O};
  }

  function ponderExp(d7){
    const val=d7.slice().reverse().reduce((sum,digit,index)=>sum+digit*Math.exp(-(index+1)),0);
    const frac=val%1,n4=Math.round(frac*10000),str=String(n4).padStart(4,'0');
    if(str.length!==4) throw new Error('PCNT_SEQUENCE_LENGTH_INVALID');
    return {val,frac,seq4:str.split('').map(Number),str4:str,kiTov:'SUSPENDU'};
  }

  function computeQTSE(lat,lon){
    const gps=resolveGPS(lat,lon),esL=entierToSeq(gps.eL),esO=entierToSeq(gps.eO);
    const pL=ponderExp(gps.d7L),pO=ponderExp(gps.d7O);
    const ayinL=gps.d7L.indexOf(0),ayinO=gps.d7O.indexOf(0);
    const ayin=ayinL>=0?'pos.'+ayinL+' lat':ayinO>=0?'pos.'+ayinO+' lon':'ABSENT';
    return {eL:gps.eL,eO:gps.eO,esL,esO,d7L:gps.d7L,d7O:gps.d7O,pL,pO,seqL:pL.seq4,seqO:pO.seq4,ayin,sourceChecksum:genChecksum(lat,lon)};
  }

  function detectHazakah(esL,esO){
    const key=esL.concat(esO).join('');
    const defs={'441':{code:'441',reading:'Porte derrière la Porte · Origine'},'530':{code:'530',reading:'Souffle révélé en mouvement'},'531':{code:'531',reading:"Souffle révélé en mouvement vers l'Origine"}};
    const code=Object.keys(defs).find(k=>key.includes(k));
    return code?defs[code]:null;
  }

  function resolveFamily(qtse){
    const esL=qtse.esL,esO=qtse.esO;
    if(!esL.length||!esO.length) throw new Error('CTS_INTEGER_SEQUENCE_MISSING');
    const hazakah=detectHazakah(esL,esO);
    const famLatParts=readSeqWithCodex(esL),famLonParts=readSeqWithCodex(esO);
    return {
      fam:genShemFamille(esL,esO,famLatParts,famLonParts,hazakah&&hazakah.reading),
      famLatStr:esL.map(v=>LM[v].let).join('·'),
      famLonStr:esO.map(v=>LM[v].let).join('·'),hazakah
    };
  }

  function readCanonicalCodex(qtse){
    if(qtse.seqL.length!==4||qtse.seqO.length!==4) throw new Error('CODEX_SEQUENCE_MISSING');
    return {latitude:readSeqWithCodex(qtse.seqL),longitude:readSeqWithCodex(qtse.seqO)};
  }

  function normalizeEntry(entry){return {heb:entry.h,lat:entry.l,fr:entry.fr,sig:entry.s};}
  function resolveShem(qtse){
    if(qtse.seqL.length!==4||qtse.seqO.length!==4) throw new Error('FL301_SEQUENCE_INVALID');
    const makom=MAKOM_TBL[qtse.seqL[0]],shaar=SHAAR_TBL[qtse.seqO[0]],mishkan=MISHKAN_TBL[qtse.seqO[3]];
    if(!makom||!shaar||!mishkan) throw new Error('FL301_SHEM_RESOLUTION_FAILED');
    return {makom:normalizeEntry(makom),shaar:normalizeEntry(shaar),mishkan:normalizeEntry(mishkan)};
  }

  function buildSignatureId(qtse){
    const hL=(parseInt(qtse.seqL.join(''),10)%256).toString(16).toUpperCase().padStart(2,'0');
    const hO=(parseInt(qtse.seqO.join(''),10)%256).toString(16).toUpperCase().padStart(2,'0');
    return 'MKM✦'+qtse.esL[0]+hL+hO+(qtse.ayin==='ABSENT'?'0':'1');
  }

  function resolveIdentity(qtse,naming){
    if(!naming||!naming.makom||!naming.shaar||!naming.mishkan) throw new Error('IDENTITY_NAMING_ANTECEDENT_MISSING');
    const llll=qtse.seqL.join(''),oooo=qtse.seqO.join('');
    return {llll,oooo,icl:llll+' | '+oooo,signatureId:buildSignatureId(qtse)};
  }

  function computeProperties(qtse,family){
    const sL=qtse.seqL,sO=qtse.seqO,gLat=sL.reduce((a,b)=>a+b,0),gLon=sO.reduce((a,b)=>a+b,0);
    const idxLat=sL[3],idxLon=sO[3],mishkanIndex=(idxLat+idxLon)%10;
    return {gematria:{lat:gLat,lon:gLon,total:gLat+gLon,totalLetter:LM[(gLat+gLon)%10]},zera:{latIndex:idxLat,lonIndex:idxLon,latLetter:LM[idxLat],lonLetter:LM[idxLon],spatialStatus:'TO_CHARACTERIZE'},mishkanIndex,mishkanLetter:LM[mishkanIndex],mishkanMakom:normalizeEntry(MAKOM_TBL[mishkanIndex]),hazakah:family.hazakah||null};
  }

  function establishIntegrity(lat,lon,qtse,identity){
    if(!identity||!identity.icl||!identity.signatureId) throw new Error('INTEGRITY_IDENTITY_MISSING');
    return {version:ENGINE_VERSION,pcntVersion:PCNT_VERSION,sequenceId:SEQUENCE_ID,sequenceVersion:SEQUENCE_VERSION,contractStatus:CONTRACT_STATUS,sourceChecksum:qtse.sourceChecksum,reproducible:true,validation:{pcnt:'KI_TOV_SUSPENDU'},engines:{qtse:'3.0',pcnt:PCNT_VERSION,cts:'2.0',codex:'CANONICAL_SEQUENCE_READER',fl301:'3.0',resolver:ENGINE_VERSION,integrity:ENGINE_VERSION,constitutionGate:ENGINE_VERSION},sourceFingerprint:genChecksum(lat,lon)};
  }

  function constitutionGate(record){
    const checks={recordAssembled:record&&record.status==='ASSEMBLED',sourcePresent:Boolean(record&&record.source),computationPresent:Boolean(record&&record.computation),identityPresent:Boolean(record&&record.identity&&record.identity.icl),signaturePresent:Boolean(record&&record.identity&&record.identity.signatureId),namingPresent:Boolean(record&&record.naming&&record.naming.makom&&record.naming.shaar&&record.naming.mishkan),propertiesPresent:Boolean(record&&record.properties),familyPresent:Boolean(record&&record.grandeFamille),integrityPresent:Boolean(record&&record.integrity),seqLatLength:Boolean(record&&record.computation&&record.computation.seqL&&record.computation.seqL.length===4),seqLonLength:Boolean(record&&record.computation&&record.computation.seqO&&record.computation.seqO.length===4),pcntSupervisionNamed:Boolean(record&&record.integrity&&record.integrity.validation.pcnt==='KI_TOV_SUSPENDU')};
    const errors=Object.keys(checks).filter(k=>checks[k]!==true);
    return {status:errors.length?'GATE_REFUSED':'CONSTITUTED',checks,errors};
  }

  function constituteICL(lat,lon,source){
    try{
      const dependencies=auditDependencies();
      if(dependencies.status!=='ENGINE_DEPENDENCIES_OK') return {status:'EXECUTION_FAILED',errors:['ENGINE_DEPENDENCIES_MISSING'],dependencies};
      const validation=validateCoordinates(lat,lon);
      if(!validation.passed) return {status:'INPUT_REFUSED',errors:validation.errors};
      const qtse=computeQTSE(lat,lon),family=resolveFamily(qtse),codex=readCanonicalCodex(qtse),naming=resolveShem(qtse),properties=computeProperties(qtse,family),identity=resolveIdentity(qtse,naming),integrity=establishIntegrity(lat,lon,qtse,identity);
      const record={status:'ASSEMBLED',sequence:{id:SEQUENCE_ID,version:SEQUENCE_VERSION,contractStatus:CONTRACT_STATUS},source:{type:source||'GPS',lat,lon},computation:{integerLat:qtse.eL,integerLon:qtse.eO,decimalLat:qtse.d7L,decimalLon:qtse.d7O,seqL:qtse.seqL,seqO:qtse.seqO,codex,ayin:qtse.ayin,pcnt:{version:PCNT_VERSION,latValue:qtse.pL.val,lonValue:qtse.pO.val,latFraction:qtse.pL.frac,lonFraction:qtse.pO.frac,kiTov:'SUSPENDU'}},identity,naming,properties,grandeFamille:{name:family.fam,latitudeFamily:family.famLatStr,longitudeFamily:family.famLonStr,hazakah:family.hazakah},integrity};
      const gate=constitutionGate(record);
      return gate.status==='CONSTITUTED'?Object.assign(record,{status:'CONSTITUTED',checks:gate.checks}):{status:'GATE_REFUSED',checks:gate.checks,errors:gate.errors,record};
    }catch(error){return {status:'EXECUTION_FAILED',errors:[error&&error.message?error.message:'UNKNOWN_EXECUTION_ERROR']};}
  }

  function getTerritorialTestView(result){
    if(!result||result.status!=='CONSTITUTED') return result;
    return {version:result.integrity.version,status:result.status,protocol:'ICL Constitution Engine™',signatureId:result.identity.signatureId,coordinates:{lat:result.source.lat,lon:result.source.lon},grandeFamille:result.grandeFamille,ponderation:{val_lat:result.computation.pcnt.latValue,seq_lat:result.computation.seqL,val_lon:result.computation.pcnt.lonValue,seq_lon:result.computation.seqO},decimales:{lat:result.computation.decimalLat,lon:result.computation.decimalLon},icl:{value:result.identity.icl,lat_seq:result.computation.seqL,lon_seq:result.computation.seqO},shem_makom:result.naming.makom,shem_shaar:result.naming.shaar,shem_mishkan:result.naming.mishkan,zera:result.properties.zera,integrity:result.integrity};
  }

  window.ICLConstitutionEngine={version:ENGINE_VERSION,auditDependencies,validateCoordinates,resolveGPS,ponderExp,computeQTSE,resolveFamily,readCanonicalCodex,resolveShem,resolveIdentity,computeProperties,establishIntegrity,constitutionGate,constituteICL,getTerritorialTestView};
})();
