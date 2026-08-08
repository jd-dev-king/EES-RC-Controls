import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = (id) => document.getElementById(id);
const integration = (() => {
  const q = new URLSearchParams(location.search);
  const source = q.get('source') || 'standalone';
  const batchId = q.get('batch') || '';
  let batch = null;
  let batchIndex = Math.max(0, Number(q.get('assetIndex') || 0));

  if (batchId) {
    try {
      batch = JSON.parse(
        sessionStorage.getItem(`ees.rc.batch.${batchId}`) ||
        localStorage.getItem(`ees.rc.batch.${batchId}`) ||
        'null'
      );
    } catch {
      batch = null;
    }
  }

  if (!batch && q.get('payload')) {
    try {
      let raw = q.get('payload').replace(/-/g, '+').replace(/_/g, '/');
      raw += '='.repeat((4 - raw.length % 4) % 4);
      const binary = atob(raw);
      const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
      batch = JSON.parse(new TextDecoder().decode(bytes));
      if (batchId) {
        localStorage.setItem(`ees.rc.batch.${batchId}`, JSON.stringify(batch));
        sessionStorage.setItem(`ees.rc.batch.${batchId}`, JSON.stringify(batch));
      }
    } catch {
      batch = null;
    }
  }

  const item = batch?.assets?.[batchIndex] || null;

  return {
    source,
    connected: ['home', 'power-grid'].includes(source) || !!item,
    asset: item?.name || q.get('asset') || 'Standalone RC Circuit',
    assetId: item?.id || q.get('assetId') || '',
    scenario: item?.scenario || q.get('scenario') || 'Manual laboratory test',
    health: Number(item?.health ?? q.get('health') ?? 100),
    upstreamFault: item?.fault || q.get('fault') || 'none',
    voltage: Number(item?.voltage ?? q.get('voltage') ?? 5),
    resistance: Number(item?.resistance ?? q.get('resistance') ?? 1000),
    capacitance: Number(item?.capacitance ?? q.get('capacitance') ?? 1000),
    loadWatts: Number(item?.loadWatts ?? q.get('loadWatts') ?? 0),
    ratedWatts: Number(item?.ratedWatts ?? q.get('ratedWatts') ?? 0),
    lineVoltage: Number(item?.lineVoltage ?? q.get('lineVoltage') ?? 0),
    powerFactor: Number(item?.powerFactor ?? q.get('powerFactor') ?? 0),
    breakerAmps: Number(item?.breakerAmps ?? q.get('breakerAmps') ?? 0),
    temperatureC: Number(item?.temperatureC ?? q.get('temperatureC') ?? 0),
    faultCode: item?.faultCode || q.get('faultCode') || 'none',
    returnUrl: q.get('return') || (source === 'power-grid' ? '../power-grid-sun/' : '../home-twin/'),
    apiBase:
  q.get('api') ||
  localStorage.getItem('eesApiBase') ||
  'https://ees-rc-controls-production.up.railway.app',
    batchId,
    batchIndex,
    batchCount: batch?.assets?.length || 0,
    batch,
    scope: batch?.scope || q.get('scope') || ''
  };
})();

const isIndustrial = integration.source === 'power-grid';
const isResidential = integration.source === 'home';

function industrialScopeLabel() {
  const scope = (integration.scope || '').toUpperCase();
  if (scope === 'PHARMA') return 'Pharma Industrial Power';
  if (scope === 'SUPPLY' || scope === 'LOGISTICS') return 'Global Supply Industrial Power';
  if (scope === 'UTILITIES') return 'Utilities Plant Power';
  if (scope === 'RC' || scope === 'RC CONTROLS') return 'RC Controls Power';
  if (scope === 'EXEC') return 'Executive Suites Power';
  return 'Industrial Power';
}

const sourceLabel = isIndustrial
  ? `Power Grid Sun — ${industrialScopeLabel()}`
  : isResidential
    ? 'Home Energy Twin'
    : 'Standalone Laboratory';

const returnLabel = isIndustrial
  ? `Return to ${industrialScopeLabel()} Grid`
  : isResidential
    ? 'Return to Home Energy Twin'
    : 'Return to Source';

document.body.classList.toggle('industrial-mode', isIndustrial);
document.body.classList.toggle('residential-mode', isResidential);

function configureEquipmentLanguage() {
  if (!isIndustrial) return;
  const replacements = new Map([
    ['Breaker & Appliance Analysis', 'Feeder & Equipment Analysis'],
    ['Breaker / Appliance', 'Feeder / Equipment'],
    ['Selected Appliance', 'Selected Equipment'],
    ['Current Clamp Monitoring', 'Industrial Current Monitoring'],
    ['Whole House', 'All Pharma Equipment'],
    ['Load HVAC Preset', 'Load Pharma Controls Preset']
  ]);
  document.querySelectorAll('h1,h2,h3,h4,span,small,label,button,option').forEach(el => {
    const text = el.textContent?.trim();
    if (text && replacements.has(text)) el.textContent = replacements.get(text);
  });
}

function configureMonitorScope() {
  const select = $('rcMonitorScope');
  if (!select || !isIndustrial) return;
  if ((integration.scope || '').toUpperCase() === 'PHARMA') {
    select.innerHTML = `
      <option value="ALL">All Pharma Equipment</option>
      <option value="PROCESS">Process Equipment</option>
      <option value="TRANSFER">Transfer Systems</option>
      <option value="PACKAGING">Filling & Packaging</option>
      <option value="UTILITIES">Pharma Utilities</option>`;
    select.value = 'ALL';
  }
}

function configureIndustrialPanels() {
  if (!isIndustrial || (integration.scope || '').toUpperCase() !== 'PHARMA') return;

  document.body.classList.add('industrial-mode');
  document.body.classList.remove('residential-mode');

  const text = (selector, value) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
  };

  const leadText = (selector, value) => {
    const el = document.querySelector(selector);
    if (!el) return;
    const node = [...el.childNodes].find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (node) node.textContent = value;
  };

  // RC diagnostic identity remains, but contextual sections become industrial.
  text('.power-monitor-panel .panel-heading small', 'INDUSTRIAL POWER QUALITY & LOAD MONITORING');
  text('.power-monitor-panel .panel-heading h2', 'Equipment Power & Feeder Analytics');
  text('.power-kpi-grid article:nth-child(1) span', 'Instantaneous Equipment Draw');
  text('.power-kpi-grid article:nth-child(2) span', 'RC Control Circuit');
  text('.power-kpi-grid article:nth-child(2) small', 'Control-system consumption');
  text('.power-kpi-grid article:nth-child(3) span', 'Session Energy');
  text('.power-kpi-grid article:nth-child(4) span', 'Peak Equipment Demand');
  text('.monitor-chart-card:nth-child(1) .chart-title strong', 'Live Equipment Power');
  text('.monitor-chart-card:nth-child(1) .chart-title small', 'Instantaneous demand versus equipment baseline');
  text('.monitor-chart-card:nth-child(2) .chart-title strong', 'Energy Cost & Peak Demand');
  text('.monitor-chart-card:nth-child(2) .chart-title small', 'Session energy cost and recorded demand peak');

  text('.breaker-panel .panel-heading small', 'CURRENT CLAMP / FEEDER SENSOR NETWORK');
  text('.breaker-panel .panel-heading h2', 'Feeder & Equipment Analysis');
  text('.breaker-detail > small', 'SELECTED FEEDER / EQUIPMENT');
  text('#breakerName', integration.asset || 'Pharma Process Twin');
  text('#breakerAdvice', 'Industrial feeder telemetry is within the expected operating range.');
  if ($('scanBreakersBtn')) $('scanBreakersBtn').textContent = 'Scan Feeder Sensors';

  text('.integration-panel .panel-heading small', 'INDUSTRIAL CONTROLS INTEGRATION');
  text('.integration-panel .panel-heading h2', 'SCADA / PLC Asset Gateway');
  leadText('.integration-panel label:nth-of-type(1)', 'Industrial Gateway Mode ');
  leadText('.integration-panel label:nth-of-type(2)', 'Tag / Entity Prefix ');
  const gateway = $('gatewayMode');
  if (gateway) {
    gateway.innerHTML = `
      <option value="local">Local REST / OPC-UA Bridge</option>
      <option value="mqtt">MQTT / Sparkplug B</option>
      <option value="modbus">Modbus TCP Gateway</option>
      <option value="demo">EES Demo Industrial Bridge</option>`;
  }
  if ($('entityPrefix')) $('entityPrefix').value = 'sensor.ees_pharma_power';
  if ($('connectHaBtn')) $('connectHaBtn').textContent = 'Connect Industrial Gateway';
  if ($('publishHaBtn')) $('publishHaBtn').textContent = 'Publish Equipment Snapshot';
  text('.integration-panel .payload-card small', 'LATEST INDUSTRIAL TELEMETRY PAYLOAD');

  text('.planning-panel .panel-heading small', 'INDUSTRIAL ENERGY ANALYTICS');
  text('.planning-panel .panel-heading h2', 'Demand, Utilization & Energy Cost');
  if ($('recalculateSizingBtn')) $('recalculateSizingBtn').textContent = 'Recalculate';
  leadText('.planning-controls label:nth-child(1)', 'Electric Rate ');
  leadText('.planning-controls label:nth-child(2)', 'Production Runtime ');
  leadText('.planning-controls label:nth-child(3)', 'Peak Demand Window ');
  leadText('.planning-controls label:nth-child(4)', 'Load Factor ');
  text('.planning-controls label:nth-child(3) span', 'hours');
  text('.planning-controls label:nth-child(4) span', 'operating factor');
  if ($('solarHours')) {
    $('solarHours').min = '0.1';
    $('solarHours').max = '1';
    $('solarHours').step = '0.05';
    $('solarHours').value = '0.80';
  }
  text('.planning-results article:nth-child(1) span', 'Estimated Monthly Energy Cost');
  text('.planning-results article:nth-child(2) span', 'Projected Monthly Energy');
  text('.planning-results article:nth-child(3) span', 'Estimated Peak Demand');
  text('.planning-results article:nth-child(4) span', 'Available Demand Reserve');

  text('.anomaly-panel .panel-heading small', 'INDUSTRIAL CONDITION MONITORING');
  text('.anomaly-panel .panel-heading h2', 'Equipment Electrical Alerts');
  leadText('.anomaly-settings label:nth-child(1)', ' Continuous-load detection');
  leadText('.anomaly-settings label:nth-child(2)', ' Overcurrent / overload detection');
  leadText('.anomaly-settings label:nth-child(3)', ' Rapid cycling / contactor detection');
  text('.anomaly-settings p', 'Alerts use the equipment baseline, feeder demand, runtime, upstream grid state, and diagnostic fault context.');

  text('.engineering-docs-panel .panel-heading h2', 'MCC, Schematics & Control Wiring');
  const drawingView = $('drawingView');
  if (drawingView?.querySelector('option[value="blueprint"]')) drawingView.querySelector('option[value="blueprint"]').textContent = 'MCC / Feeder Blueprint';
  const controlCircuit = $('controlCircuit');
  if (controlCircuit && controlCircuit.value === 'ac') controlCircuit.value = 'dc';

  if ($('presetBtn')) $('presetBtn').textContent = 'Load Pharma Controls Preset';
}



const state = {
  supply: integration.voltage, resistance: integration.resistance, capacitanceUf: integration.capacitance, speed: 1,
  mode: 'charge', running: false, time: 0, voltage: 0, current: 0.005,
  health: integration.health, fault: null, measuredTau: null, temperature: 24, topology:'lowpass', capConfig:'single',
  peakCurrent: 0.005, samples: [], lastTs: performance.now(), upstreamFault: integration.upstreamFault !== 'none',
  sweepRunning:false, sweepProgress:0, sweepComplete:false, sweepPoints:[], sweepStartedAt:0
};
const faultProfiles = {
  leakage: { label: 'Capacitor Leakage', health: 82 },
  drift: { label: 'Resistor Drift', health: 88 },
  open: { label: 'Open Circuit', health: 42 },
  short: { label: 'Short Circuit', health: 18 },
  lowSupply: { label: 'Low Supply Voltage', health: 76 }
};

function activeFaultLabel(){
  if(state.fault) return faultProfiles[state.fault].label;
  if(state.upstreamFault) return isIndustrial ? 'Upstream Industrial Asset Fault' : 'Upstream Appliance Fault';
  return 'None';
}
function diagnosticVerdict(){
  const calculated=tau();
  const dev=state.measuredTau ? Math.abs(state.measuredTau-calculated)/Math.max(calculated,1e-9)*100 : null;
  if(state.fault || state.upstreamFault || state.health < 70) return {result:'FAIL', level:'fault', reason:activeFaultLabel(), deviation:dev};
  if(!state.measuredTau || !state.sweepComplete) return {result:'INCOMPLETE', level:'warning', reason:!state.measuredTau?'Transient test incomplete':'Frequency sweep incomplete', deviation:dev};
  if(dev > 8 || state.health < 90) return {result:'REVIEW', level:'warning', reason:dev>8?'Time-constant deviation exceeds 8%':'Component health below 90%', deviation:dev};
  return {result:'PASS', level:'normal', reason:'All required tests completed within limits', deviation:dev};
}

function tau() { return state.resistance * (state.capacitanceUf / 1_000_000); }
function effective() {
  let r = state.resistance, v = state.supply, leak = 0;
  if (state.fault === 'drift') r *= 1.18;
  if (state.fault === 'lowSupply') v *= .64;
  if (state.fault === 'short') r = Math.max(15, r * .03);
  if (state.fault === 'open') r = 1e12;
  if (state.fault === 'leakage') leak = .16;
  return { r, v, leak };
}
function fmtResistance(v){ return v >= 1000 ? `${(v/1000).toFixed(2)} kΩ` : `${Math.round(v)} Ω`; }
function fmtCap(v){ return `${Math.round(v)} µF`; }
function addLog(text, type='info') {
  const row = document.createElement('div'); row.className = `log-entry ${type}`;
  row.innerHTML = `<time>${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}</time><span>${text}</span>`;
  $('eventLog').prepend(row);
}
function assistant(text){ $('assistantMessage').querySelector('p').textContent = text; }

// --- Three.js scene ---
const mount = $('scene');
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x06101a); scene.fog = new THREE.Fog(0x06101a, 16, 38);
const camera = new THREE.PerspectiveCamera(45, 1, .1, 100); camera.position.set(10, 8, 12);
const renderer = new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.shadowMap.enabled = true; mount.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.target.set(0,1.5,0); controls.maxDistance=28; controls.minDistance=5;
scene.add(new THREE.HemisphereLight(0x8fdcff,0x07101a,1.5));
const key = new THREE.DirectionalLight(0xffffff,2.2); key.position.set(7,12,8); key.castShadow=true; scene.add(key);
const cyan = new THREE.PointLight(0x36cfff,18,14); cyan.position.set(-3,4,2); scene.add(cyan);

const floor = new THREE.Mesh(new THREE.BoxGeometry(18,.3,12), new THREE.MeshStandardMaterial({color:0x0b1822,metalness:.45,roughness:.6})); floor.position.y=-.2; floor.receiveShadow=true; scene.add(floor);
const grid = new THREE.GridHelper(18,18,0x22536c,0x142d3c); grid.position.y=0; scene.add(grid);
function box(name, size, pos, color=0x193246, emissive=0x000000){ const m=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshStandardMaterial({color,emissive,emissiveIntensity:.45,metalness:.55,roughness:.35}));m.name=name;m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m; }
const bench = box('Lab Bench',[11,.6,4],[0,.7,0],0x1b2a35); box('Bench Base',[10,1.1,3.3],[0,.1,0],0x0c141c);
const supplyMesh = box('Power Supply',[2.2,1.5,1.55],[-4.2,1.75,0],0x24384a,0x00384b);
const supplyScreen = box('Power Supply Display',[1.3,.55,.05],[-4.2,1.9,.79],0x041015,0x00b9ff);
const resistor = box('Resistor',[2.2,.55,.55],[-.5,1.7,0],0x70412a,0x351500);
for(let i=0;i<4;i++) box('Resistor Band',[.13,.59,.59],[-1.15+i*.42,1.7,0], [0xffd24a,0xff3030,0x101010,0xffd24a][i]);
const capacitor = new THREE.Group(); capacitor.name='Capacitor';
const capBody = new THREE.Mesh(new THREE.CylinderGeometry(.7,.7,1.7,32),new THREE.MeshStandardMaterial({color:0x1d6d86,metalness:.7,roughness:.25,emissive:0x002b3a})); capBody.rotation.z=Math.PI/2; capBody.castShadow=true; capacitor.add(capBody); capacitor.position.set(2.35,1.75,0); scene.add(capacitor);
const capGlow = new THREE.Mesh(new THREE.CylinderGeometry(.53,.53,1.73,32),new THREE.MeshBasicMaterial({color:0x5ee7ff,transparent:true,opacity:.08})); capGlow.rotation.z=Math.PI/2; capacitor.add(capGlow);
const scopeBody = box('Oscilloscope',[3.4,2.45,1.8],[5.1,2.15,-1.7],0x1c2b35);
const scopeScreen = box('Oscilloscope Screen',[2.65,1.55,.05],[5.1,2.25,-.77],0x020708,0x006d62);
const meterBody = box('Digital Multimeter',[1.45,2.15,.65],[3.0,2.0,1.25],0xd4b82f,0x342a00);
const meterScreen = box('Multimeter Display',[1.05,.55,.04],[3.0,2.35,1.59],0x06130d,0x0b6f36);
const meterDial = new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.10,24),new THREE.MeshStandardMaterial({color:0x18232a,metalness:.4}));meterDial.rotation.x=Math.PI/2;meterDial.position.set(3.0,1.65,1.61);meterDial.name='Multimeter Dial';scene.add(meterDial);
const probeMat=new THREE.MeshStandardMaterial({color:0xd94a42,emissive:0x2a0000});
const blackProbeMat=new THREE.MeshStandardMaterial({color:0x15191d});
function probe(x,mat,name){const p=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,1.25,10),mat);p.rotation.z=.55;p.position.set(x,1.4,1.9);p.name=name;scene.add(p);return p;}
const redProbe=probe(3.55,probeMat,'Red Probe'), blackProbe=probe(2.45,blackProbeMat,'Black Probe');

// Wires
const wireMat = new THREE.MeshStandardMaterial({color:0x3e667b,emissive:0x0a2a36,emissiveIntensity:.8});
function wire(a,b){const mid=a.clone().add(b).multiplyScalar(.5);const len=a.distanceTo(b);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,len,10),wireMat);mesh.position.copy(mid);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());scene.add(mesh);return mesh;}
wire(new THREE.Vector3(-3.05,1.7,0),new THREE.Vector3(-1.65,1.7,0)); wire(new THREE.Vector3(.65,1.7,0),new THREE.Vector3(1.5,1.7,0)); wire(new THREE.Vector3(3.2,1.7,0),new THREE.Vector3(4.0,1.7,0));
const pulseGroup = new THREE.Group(); scene.add(pulseGroup);
for(let i=0;i<9;i++){ const p=new THREE.Mesh(new THREE.SphereGeometry(.09,12,12),new THREE.MeshBasicMaterial({color:0x72edff})); p.userData.offset=i/9; pulseGroup.add(p); }

const clickable=[supplyMesh,supplyScreen,resistor,capacitor,capBody,scopeBody,scopeScreen,meterBody,meterScreen,meterDial,redProbe,blackProbe];
const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown',e=>{const r=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(clickable,true)[0];if(hit){let n=hit.object.name || hit.object.parent?.name; if(n.includes('Supply')) inspect('supply'); else if(n.includes('Resistor')) inspect('resistor'); else if(n.includes('Oscilloscope')) inspect('scope'); else if(n.includes('Multimeter')||n.includes('Probe')) inspectMeter(); else inspect('capacitor');}});
function resize(){const w=mount.clientWidth,h=mount.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();} new ResizeObserver(resize).observe(mount); resize();
function setView(v){const views={iso:[10,8,12],circuit:[0,5,10],scope:[8,4,2],lab:[14,10,16]};camera.position.set(...views[v]);controls.target.set(v==='scope'?4.4:0,v==='scope'?2:1.5,v==='scope'?-1.3:0);controls.update();}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));

// --- Scope drawing ---
const canvas=$('scope'), ctx=canvas.getContext('2d');
function drawScope(){const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio,2);if(canvas.width!==rect.width*dpr){canvas.width=rect.width*dpr;canvas.height=rect.height*dpr;}ctx.setTransform(dpr,0,0,dpr,0,0);const w=rect.width,h=rect.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#02080e';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#123248';ctx.lineWidth=1;for(let x=0;x<w;x+=w/10){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}for(let y=0;y<h;y+=h/8){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}const samples=state.samples.slice(-240);if(samples.length<2)return;function line(key,max,color){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();samples.forEach((s,i)=>{const x=i/(239)*w;const y=h-18-(Math.min(Math.abs(s[key]),max)/max)*(h-36);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke()}line('v',Math.max(state.supply,1),'#5ee7ff');line('i',Math.max(state.peakCurrent,.001),'#ffc861');}

function animate(ts){requestAnimationFrame(animate);const raw=Math.min((ts-state.lastTs)/1000,.1);state.lastTs=ts;updateSimulation(raw*state.speed);const pct=Math.max(0,Math.min(1,state.voltage/Math.max(effective().v,.01)));capGlow.material.opacity=.08+pct*.65;capGlow.scale.set(1,Math.max(.1,pct),Math.max(.1,pct));pulseGroup.visible=state.running && state.current>.000001;const path=[new THREE.Vector3(-3,1.7,0),new THREE.Vector3(-1.6,1.7,0),new THREE.Vector3(.7,1.7,0),new THREE.Vector3(3.2,1.7,0),new THREE.Vector3(4,1.7,0)];pulseGroup.children.forEach(p=>{let t=(state.time*.55+p.userData.offset)%1;let seg=Math.min(path.length-2,Math.floor(t*(path.length-1)));let local=t*(path.length-1)-seg;p.position.lerpVectors(path[seg],path[seg+1],local)});if(state.sweepRunning){
  const elapsed=(performance.now()-state.sweepStartedAt)/2200;
  state.sweepProgress=Math.min(1,elapsed);
  drawBode(state.sweepProgress);
  $('sweepProgress').textContent=`${Math.round(state.sweepProgress*100)}%`;
  $('sweepBar').style.width=`${state.sweepProgress*100}%`;
  if(state.sweepProgress>=1){state.sweepRunning=false;state.sweepComplete=true;$('runSweepBtn').disabled=false;$('runSweepBtn').textContent='Run Frequency Sweep';addLog('Frequency sweep completed and Bode plots refreshed.','success');assistant(`Frequency response complete. Cutoff frequency is ${$('cutoffValue').textContent}.`);updateUI();}
}
controls.update();renderer.render(scene,camera);drawScope();}
requestAnimationFrame(animate);

// --- Physics engine ---
let uiTimer=0;
function updateSimulation(dt){
  if(!state.running)return;
  state.time+=dt; const e=effective(), c=state.capacitanceUf/1e6;
  if(state.mode==='charge'){
    const target=e.v*(1-e.leak); const dv=((target-state.voltage)/(e.r*c))*dt; state.voltage=Math.max(0,Math.min(e.v,state.voltage+dv)); state.current=Math.max(0,(e.v-state.voltage)/e.r);
    if(!state.measuredTau && state.voltage>=e.v*.632){state.measuredTau=state.time;addLog(`Measured time constant captured at ${state.time.toFixed(3)} s.`);}
  }else{const dv=-(state.voltage/(e.r*c))*dt;state.voltage=Math.max(0,state.voltage+dv);state.current=-state.voltage/e.r;}
  if(state.fault==='open')state.current=0;
  state.peakCurrent=Math.max(state.peakCurrent,Math.abs(state.current));
  const power=state.current*state.current*e.r; state.temperature += ((24+power*180)-state.temperature)*dt*.35;
  state.samples.push({v:state.voltage,i:state.current,t:state.time}); if(state.samples.length>500)state.samples.shift();
  uiTimer+=dt;if(uiTimer>.08){uiTimer=0;updateUI();}
}

function updateUI(){
  const e=effective(), pct=Math.max(0,Math.min(100,state.voltage/Math.max(e.v,.01)*100));
  $('voltageValue').textContent=`${state.voltage.toFixed(2)} V`; $('voltagePct').textContent=`${pct.toFixed(1)}% charged`;
  $('currentValue').textContent=`${(Math.abs(state.current)*1000).toFixed(2)} mA`; $('currentDirection').textContent=state.current<0?'discharging':'charging';
  $('tauValue').textContent=`${tau().toFixed(2)} s`; $('healthValue').textContent=`${state.health}%`; $('healthText').textContent=(state.fault||state.upstreamFault)?activeFaultLabel():'Nominal';
  $('chargePercent').textContent=`${pct.toFixed(0)}%`; $('chargeBar').style.width=`${pct}%`; $('elapsedValue').textContent=`${state.time.toFixed(2)} s`;
  $('runState').textContent=state.running?'RUNNING':'PAUSED'; $('modeState').textContent=state.mode.toUpperCase();
  $('calcTau').textContent=`${tau().toFixed(3)} s`; $('measuredTau').textContent=state.measuredTau?`${state.measuredTau.toFixed(3)} s`:'—';
  const dev=state.measuredTau?Math.abs(state.measuredTau-tau())/tau()*100:null; $('deviation').textContent=dev!==null?`${dev.toFixed(1)}%`:'—';
  $('peakCurrent').textContent=`${(state.peakCurrent*1000).toFixed(2)} mA`; $('powerValue').textContent=`${(state.current*state.current*e.r*1000).toFixed(2)} mW`; $('temperature').textContent=`${state.temperature.toFixed(1)} °C`;
  const verdict=diagnosticVerdict();
  const status=(state.fault||state.upstreamFault)?'fault':state.health<90?'warning':'normal'; $('systemBadge').className=`badge ${status}`;$('systemBadge').textContent=(state.fault||state.upstreamFault)?'FAULT':status==='warning'?'WARNING':'NORMAL';
  $('resultBadge').className=`badge ${verdict.level}`;$('resultBadge').textContent=verdict.result; $('resultReason').textContent=verdict.reason;
  $('capStatus').textContent=state.fault==='leakage'?'Leak detected':state.fault==='short'?'Overcurrent risk':'Healthy';$('resStatus').textContent=state.fault==='drift'?'Drift +18%':state.fault==='open'?'Circuit open':'Stable';$('supplyStatus').textContent=state.fault==='lowSupply'?'Undervoltage':'Regulated';
}
function resetTest(){state.running=false;state.time=0;state.voltage=state.mode==='charge'?0:effective().v;state.current=state.mode==='charge'?effective().v/effective().r:0;state.measuredTau=null;state.samples=[];state.sweepComplete=false;state.sweepRunning=false;state.sweepProgress=0;if($('sweepBar'))$('sweepBar').style.width='0%';if($('sweepProgress'))$('sweepProgress').textContent='0%';state.peakCurrent=Math.abs(state.current);state.temperature=24;updateUI();addLog('Test reset.');assistant('Test reset. The digital twin is ready for a new transient analysis.');}

// --- Controls ---
function bindRange(id,key,formatter){const el=$(id),out=$(`${id}Out`);el.oninput=()=>{state[key]=+el.value;out.textContent=formatter(+el.value);resetTest();};}
bindRange('supply','supply',v=>`${v.toFixed(1)} V`);bindRange('resistance','resistance',fmtResistance);bindRange('capacitance','capacitanceUf',fmtCap);bindRange('speed','speed',v=>`${v}×`);
$('startBtn').onclick=()=>{state.running=true;addLog(`${state.mode==='charge'?'Charging':'Discharging'} test started.`);assistant(`Live ${state.mode} test running. Expected time constant is ${tau().toFixed(3)} seconds.`);};
$('pauseBtn').onclick=()=>{state.running=false;updateUI();addLog('Simulation paused.');};$('resetBtn').onclick=resetTest;
$('modeBtn').onclick=()=>{state.mode=state.mode==='charge'?'discharge':'charge';$('modeBtn').textContent=state.mode==='charge'?'Switch to Discharge':'Switch to Charge';resetTest();addLog(`Mode changed to ${state.mode}.`);};
$('faultBtn').onclick=()=>{const keys=Object.keys(faultProfiles);state.fault=keys[Math.floor(Math.random()*keys.length)];state.health=faultProfiles[state.fault].health;addLog(`Fault injected: ${faultProfiles[state.fault].label}.`,'error');assistant(`${faultProfiles[state.fault].label} detected. Compare the measured transient response with the expected RC model.`);resetTest();};
$('clearFaultBtn').onclick=()=>{state.fault=null;state.upstreamFault=false;state.health=100;addLog('Fault cleared; components restored to nominal values.');assistant('All simulated faults cleared. Component health restored to nominal.');resetTest();};
$('presetBtn').onclick=()=>{state.supply=24;state.resistance=2200;state.capacitanceUf=470;$('supply').value=24;$('resistance').value=2200;$('capacitance').value=470;$('supplyOut').textContent='24.0 V';$('resistanceOut').textContent='2.20 kΩ';$('capacitanceOut').textContent='470 µF';addLog('HVAC controller preset loaded.');resetTest();};
$('clearLogBtn').onclick=()=>{$('eventLog').innerHTML='';};
$('fullscreenBtn').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();
$('helpBtn').onclick=()=>$('guideDialog').showModal();document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelectorAll('[data-component]').forEach(b=>b.onclick=()=>inspect(b.dataset.component));

function inspect(type){const e=effective(), info={
  capacitor:['Capacitor',`<table class="report-table"><tr><td>Nominal capacitance</td><td>${fmtCap(state.capacitanceUf)}</td></tr><tr><td>Voltage</td><td>${state.voltage.toFixed(3)} V</td></tr><tr><td>Stored energy</td><td>${(.5*(state.capacitanceUf/1e6)*state.voltage**2*1000).toFixed(3)} mJ</td></tr><tr><td>Condition</td><td>${state.fault==='leakage'?'Leakage fault':'Healthy'}</td></tr></table>`],
  resistor:['Resistor',`<table class="report-table"><tr><td>Nominal resistance</td><td>${fmtResistance(state.resistance)}</td></tr><tr><td>Effective resistance</td><td>${fmtResistance(e.r)}</td></tr><tr><td>Power dissipation</td><td>${(state.current**2*e.r*1000).toFixed(3)} mW</td></tr><tr><td>Condition</td><td>${state.fault==='drift'?'Drift detected':'Stable'}</td></tr></table>`],
  supply:['DC Power Supply',`<table class="report-table"><tr><td>Setpoint</td><td>${state.supply.toFixed(2)} V</td></tr><tr><td>Effective output</td><td>${e.v.toFixed(2)} V</td></tr><tr><td>Peak current</td><td>${(state.peakCurrent*1000).toFixed(2)} mA</td></tr><tr><td>Condition</td><td>${state.fault==='lowSupply'?'Undervoltage':'Regulated'}</td></tr></table>`],
  scope:['Virtual Oscilloscope',`<table class="report-table"><tr><td>Samples captured</td><td>${state.samples.length}</td></tr><tr><td>Elapsed time</td><td>${state.time.toFixed(3)} s</td></tr><tr><td>Measured τ</td><td>${state.measuredTau?state.measuredTau.toFixed(3)+' s':'Not captured'}</td></tr><tr><td>Mode</td><td>${state.mode}</td></tr></table>`]
  }[type];$('componentTitle').textContent=info[0];$('componentDetails').innerHTML=info[1];$('componentDialog').showModal();}

function reportText(){const v=diagnosticVerdict();return `RC CIRCUIT DIGITAL TWIN TEST REPORT

Test Date: ${new Date().toLocaleString()}
Connected Asset: ${integration.asset}
Scenario: ${integration.scenario}
Test Mode: ${state.mode.toUpperCase()}
Supply Voltage: ${state.supply.toFixed(2)} V
Resistance: ${state.resistance} ohms
Capacitance: ${state.capacitanceUf} uF
Calculated Time Constant: ${tau().toFixed(4)} s
Measured Time Constant: ${state.measuredTau?state.measuredTau.toFixed(4)+' s':'Not captured'}
Deviation: ${v.deviation!==null?v.deviation.toFixed(2)+'%':'N/A'}
Frequency Sweep: ${state.sweepComplete?'Completed':'Not completed'}
Peak Current: ${(state.peakCurrent*1000).toFixed(3)} mA
Component Health: ${state.health}%
Fault: ${activeFaultLabel()}
Final Result: ${v.result}
Result Reason: ${v.reason}

Generated by EES RC Controls Digital Twin`;}
async function syncDiagnosticToPlatform(diagnostic){try{const apiKey=localStorage.getItem('eesApiKey')||'change-me';const r=await fetch(integration.apiBase+'/api/v1/rc/results',{method:'POST',headers:{'Content-Type':'application/json','X-API-Key':apiKey},body:JSON.stringify(diagnostic)});if(r.ok){addLog('Diagnostic result persisted to rc_controls.control_events.','success');return true}}catch{}addLog('Canonical API unavailable; result retained locally.','warning');return false;}
$('reportBtn').onclick=()=>{
  const verdict=diagnosticVerdict();
  const diagnostic={timestamp:new Date().toISOString(),asset:integration.asset,assetId:integration.assetId,scenario:integration.scenario,result:verdict.result,reason:verdict.reason,calculatedTau:tau().toFixed(4),measuredTau:state.measuredTau?state.measuredTau.toFixed(4):'Not captured',deviation:verdict.deviation!==null?verdict.deviation.toFixed(2)+'%':'N/A',health:state.health,fault:activeFaultLabel(),sweepComplete:state.sweepComplete};
  localStorage.setItem('ees.rc.latestDiagnostic',JSON.stringify(diagnostic));
  syncDiagnosticToPlatform(diagnostic);
  const rows=reportText().split('\n').filter(Boolean).map(x=>{const [a,...b]=x.split(': ');return b.length?`<tr><td>${a}</td><td>${b.join(': ')}</td></tr>`:''}).join('');
  $('reportContent').innerHTML=`<small>EES ENGINEERING REPORT</small><h2>${integration.asset} — RC Diagnostic Report</h2><table class="report-table">${rows}</table>${integration.connected?`<p class="assistant">Result synchronized to ${sourceLabel}.</p>`:''}`;
  $('reportDialog').showModal();addLog('Engineering test report generated and synchronized.');
};
$('printReportBtn').onclick=()=>window.print();$('downloadReportBtn').onclick=()=>{const blob=new Blob([reportText()],{type:'text/plain'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`RC-Twin-Report-${Date.now()}.txt`;a.click();URL.revokeObjectURL(a.href);};


function effectiveCapUf(){
  const c=state.capacitanceUf;
  return state.capConfig==='series2'?c/2:state.capConfig==='parallel2'?c*2:state.capConfig==='parallel3'?c*3:c;
}
function analysisTau(){return state.resistance*(effectiveCapUf()/1_000_000);}
function topologyLabel(){return {lowpass:'Low-Pass RC',highpass:'High-Pass RC',series:'Series Capacitor Bank',parallel:'Parallel Capacitor Bank',snubber:'RC Snubber'}[state.topology];}
function buildSweepPoints(){
  const fc=1/(2*Math.PI*Math.max(analysisTau(),1e-9));
  const isHigh=state.topology==='highpass';
  const points=[];
  for(let i=0;i<160;i++){const f=fc*Math.pow(10,-2+4*i/159),x=f/fc;const mag=isHigh?20*Math.log10(x/Math.sqrt(1+x*x)):20*Math.log10(1/Math.sqrt(1+x*x));const phase=isHigh?90-Math.atan(x)*180/Math.PI:-Math.atan(x)*180/Math.PI;points.push({f,mag,phase});}
  state.sweepPoints=points; return {points,fc,isHigh};
}
function drawBode(progress=state.sweepComplete?1:0){
  const {points,fc,isHigh}=buildSweepPoints();
  const visible=Math.max(1,Math.floor(points.length*Math.max(0,Math.min(1,progress))));
  function graph(id,key,title,ymin,ymax){const c=$(id),ctx=c.getContext('2d'),w=c.width,h=c.height,pad=45;ctx.clearRect(0,0,w,h);ctx.fillStyle='#06121e';ctx.fillRect(0,0,w,h);ctx.strokeStyle='rgba(110,215,255,.13)';ctx.lineWidth=1;for(let i=0;i<=5;i++){let y=pad+(h-pad*2)*i/5;ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(w-pad,y);ctx.stroke();}for(let i=0;i<=4;i++){let x=pad+(w-pad*2)*i/4;ctx.beginPath();ctx.moveTo(x,pad);ctx.lineTo(x,h-pad);ctx.stroke();}ctx.fillStyle='#a9c7d8';ctx.font='16px sans-serif';ctx.fillText(title,pad,25);ctx.strokeStyle='#48e4ff';ctx.lineWidth=3;ctx.beginPath();points.slice(0,visible).forEach((p,i)=>{let x=pad+(w-pad*2)*(Math.log10(p.f/fc)+2)/4,y=pad+(h-pad*2)*(1-(p[key]-ymin)/(ymax-ymin));i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();if(visible>1){const p=points[visible-1],x=pad+(w-pad*2)*(Math.log10(p.f/fc)+2)/4,y=pad+(h-pad*2)*(1-(p[key]-ymin)/(ymax-ymin));ctx.fillStyle='#ffc861';ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();}$('sweepFrequency').textContent=`${points[visible-1].f.toFixed(points[visible-1].f<10?3:1)} Hz`;ctx.fillStyle='#6f8796';ctx.font='12px sans-serif';ctx.fillText('0.01fc',pad,h-15);ctx.fillText('fc',w/2-8,h-15);ctx.fillText('100fc',w-pad-34,h-15);}
  graph('bodeMagnitude','mag','Magnitude Response (dB)',-45,5); graph('bodePhase','phase','Phase Response (degrees)',-100,100);
  $('cutoffValue').textContent=`${fc.toFixed(fc<10?3:2)} Hz`; $('phaseCutoff').textContent=isHigh?'+45°':'-45°'; $('effectiveCap').textContent=fmtCap(effectiveCapUf());
}
function updateModel(){ $('contextTopology').textContent=topologyLabel();$('modelInput').textContent=`${state.supply.toFixed(1)} V Step`;$('modelPlant').textContent=topologyLabel();$('modelTransfer').textContent=state.topology==='highpass'?'RCs / (RCs + 1)':'1 / (RCs + 1)';drawBode(); }
$('topology').onchange=e=>{state.topology=e.target.value;updateModel();resetTest();addLog(`${topologyLabel()} topology loaded.`)};
$('capConfig').onchange=e=>{state.capConfig=e.target.value;updateModel();resetTest();addLog(`Capacitor configuration changed to ${e.target.selectedOptions[0].text}.`)};
$('runSweepBtn').onclick=()=>{if(state.sweepRunning)return;state.sweepRunning=true;state.sweepComplete=false;state.sweepProgress=0;state.sweepStartedAt=performance.now();$('runSweepBtn').disabled=true;$('runSweepBtn').textContent='Sweeping…';addLog('Frequency sweep started. Live Bode traces are being acquired.','success');assistant('Frequency sweep running from 0.01fc to 100fc.');updateUI();};
function fullReportHtml(){const mag=$('bodeMagnitude').toDataURL('image/png'),phase=$('bodePhase').toDataURL('image/png'),scope=$('scope').toDataURL('image/png');return `<!doctype html><html><head><meta charset="utf-8"><title>RC Digital Twin Report</title><style>body{font-family:Arial;padding:35px;color:#10202a}h1{color:#086a86}table{border-collapse:collapse;width:100%;margin:20px 0}td,th{border:1px solid #bccbd3;padding:8px}img{width:100%;max-width:900px;border:1px solid #ccd}section{margin:28px 0}</style></head><body><h1>${integration.asset} — Automated Digital Twin Report</h1><p>${new Date().toLocaleString()}</p><table><tr><th>Scenario</th><td>${integration.scenario}</td></tr><tr><th>Topology</th><td>${topologyLabel()}</td></tr><tr><th>Capacitor configuration</th><td>${$('capConfig').selectedOptions[0].text}</td></tr><tr><th>Supply</th><td>${state.supply.toFixed(2)} V</td></tr><tr><th>Resistance</th><td>${fmtResistance(state.resistance)}</td></tr><tr><th>Effective capacitance</th><td>${fmtCap(effectiveCapUf())}</td></tr><tr><th>Time constant</th><td>${analysisTau().toFixed(5)} s</td></tr><tr><th>Cutoff frequency</th><td>${$('cutoffValue').textContent}</td></tr><tr><th>Health</th><td>${state.health}%</td></tr><tr><th>Fault</th><td>${activeFaultLabel()}</td></tr><tr><th>Final result</th><td>${diagnosticVerdict().result}</td></tr><tr><th>Reason</th><td>${diagnosticVerdict().reason}</td></tr></table><section><h2>Transient Oscilloscope</h2><img src="${scope}"></section><section><h2>Bode Magnitude</h2><img src="${mag}"></section><section><h2>Bode Phase</h2><img src="${phase}"></section><section><h2>System-Level Model</h2><p>Input Source → ${$('modelTransfer').textContent} → ${topologyLabel()} Plant → Scope and Report</p></section></body></html>`;}
function downloadFullReport(){const blob=new Blob([fullReportHtml()],{type:'text/html'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`RC-Digital-Twin-Full-Report-${Date.now()}.html`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);addLog('Automated report downloaded with figures and tables.','success');}
$('quickDownloadBtn').onclick=downloadFullReport;

if(integration.batchCount>0){
  $('assetGallery').classList.remove('hidden');
  const batchData=integration.batch;
  $('galleryScope').textContent=`${integration.scope||batchData?.scope||'Selected scope'} · ${integration.batchCount} asset${integration.batchCount===1?'':'s'}`;
  const diagramClass=(a)=> isIndustrial ? 'circuit' : a.id?.includes('ring')?'camera':a.id==='ps5'?'console':a.id==='tv'||a.id==='gameDisplay'?'display':a.id==='security'?'security':a.id==='ev'?'charger':a.id==='hvac'?'hvac':'circuit';
  const assetArea=(a)=> isIndustrial ? (a.facility||a.area||integration.scope||'Industrial') : (a.room||'Whole House');
  $('assetGalleryCards').innerHTML=batchData.assets.map((a,i)=>`<button class="asset-visual-card ${i===integration.batchIndex?'active':''}" data-gallery-index="${i}"><span class="mini-3d ${diagramClass(a)}"><i></i><b></b><em></em></span><span><strong>${a.name}</strong><small>${assetArea(a)} · ${a.scenario}</small></span><mark>${Math.round(a.health)}%</mark></button>`).join('');
  document.querySelectorAll('[data-gallery-index]').forEach(card=>card.onclick=()=>{const next=new URL(location.href);next.searchParams.set('assetIndex',card.dataset.galleryIndex);location.href=next.toString();});
  if(!isIndustrial && $('rcMonitorScope')){
    $('rcMonitorScope').value=batchData?.scope||'Whole House';
    $('rcMonitorScope').onchange=e=>{
      const room=e.target.value==='Whole House'?null:e.target.value;
      const first=batchData.assets.findIndex(a=>!room||a.room===room);
      document.querySelectorAll('[data-gallery-index]').forEach(card=>{const a=batchData.assets[Number(card.dataset.galleryIndex)];card.hidden=!!room&&a.room!==room;});
      if(first>=0 && room && batchData.assets[integration.batchIndex]?.room!==room){const next=new URL(location.href);next.searchParams.set('assetIndex',String(first));location.href=next.toString();}
    };
  }
}

if(integration.connected){
  $('connectionBanner').classList.remove('hidden');
  $('connectedAsset').textContent=integration.asset;
  $('contextAsset').textContent=integration.asset;
  $('contextScenario').textContent=integration.scenario;
  $('contextSource').textContent=sourceLabel;
  $('connectedScenario').textContent=`${integration.scenario} · upstream health ${integration.health}%`;
  if($('returnTwinBtn')){
    $('returnTwinBtn').textContent=returnLabel;
    $('returnTwinBtn').onclick=()=>location.href=integration.returnUrl;
  }
  $('supply').value=state.supply;$('resistance').value=state.resistance;$('capacitance').value=state.capacitanceUf;
  $('supplyOut').textContent=`${state.supply.toFixed(1)} V`;$('resistanceOut').textContent=fmtResistance(state.resistance);$('capacitanceOut').textContent=fmtCap(state.capacitanceUf);
  if(integration.upstreamFault!=='none'){state.upstreamFault=true;state.health=Math.min(state.health,68);addLog(`Upstream fault context received: ${integration.upstreamFault}.`,'error');}
  configureEquipmentLanguage();
  configureMonitorScope();
  configureIndustrialPanels();
  addLog(`Connected diagnostic session loaded for ${integration.asset}.`);
  assistant(`${integration.asset} linked from ${sourceLabel}. The transient test and oscilloscope started automatically.`);
  if($('autoRun').value==='on'){state.running=true;addLog('Connected diagnostic auto-started.','success');if(isIndustrial && $('runSweepBtn')) setTimeout(()=>$('runSweepBtn').click(),350);}
}
if(!integration.connected){$('contextAsset').textContent='Standalone RC Circuit';$('contextScenario').textContent='Manual laboratory test';$('contextSource').textContent='Laboratory';} updateModel();drawBode(0);addLog('RC Circuit Digital Twin initialized.');updateUI();setView('iso');


// v3.4.0 — appliance power, clamp sensors, local gateway, planning, and anomaly monitoring
const monitoringProfiles = {
  hvac:{label:'HVAC System',watts:3600,voltage:240,breaker:30,variance:.16,duty:.72},
  water:{label:'Water Heater',watts:4500,voltage:240,breaker:30,variance:.05,duty:.55},
  ev:{label:'EV Charger',watts:7200,voltage:240,breaker:40,variance:.035,duty:.9},
  refrigerator:{label:'Refrigerator',watts:180,voltage:120,breaker:15,variance:.22,duty:.45},
  washer:{label:'Washer',watts:650,voltage:120,breaker:20,variance:.2,duty:.6},
  dryer:{label:'Dryer',watts:5000,voltage:240,breaker:30,variance:.12,duty:.65},
  tv:{label:'Smart TV',watts:160,voltage:120,breaker:15,variance:.10,duty:.70}, soundbar:{label:'Smart Soundbar',watts:60,voltage:120,breaker:15,variance:.12,duty:.65}, ps5:{label:'PlayStation 5',watts:210,voltage:120,breaker:15,variance:.18,duty:.75}, gameDisplay:{label:'Gaming Display',watts:110,voltage:120,breaker:15,variance:.09,duty:.75}, security:{label:'Home Security Hub',watts:35,voltage:120,breaker:15,variance:.04,duty:.98}, ringFront:{label:'Ring Front Camera',watts:12,voltage:120,breaker:15,variance:.08,duty:.98}, ringRear:{label:'Ring Rear Camera',watts:12,voltage:120,breaker:15,variance:.08,duty:.98}, garageDoor:{label:'Smart Garage Door',watts:320,voltage:120,breaker:15,variance:.20,duty:.08},
  oven:{label:'Oven',watts:3400,voltage:240,breaker:30,variance:.1,duty:.6},
  dishwasher:{label:'Dishwasher',watts:1400,voltage:120,breaker:20,variance:.18,duty:.55},
  lighting:{label:'Lighting Circuit',watts:420,voltage:120,breaker:15,variance:.1,duty:.75},
  pharmaProcess:{label:'Pharma Process Twin',watts:integration.ratedWatts||323279,voltage:integration.lineVoltage||480,breaker:integration.breakerAmps||400,variance:.035,duty:.82,pf:integration.powerFactor||.98,liveWatts:integration.loadWatts||293890,temperatureC:integration.temperatureC||34},
  pharmaMixer:{label:'Liquid Batch Mixer',watts:55000,voltage:480,breaker:90,variance:.07,duty:.76,pf:.93,liveWatts:42000,temperatureC:41},
  pharmaPump:{label:'Transfer Pump',watts:25000,voltage:480,breaker:50,variance:.08,duty:.65,pf:.91,liveWatts:18000,temperatureC:38},
  pharmaHold:{label:'Intermediate Hold System',watts:22000,voltage:480,breaker:40,variance:.05,duty:.72,pf:.92,liveWatts:16000,temperatureC:36},
  pharmaPackaging:{label:'Filling & Packaging Line',watts:65000,voltage:480,breaker:100,variance:.10,duty:.80,pf:.94,liveWatts:48000,temperatureC:39},
  pharmaCip:{label:'CIP System',watts:40000,voltage:480,breaker:70,variance:.09,duty:.55,pf:.90,liveWatts:28000,temperatureC:44},
  pharmaUtilities:{label:'Pharma HVAC / Utilities',watts:90000,voltage:480,breaker:150,variance:.08,duty:.90,pf:.95,liveWatts:67000,temperatureC:35},
  default:{label:'Connected Appliance',watts:1200,voltage:120,breaker:20,variance:.15,duty:.65}
};
function monitorProfile(){
  if(isIndustrial && (integration.scope||'').toUpperCase()==='PHARMA') return monitoringProfiles.pharmaProcess;
  if(integration.ratedWatts>0)return {label:integration.asset,watts:integration.ratedWatts,voltage:integration.lineVoltage||120,breaker:integration.breakerAmps||20,variance:.035,duty:.7,pf:integration.powerFactor||.9,liveWatts:integration.loadWatts||integration.ratedWatts,temperatureC:integration.temperatureC||24};
  const hay=(integration.asset+' '+integration.scenario).toLowerCase();
  if(hay.includes('hvac'))return monitoringProfiles.hvac;
  if(hay.includes('water'))return monitoringProfiles.water;
  if(hay.includes('ev'))return monitoringProfiles.ev;
  if(hay.includes('refriger'))return monitoringProfiles.refrigerator;
  if(hay.includes('washer'))return monitoringProfiles.washer;
  if(hay.includes('dryer'))return monitoringProfiles.dryer;
  if(hay.includes('oven'))return monitoringProfiles.oven;
  if(hay.includes('dish'))return monitoringProfiles.dishwasher;
  if(hay.includes('light'))return monitoringProfiles.lighting;
  return monitoringProfiles.default;
}
const monitorState={samples:[],costSamples:[],energyKwh:0,peakWatts:0,peakAt:null,connected:false,selectedBreaker:0,lastTick:performance.now(),runSeconds:0,cycleChanges:0,lastHigh:false,activeAlerts:[]};
const residentialBreakerSeed=[
  {name:'HVAC / Air Handler',profile:monitoringProfiles.hvac},
  {name:'Water Heater',profile:monitoringProfiles.water},
  {name:'EV Charger',profile:monitoringProfiles.ev},
  {name:'Kitchen Appliances',profile:{...monitoringProfiles.oven,label:'Kitchen Appliances',watts:2900,breaker:30}},
  {name:'Laundry Equipment',profile:{...monitoringProfiles.dryer,label:'Laundry Equipment',watts:4200,breaker:30}},
  {name:'Lighting & Receptacles',profile:monitoringProfiles.lighting}
];
const pharmaEquipmentSeed=[
  {name:integration.asset||'Pharma Process Twin',profile:monitoringProfiles.pharmaProcess,group:'PROCESS'},
  {name:'Liquid Batch Mixer',profile:monitoringProfiles.pharmaMixer,group:'PROCESS'},
  {name:'Transfer Pump',profile:monitoringProfiles.pharmaPump,group:'TRANSFER'},
  {name:'Intermediate Hold System',profile:monitoringProfiles.pharmaHold,group:'TRANSFER'},
  {name:'Filling & Packaging Line',profile:monitoringProfiles.pharmaPackaging,group:'PACKAGING'},
  {name:'CIP System',profile:monitoringProfiles.pharmaCip,group:'UTILITIES'},
  {name:'Pharma HVAC / Utilities',profile:monitoringProfiles.pharmaUtilities,group:'UTILITIES'}
];
const breakerSeed=(isIndustrial && (integration.scope||'').toUpperCase()==='PHARMA') ? pharmaEquipmentSeed : residentialBreakerSeed;
function instantaneousApplianceWatts(){
  const p=monitorProfile(),phase=performance.now()/1000;
  const baseline=p.liveWatts||p.watts;
  const loadVariation=1+.018*Math.sin(phase*.41+integration.asset.length)+.009*Math.sin(phase*1.73);
  let watts=baseline*loadVariation;
  if(integration.faultCode==='door-seal'||integration.faultCode==='condenser-dust')watts*=1.22;
  if(integration.faultCode==='dirty-filter'||integration.faultCode==='low-refrigerant')watts*=1.15;
  if(integration.faultCode==='element-open'||integration.faultCode==='heater-open'||integration.faultCode==='lower-element-open')watts*=.55;
  if(integration.faultCode==='connector-heating')watts*=1.06;
  if(integration.faultCode==='derating')watts*=.62;
  if(state.fault==='short'||state.upstreamFault)watts*=1.35;
  if(state.fault==='open')watts=0;
  if(state.fault==='lowSupply')watts*=.72;
  if(state.fault==='leakage')watts*=1.12;
  if(state.fault==='drift')watts*=1.18;
  return Math.max(0,watts);
}
function controlCircuitWatts(){const e=effective();return Math.abs(e.v*state.current);}
function drawMonitorChart(id,values,baseline,titleSuffix='$'){
  const c=$(id);if(!c)return;const x=c.getContext('2d'),w=c.width,h=c.height,p=42;x.clearRect(0,0,w,h);x.fillStyle='#06121e';x.fillRect(0,0,w,h);x.strokeStyle='rgba(110,215,255,.13)';for(let i=0;i<=5;i++){const y=p+(h-p*2)*i/5;x.beginPath();x.moveTo(p,y);x.lineTo(w-p,y);x.stroke();}
  const max=Math.max(1,...values,baseline||0)*1.15;const plot=(arr,color)=>{x.strokeStyle=color;x.lineWidth=3;x.beginPath();arr.forEach((v,i)=>{const px=p+(w-p*2)*(i/Math.max(1,arr.length-1)),py=h-p-(h-p*2)*(v/max);i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke();};plot(values,'#48e4ff');if(baseline){plot(values.map(()=>baseline),'#ffc861');}x.fillStyle='#9bb8c8';x.font='13px sans-serif';x.fillText(`0`,8,h-p+4);x.fillText(`${max.toFixed(max>100?0:2)}${titleSuffix}`,8,p+4);
}
function updatePlanning(watts){
  const rate=Math.max(.01,Number($('electricRate')?.value||.18)),runtime=Math.max(.1,Number($('dailyRuntime')?.value||6)),backup=Math.max(1,Number($('backupHours')?.value||8)),planningFactor=Number($('solarHours')?.value||.8);
  if(isIndustrial){
    const p=monitorProfile(), loadFactor=Math.min(1,Math.max(.1,planningFactor)), peakKw=Math.max(watts,p.liveWatts||watts)/1000, connectedKw=Math.max(peakKw,p.watts/1000), utilization=Math.min(100,peakKw/Math.max(.001,connectedKw)*100), reserveKw=Math.max(0,connectedKw-peakKw);
    const monthlyKwh=peakKw*loadFactor*runtime*30,monthlyCost=monthlyKwh*rate;
    $('monthlyEnergy').textContent=`${monthlyKwh.toFixed(1)} kWh`; $('monthlyCost').textContent=monthlyCost.toLocaleString('en-US',{style:'currency',currency:'USD'}); $('solarSize').textContent=`${peakKw.toFixed(1)} kW`; $('batterySize').textContent=`${reserveKw.toFixed(1)} kW · ${utilization.toFixed(0)}% utilized`;
  } else {
    const monthlyKwh=watts/1000*runtime*30,monthlyCost=monthlyKwh*rate,sun=Math.max(1,planningFactor),solarKw=monthlyKwh/30/sun/0.8,batteryKwh=watts/1000*backup/0.85;
    $('monthlyEnergy').textContent=`${monthlyKwh.toFixed(1)} kWh`;$('monthlyCost').textContent=monthlyCost.toLocaleString('en-US',{style:'currency',currency:'USD'});$('solarSize').textContent=`${solarKw.toFixed(1)} kW`;$('batterySize').textContent=`${batteryKwh.toFixed(1)} kWh`;
  }
}
function renderBreakers(currentWatts){
  const activeScope=$('rcMonitorScope')?.value||'ALL';
  const connected=monitorProfile();const all=[{name:`${integration.asset} (Connected)`,profile:connected},...breakerSeed];
  $('breakerList').innerHTML=all.map((b,i)=>{const phase=performance.now()/1000+i;const watts=i===0?currentWatts:b.profile.watts*(.68+.17*Math.sin(phase*.28+i));const amps=watts/b.profile.voltage;return `<button class="breaker-card ${i===monitorState.selectedBreaker?'active':''}" data-breaker-index="${i}"><strong>${b.name}</strong><small>${b.profile.voltage} V · ${b.profile.breaker} A breaker</small><span class="load-line"><b>${watts.toFixed(0)} W</b><span>${amps.toFixed(1)} A</span></span></button>`}).join('');
  document.querySelectorAll('[data-breaker-index]').forEach(btn=>btn.onclick=()=>{monitorState.selectedBreaker=Number(btn.dataset.breakerIndex);renderBreakers(currentWatts);});
  const b=all[monitorState.selectedBreaker],watts=monitorState.selectedBreaker===0?currentWatts:b.profile.watts*(.68+.17*Math.sin(performance.now()/1000*.28+monitorState.selectedBreaker)),amps=watts/b.profile.voltage,util=amps/b.profile.breaker*100;
  $('breakerName').textContent=b.name;$('breakerCurrent').textContent=`${amps.toFixed(2)} A`;$('breakerUtilization').textContent=`${util.toFixed(0)}%`;$('breakerGauge').style.width=`${Math.min(100,util)}%`;$('clampStatus').textContent='Online';$('breakerAdvice').textContent=util>90?(isIndustrial?'Feeder overload risk. Reduce demand or verify feeder and protection sizing.':'Breaker overload risk. Shed load or verify conductor and breaker sizing.'):util>75?(isIndustrial?'High feeder utilization. Monitor starting current and concurrent equipment loads.':'High circuit utilization. Monitor startup current and concurrent loads.'):(isIndustrial?'Industrial feeder telemetry is within the expected operating range.':'Clamp sensor telemetry is within the expected range.');
}
function anomalyCheck(watts){
  const p=monitorProfile(),alerts=[];const high=watts>p.watts*.55;if(high)monitorState.runSeconds+=.5;else monitorState.runSeconds=Math.max(0,monitorState.runSeconds-1);if(high!==monitorState.lastHigh){monitorState.cycleChanges++;monitorState.lastHigh=high;}
  if($('overdrawAlert')?.checked&&watts>p.watts*1.22)alerts.push({level:'fault',title:'Abnormal overdraw detected',text:`${watts.toFixed(0)} W exceeds the ${p.watts.toFixed(0)} W ${isIndustrial?'equipment':'appliance'} baseline by more than 22%.`});
  if($('continuousRunAlert')?.checked&&monitorState.runSeconds>45){if(isIndustrial&&watts>p.watts*.85)alerts.push({level:'warn',title:'Extended high-load condition',text:'Equipment has remained above 85% of its configured demand baseline. Review process state, motor loading, cooling, and feeder current.'});else if(!isIndustrial&&p===monitoringProfiles.refrigerator)alerts.push({level:'warn',title:'Compressor continuous-run anomaly',text:'Refrigerator compressor runtime is unusually long. Check door seal, condenser airflow, temperature setpoint, or refrigerant condition.'});}
  if($('cyclingAlert')?.checked&&monitorState.cycleChanges>14)alerts.push({level:'warn',title:'Rapid cycling detected',text:'Frequent load transitions may indicate a thermostat, relay, contactor, or control-board issue.'});
  if(state.fault||state.upstreamFault)alerts.push({level:'fault',title:'Equipment fault correlation',text:`Electrical anomaly is correlated with ${activeFaultLabel()}.`});
  monitorState.activeAlerts=alerts;$('anomalyAlerts').innerHTML=alerts.length?alerts.map(a=>`<article class="${a.level==='fault'?'fault-alert':'warn-alert'}"><strong>${a.title}</strong><small>${a.text}</small></article>`).join(''):`<article class="normal-alert"><strong>No active anomalies</strong><small>Power behavior matches the expected ${isIndustrial?'equipment':'appliance'} profile.</small></article>`;
  $('anomalyBadge').className=`badge ${alerts.some(a=>a.level==='fault')?'fault':alerts.length?'warning':'normal'}`;$('anomalyBadge').textContent=alerts.some(a=>a.level==='fault')?'ALERT':alerts.length?'WATCH':'NORMAL';
}
function gatewayPayload(watts){const p=monitorProfile();return {timestamp:new Date().toISOString(),source:'EES RC Controls Digital Twin',asset:integration.asset,scenario:integration.scenario,entities:{instant_power_w:Number(watts.toFixed(2)),current_a:Number((watts/p.voltage).toFixed(3)),voltage_v:p.voltage,control_circuit_power_w:Number(controlCircuitWatts().toFixed(6)),session_energy_kwh:Number(monitorState.energyKwh.toFixed(5)),peak_power_w:Number(monitorState.peakWatts.toFixed(2)),diagnostic:diagnosticVerdict().result,fault:activeFaultLabel(),health_percent:state.health,anomaly_count:monitorState.activeAlerts.length}};}
function publishGateway(){const payload=gatewayPayload(instantaneousApplianceWatts());$('haPayload').textContent=JSON.stringify(payload,null,2);localStorage.setItem(isIndustrial?'ees.industrialGateway.latestPayload':'ees.homeAssistant.latestPayload',JSON.stringify(payload));addLog(isIndustrial?'Industrial equipment telemetry snapshot published.':'Local smart-home telemetry snapshot published.','success');return payload;}
function monitoringTick(){
  const now=performance.now(),dt=Math.min(2,(now-monitorState.lastTick)/1000);monitorState.lastTick=now;const watts=instantaneousApplianceWatts(),p=monitorProfile(),amps=watts/p.voltage;monitorState.energyKwh+=watts*dt/3600000;if(watts>monitorState.peakWatts){monitorState.peakWatts=watts;monitorState.peakAt=new Date();}
  monitorState.samples.push(watts);if(monitorState.samples.length>90)monitorState.samples.shift();const rate=Math.max(.01,Number($('electricRate')?.value||.18));monitorState.costSamples.push(monitorState.energyKwh*rate);if(monitorState.costSamples.length>90)monitorState.costSamples.shift();
  $('instantWatts').textContent=`${watts.toFixed(0)} W`;$('instantAmps').textContent=`${amps.toFixed(2)} A at ${p.voltage} V`;$('controlWatts').textContent=`${controlCircuitWatts().toFixed(4)} W`;$('sessionEnergy').textContent=`${monitorState.energyKwh.toFixed(4)} kWh`;$('sessionCost').textContent=`${(monitorState.energyKwh*rate).toLocaleString('en-US',{style:'currency',currency:'USD'})} estimated cost`;$('monitorPeak').textContent=`${monitorState.peakWatts.toFixed(0)} W`;$('peakTime').textContent=monitorState.peakAt?`Captured ${monitorState.peakAt.toLocaleTimeString()}`:'No peak captured';
  drawMonitorChart('powerTrend',monitorState.samples,p.watts,' W');drawMonitorChart('costTrend',monitorState.costSamples,0,' $');renderBreakers(watts);updatePlanning(watts);anomalyCheck(watts);
}
$('scanBreakersBtn').onclick=()=>{addLog(`Current clamp sensor scan complete: all simulated ${isIndustrial?'feeders / equipment':'breakers'} online.`,'success');$('clampStatus').textContent='Online';};
if($('connectHaBtn')) $('connectHaBtn').onclick=()=>{monitorState.connected=!monitorState.connected;$('haBadge').className=`badge ${monitorState.connected?'normal':'warning'}`;$('haBadge').textContent=monitorState.connected?'CONNECTED':'DISCONNECTED';$('connectHaBtn').textContent=monitorState.connected?(isIndustrial?'Disconnect Industrial Gateway':'Disconnect Gateway'):(isIndustrial?'Connect Industrial Gateway':'Connect Gateway');addLog(`${isIndustrial?'Industrial gateway':'Home Assistant gateway'} ${monitorState.connected?'connected locally':'disconnected'}.`,monitorState.connected?'success':'warn');if(monitorState.connected)publishGateway();};
$('publishHaBtn').onclick=publishGateway;
$('downloadPayloadBtn').onclick=()=>{const blob=new Blob([JSON.stringify(publishGateway(),null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${isIndustrial?'ees-industrial-equipment':'ees-home-assistant'}-payload-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);};
$('recalculateSizingBtn').onclick=()=>updatePlanning(instantaneousApplianceWatts());
['electricRate','dailyRuntime','backupHours','solarHours'].forEach(id=>$(id).addEventListener('input',()=>updatePlanning(instantaneousApplianceWatts())));
configureIndustrialPanels();setInterval(monitoringTick,500);monitoringTick();


// v3.6.0 — engineering blueprints, wiring diagrams, multimeter, and motor-control references
const drawingState={view:'blueprint',circuit:'ac'};
function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function svgFrame(body,title){return `<svg viewBox="0 0 1100 620" xmlns="http://www.w3.org/2000/svg"><rect width="1100" height="620" fill="#071b2d"/><g stroke="#49c9ff" fill="none" stroke-width="2">${body}</g><g fill="#aeeaff" font-family="Arial"><text x="30" y="35" font-size="20">EES — ${esc(title)}</text><text x="880" y="590" font-size="13">DWG: EES-MC-036</text><text x="30" y="590" font-size="13">Educational simulation — verify against current project requirements</text></g></svg>`;}
function component(x,y,w,h,label,tag=''){return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/><text x="${x+w/2}" y="${y+h/2}" text-anchor="middle" dominant-baseline="middle" fill="#d9f8ff" stroke="none" font-size="15">${label}</text>${tag?`<text x="${x+8}" y="${y+18}" fill="#ffc861" stroke="none" font-size="12">${tag}</text>`:''}`;}
function drawingSvg(){const c=drawingState.circuit,v=drawingState.view;let b='';
 if(v==='blueprint'){b+=`<rect x="90" y="70" width="920" height="470" rx="12"/>${component(135,115,170,95,'Main Disconnect','DS1')}${component(360,115,170,95,'Branch Protection','CB1')}${component(585,115,170,95,c==='vfd'?'VFD':'Motor Starter','M1')}${component(810,115,145,95,'Motor Load','MTR1')}${component(135,285,170,95,c==='dc'?'24 VDC Supply':'Control Transformer','PS1')}${component(360,285,170,95,'Terminal Blocks','TB1')}${component(585,285,170,95,'Safety / Stop','E-STOP')}${component(810,285,145,95,'PLC / Relay','CR1')}<path d="M305 162H360M530 162H585M755 162H810M220 210V285M445 210V285M670 210V285M880 210V285"/>`;}
 else if(v==='ladder'){const source=c==='dc'?'+24 VDC':'L1';const ret=c==='dc'?'0 VDC':'L2';b+=`<line x1="100" y1="75" x2="100" y2="535"/><line x1="1000" y1="75" x2="1000" y2="535"/><text x="75" y="62" fill="#d9f8ff" stroke="none">${source}</text><text x="980" y="62" fill="#d9f8ff" stroke="none">${ret}</text><line x1="100" y1="150" x2="270" y2="150"/><path d="M270 125V175M320 125V175"/><text x="265" y="110" fill="#ffc861" stroke="none">STOP NC</text><line x1="320" y1="150" x2="470" y2="150"/><path d="M470 125V175M520 125V175"/><text x="465" y="110" fill="#ffc861" stroke="none">START NO</text><line x1="520" y1="150" x2="760" y2="150"/><circle cx="820" cy="150" r="42"/><text x="800" y="155" fill="#d9f8ff" stroke="none">M1</text><line x1="862" y1="150" x2="1000" y2="150"/><line x1="100" y1="285" x2="380" y2="285"/><path d="M380 260V310M430 260V310"/><text x="375" y="245" fill="#ffc861" stroke="none">M1 AUX</text><line x1="430" y1="285" x2="1000" y2="285"/>`; if(c==='reversing')b+=`<line x1="100" y1="420" x2="360" y2="420"/><path d="M360 395V445M410 395V445"/><text x="350" y="380" fill="#ffc861" stroke="none">REV CMD</text><line x1="410" y1="420" x2="760" y2="420"/><circle cx="820" cy="420" r="42"/><text x="790" y="425" fill="#d9f8ff" stroke="none">M2 REV</text><line x1="862" y1="420" x2="1000" y2="420"/>`;}
 else if(v==='schematic'){b+=`<text x="70" y="90" fill="#ffc861" stroke="none">POWER CIRCUIT</text><line x1="90" y1="130" x2="230" y2="130"/>${component(230,95,150,70,'Disconnect','DS1')}<line x1="380" y1="130" x2="500" y2="130"/>${component(500,95,150,70,c==='vfd'?'VFD':'Contactor','M1')}<line x1="650" y1="130" x2="790" y2="130"/>${component(790,95,170,70,'3Ø Motor','MTR1')}<text x="70" y="280" fill="#ffc861" stroke="none">CONTROL CIRCUIT</text>${component(120,320,150,70,'E-Stop NC','ES1')}<line x1="270" y1="355" x2="390" y2="355"/>${component(390,320,150,70,'Stop / Start','PB1/PB2')}<line x1="540" y1="355" x2="660" y2="355"/>${component(660,320,150,70,c==='dc'?'24 VDC Coil':'120 VAC Coil','M1')}<line x1="810" y1="355" x2="960" y2="355"/>`;}
 else {b+=`<text x="60" y="75" fill="#ffc861" stroke="none">POINT-TO-POINT WIRING</text>${component(95,110,180,90,'TB1 Terminals','1–6')}${component(460,110,180,90,'Contactor','M1')}${component(825,110,180,90,'Motor','MTR1')}<path d="M275 130C350 130 390 130 460 130M275 155C350 155 390 155 460 155M275 180C350 180 390 180 460 180M640 130C715 130 755 130 825 130M640 155C715 155 755 155 825 155M640 180C715 180 755 180 825 180"/><text x="330" y="120" fill="#d9f8ff" stroke="none">BLK 14 AWG</text><text x="695" y="120" fill="#d9f8ff" stroke="none">T1/T2/T3</text>${component(95,340,180,90,c==='dc'?'24 VDC PSU':'Control XFMR','PS1')}${component(460,340,180,90,'Start / Stop','PB1/PB2')}${component(825,340,180,90,'Coil A1/A2','M1')}<path d="M275 365C350 365 390 365 460 365M640 365C715 365 755 365 825 365"/><text x="325" y="350" fill="#d9f8ff" stroke="none">RED / WHT</text>`;}
 return svgFrame(b,`${$('drawingView').selectedOptions[0].text} — ${$('controlCircuit').selectedOptions[0].text}`);}
function drawingNotes(){const ac=drawingState.circuit!=='dc';const notes=[`Separate power and control conductors where practical.`,`Identify field and internal conductors consistently with the project drawing set.`,ac?`Control circuit shown with AC coil conventions; verify coil voltage and transformer protection.`:`24 VDC control uses defined L+ and 0 VDC reference points.`,`Provide branch-circuit protection and disconnecting means appropriate to the load.`,`Verify short-circuit current rating, component ratings, spacing, enclosure, and environmental requirements.`];$('drawingNotes').innerHTML='<ul>'+notes.map(n=>`<li>${n}</li>`).join('')+'</ul>';$('drawingTitle').textContent=$('drawingView').selectedOptions[0].text;}
function renderDrawing(){drawingState.view=$('drawingView').value;drawingState.circuit=$('controlCircuit').value;$('drawingCanvas').innerHTML=drawingSvg();drawingNotes();updateStandards();}
$('drawingView').onchange=renderDrawing;$('controlCircuit').onchange=()=>{renderDrawing();addLog(`${$('controlCircuit').selectedOptions[0].text} loaded into engineering drawings.`,'success');};
$('downloadDrawingBtn').onclick=()=>{const blob=new Blob([drawingSvg()],{type:'image/svg+xml'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`EES-${drawingState.view}-${drawingState.circuit}.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
let meterHold=false,meterHeld=0;
function meterValue(){const mode=$('meterMode').value,p=$('meterPointsSelect').value,e=effective();if(mode==='resistance')return p==='resistor'?e.r:p==='coil'?(drawingState.circuit==='dc'?480:2200):1e6;if(mode==='continuity')return (state.fault==='open'||p==='motor'&&state.fault==='open')?1:0;if(mode==='current')return p==='motor'?(window.eesPowerMonitor?.instantPower||0)/(window.eesPowerMonitor?.profile?.voltage||120):Math.abs(state.current);if(mode==='acv')return drawingState.circuit==='dc'?0:(p==='motor'?240:120);if(p==='capacitor')return state.voltage;if(p==='resistor')return Math.max(0,e.v-state.voltage);if(p==='coil')return drawingState.circuit==='dc'?24:120;return e.v;}
function updateMeter(){if(!$('meterMode'))return;const mode=$('meterMode').value;let val=meterHold?meterHeld:meterValue();let text='',badge='';if(mode==='dcv'){text=`${val.toFixed(3)} V`;badge='DC VOLTS'}else if(mode==='acv'){text=`${val.toFixed(1)} V RMS`;badge='AC VOLTS'}else if(mode==='current'){text=val<1?`${(val*1000).toFixed(2)} mA`:`${val.toFixed(2)} A`;badge='CURRENT'}else if(mode==='resistance'){text=val>=1e6?'OL':fmtResistance(val);badge='OHMS'}else{text=val?'OPEN':'BEEP';badge='CONTINUITY'}$('meterReading').textContent=text;$('meterModeBadge').textContent=badge;$('meterPoints').textContent=$('meterPointsSelect').selectedOptions[0].text;$('meterBar').style.width=`${Math.min(100,Math.abs(val)/(mode==='current'?30:mode.includes('v')?240:10000)*100)}%`;}
function inspectMeter(){$('componentTitle').textContent='3D Digital Multimeter';$('componentDetails').innerHTML=`<table class="report-table"><tr><td>Mode</td><td>${$('meterMode').selectedOptions[0].text}</td></tr><tr><td>Test points</td><td>${$('meterPointsSelect').selectedOptions[0].text}</td></tr><tr><td>Reading</td><td>${$('meterReading').textContent}</td></tr><tr><td>State</td><td>${meterHold?'Held':'Live'}</td></tr></table>`;$('componentDialog').showModal();}
$('meterMode').onchange=updateMeter;$('meterPointsSelect').onchange=updateMeter;$('holdMeterBtn').onclick=()=>{meterHold=!meterHold;if(meterHold)meterHeld=meterValue();$('holdMeterBtn').textContent=meterHold?'Release Hold':'Hold Reading';updateMeter();};
function updateStandards(){const checks=[['Disconnecting means identified',true,'Main disconnect is shown and labeled.'],['Branch protection shown',true,'Protective device is included ahead of the starter.'],['Control voltage identified',true,`Selected control voltage: ${drawingState.circuit==='dc'?'24 VDC':'120 VAC'}.`],['Emergency-stop path shown',true,'Normally closed stop device is represented in the control path.'],['SCCR engineering review',false,'Project-specific available fault current and component SCCR must be verified.'],['Wire sizing and ampacity review',false,'Conductor gauge must be selected from actual load, insulation, temperature, and installation conditions.'],['Enclosure and spacing review',false,'Verify enclosure type, environmental rating, spacings, and field wiring requirements.'],['Labeling and documentation',true,'Device tags and drawing references are included in the simulated set.']];$('standardsChecklist').innerHTML=checks.map(x=>`<article class="code-check ${x[1]?'pass':'review'}"><b>${x[1]?'✓':'!'}</b><div><strong>${x[0]}</strong><small>${x[2]}</small></div></article>`).join('');const review=checks.some(x=>!x[1]);$('codeBadge').textContent=review?'REVIEW REQUIRED':'CHECKED';$('codeBadge').className=`badge ${review?'warning':'normal'}`;}
setInterval(updateMeter,120);renderDrawing();updateMeter();
