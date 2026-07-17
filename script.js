(function(){

  const NS = "http://www.w3.org/2000/svg";
  const nucleusGroup = document.getElementById('nucleus');
  const shell1Group = document.getElementById('shell-1');
  const shell2Group = document.getElementById('shell-2');
  const ringK = document.getElementById('ring-k');
  const ringL = document.getElementById('ring-l');
  const svg = document.getElementById('atom-svg');
  const infoTitle = document.getElementById('info-title');
  const infoDesc = document.getElementById('info-desc');
  const chargeVal = document.getElementById('charge-val');
  const chargeLabel = document.getElementById('charge-label');
  const removeBtn = document.getElementById('remove-e');
  const addBtn = document.getElementById('add-e');
  const resetBtn = document.getElementById('ion-reset');
  const configStrip = document.getElementById('config-strip');

  function el(name, attrs){
    const n = document.createElementNS(NS, name);
    for(const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  const info = {
    proton: {
      title: 'Proton · positive charge',
      desc: 'Carries a positive charge and defines the element. Carbon always has exactly six — change that number and it stops being carbon.'
    },
    neutron: {
      title: 'Neutron · no charge',
      desc: 'Carries no charge, only mass. Carbon-12 (the common form) has six; carbon-14, used in radiocarbon dating, has eight.'
    },
    electronK: {
      title: 'K-shell electron',
      desc: 'One of two innermost electrons. This shell is always full for carbon and does not take part in bonding.'
    },
    electronL: {
      title: 'L-shell electron · valence',
      desc: 'A valence electron — the outer four (when neutral) that carbon shares or transfers to form chemical bonds.'
    }
  };

  function selectParticle(node, key){
    document.querySelectorAll('.selected').forEach(n => n.classList.remove('selected'));
    node.classList.add('selected');
    infoTitle.textContent = info[key].title;
    infoDesc.textContent = info[key].desc;
  }

  function makeInteractive(g, key, label){
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', label);
    g.addEventListener('click', () => selectParticle(g, key));
    g.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        selectParticle(g, key);
      }
    });
  }

  // ================= 3D engine =================
  const CENTER = 300;
  const PERSPECTIVE_D = 480;

  function rotX(p, a){
    const c = Math.cos(a), s = Math.sin(a);
    return { x: p.x, y: p.y*c - p.z*s, z: p.y*s + p.z*c };
  }
  function rotY(p, a){
    const c = Math.cos(a), s = Math.sin(a);
    return { x: p.x*c + p.z*s, y: p.y, z: -p.x*s + p.z*c };
  }
  function rotZ(p, a){
    const c = Math.cos(a), s = Math.sin(a);
    return { x: p.x*c - p.y*s, y: p.x*s + p.y*c, z: p.z };
  }

  function project(p){
    const scale = PERSPECTIVE_D / (PERSPECTIVE_D + p.z);
    return { x: CENTER + p.x*scale, y: CENTER + p.y*scale, scale };
  }

  // current view orientation (radians): pitch, yaw, roll
  const viewRot = { x: -0.35, y: 0.55, z: 0 };

  function toView(p){
    let q = rotX(p, viewRot.x);
    q = rotY(q, viewRot.y);
    q = rotZ(q, viewRot.z);
    return q;
  }

  // ---- Nucleus: 12 nucleons packed on a small sphere ----
  function fibonacciSphere(n, radius){
    const pts = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for(let i=0;i<n;i++){
      const y = 1 - (i/(n-1))*2;
      const r = Math.sqrt(Math.max(0, 1 - y*y));
      const theta = golden * i;
      pts.push({ x: Math.cos(theta)*r*radius, y: y*radius, z: Math.sin(theta)*r*radius });
    }
    return pts;
  }
  const nucleonBase = fibonacciSphere(12, 15);
  const nucleonTypes = ['p','p','p','p','p','p','n','n','n','n','n','n'];
  const packOrder = [0,6,1,7,2,8,3,9,4,10,5,11]; // interleave protons/neutrons visually

  const nucleonEls = [];
  packOrder.forEach((idx, i) => {
    const isP = nucleonTypes[idx] === 'p';
    const g = el('g', { class: 'particle nucleon ' + (isP ? 'proton' : 'neutron') });
    const c = el('circle', { cx: 0, cy: 0, r: 9 });
    const label = el('text', { x: 0, y: 3.2, class: 'label-tip', fill: '#141311', style: 'font-size:8px; font-weight:600;' });
    label.textContent = isP ? 'p+' : 'n';
    g.appendChild(c);
    g.appendChild(label);
    nucleusGroup.appendChild(g);
    makeInteractive(g, isP ? 'proton' : 'neutron', (isP ? 'Proton' : 'Neutron') + ' ' + (i+1) + ' of 12 nucleons');
    nucleonEls.push({ el: g, base: nucleonBase[idx] });
  });

  // ---- Electron shells ----
  const K_RADIUS = 110, L_RADIUS = 200;
  const K_TILT_X = 0;
  const L_TILT_X = 55 * Math.PI / 180;

  const shellState = { K: 2, L: 4 };
  const shellEls = { K: [], L: [] };
  const shellSpeedFactor = { K: 1, L: 1 }; // eased multiplier, lerps toward hover target each frame
  const shellHoverCount = { K: 0, L: 0 };  // >0 while pointer is over any electron in that shell

  function buildShellEls(group, count, key){
    group.innerHTML = '';
    const arr = [];
    for(let i=0;i<count;i++){
      const g = el('g', { class: 'particle electron' });
      const c = el('circle', { cx: 0, cy: 0, r: 6 });
      g.appendChild(c);
      group.appendChild(g);
      makeInteractive(g, key === 'K' ? 'electronK' : 'electronL',
        (key === 'K' ? 'K-shell' : 'L-shell') + ' electron ' + (i+1) + ' of ' + count);
      g.addEventListener('pointerenter', () => { shellHoverCount[key]++; });
      g.addEventListener('pointerleave', () => { shellHoverCount[key] = Math.max(0, shellHoverCount[key] - 1); });
      arr.push({ el: g, angleOffset: (i/count) * Math.PI * 2 });
    }
    shellEls[key] = arr;
  }
  function rebuildElectrons(){
    buildShellEls(shell1Group, shellState.K, 'K');
    buildShellEls(shell2Group, shellState.L, 'L');
  }
  rebuildElectrons();

  // ---- Orbit ring paths (drawn each frame, follow the current rotation) ----
  function buildRingPoints(radius, tiltX, segments){
    const pts = [];
    for(let i=0;i<=segments;i++){
      const a = (i/segments) * Math.PI * 2;
      pts.push(rotX({ x: radius*Math.cos(a), y: radius*Math.sin(a), z: 0 }, tiltX));
    }
    return pts;
  }
  const kRingBase = buildRingPoints(K_RADIUS, K_TILT_X, 64);
  const lRingBase = buildRingPoints(L_RADIUS, L_TILT_X, 64);

  function updateRing(basePts, pathEl){
    const d = basePts.map((p, i) => {
      const proj = project(toView(p));
      return (i === 0 ? 'M' : 'L') + proj.x.toFixed(1) + ',' + proj.y.toFixed(1);
    }).join(' ') + ' Z';
    pathEl.setAttribute('d', d);
  }

  // ---- Animation loop ----
  let angleK = 0, angleL = 0;
  let speedMultiplier = 1;
  const baseSpeedK = (Math.PI*2) / 9;
  const baseSpeedL = -(Math.PI*2) / 16;
  let lastT = null;

  function tick(t){
    if(lastT == null) lastT = t;
    const dt = (t - lastT) / 1000;
    lastT = t;

    // ease each shell's speed toward "slow" while any of its electrons is hovered, else back to normal
    const targetK = shellHoverCount.K > 0 ? 0.05 : 1;
    const targetL = shellHoverCount.L > 0 ? 0.05 : 1;
    const ease = Math.min(1, dt * 6);
    shellSpeedFactor.K += (targetK - shellSpeedFactor.K) * ease;
    shellSpeedFactor.L += (targetL - shellSpeedFactor.L) * ease;

    angleK += baseSpeedK * speedMultiplier * shellSpeedFactor.K * dt;
    angleL += baseSpeedL * speedMultiplier * shellSpeedFactor.L * dt;

    const renderList = [];

    nucleonEls.forEach(n => {
      renderList.push({ el: n.el, p: toView(n.base) });
    });
    shellEls.K.forEach(e => {
      const a = angleK + e.angleOffset;
      const local = rotX({ x: K_RADIUS*Math.cos(a), y: K_RADIUS*Math.sin(a), z: 0 }, K_TILT_X);
      renderList.push({ el: e.el, p: toView(local) });
    });
    shellEls.L.forEach(e => {
      const a = angleL + e.angleOffset;
      const local = rotX({ x: L_RADIUS*Math.cos(a), y: L_RADIUS*Math.sin(a), z: 0 }, L_TILT_X);
      renderList.push({ el: e.el, p: toView(local) });
    });

    // painter's algorithm: draw farthest (largest z) first
    renderList.sort((a, b) => b.p.z - a.p.z);
    renderList.forEach(item => {
      const proj = project(item.p);
      item.el.setAttribute('transform', `translate(${proj.x.toFixed(1)},${proj.y.toFixed(1)}) scale(${proj.scale.toFixed(3)})`);
      item.el.style.opacity = Math.max(0.35, Math.min(1, proj.scale)).toFixed(2);
      // keep z-order visually correct among overlapping siblings within the same parent groups
    });

    updateRing(kRingBase, ringK);
    updateRing(lRingBase, ringL);

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // ---- Ionization controls ----
  function updateIonUI(){
    const totalElectrons = shellState.K + shellState.L;
    const charge = 6 - totalElectrons;
    const sign = charge > 0 ? '+' : '';
    chargeVal.textContent = charge === 0 ? '0' : (sign + charge);
    let label;
    if(charge === 0) label = 'neutral carbon atom';
    else if(charge > 0) label = 'cation, C' + (charge===1?'':charge) + '+ · ' + charge + ' electron' + (charge>1?'s':'') + ' short';
    else label = 'anion, C' + (Math.abs(charge)===1?'':Math.abs(charge)) + '− · ' + Math.abs(charge) + ' extra electron' + (Math.abs(charge)>1?'s':'');
    chargeLabel.textContent = label;

    removeBtn.disabled = shellState.L <= 0;
    addBtn.disabled = shellState.L >= 8;

    if(shellState.L === 4){
      configStrip.innerHTML = '<span class="seg">1s<sup>2</sup></span><span class="divider">/</span><span class="seg">2s<sup>2</sup></span><span class="divider">/</span><span class="seg">2p<sup>2</sup></span>';
    } else {
      configStrip.innerHTML = '<span class="seg">K shell<sup>' + shellState.K + '</sup></span><span class="divider">/</span><span class="seg">L shell<sup>' + shellState.L + '</sup></span>';
    }
  }
  removeBtn.addEventListener('click', () => {
    if(shellState.L > 0){ shellState.L -= 1; rebuildElectrons(); updateIonUI(); }
  });
  addBtn.addEventListener('click', () => {
    if(shellState.L < 8){ shellState.L += 1; rebuildElectrons(); updateIonUI(); }
  });
  resetBtn.addEventListener('click', () => {
    shellState.L = 4; rebuildElectrons(); updateIonUI();
  });
  updateIonUI();

  // ---- Speed controls ----
  const chips = document.querySelectorAll('.chip[data-speed]');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      speedMultiplier = parseFloat(chip.dataset.speed);
    });
  });

  // ---- Drag to rotate in 3D (pitch + yaw, shift for roll) & scroll to zoom ----
  let dragging = false;
  let lastX = 0, lastY = 0;

  function pointerDown(e){
    if(e.target.closest && e.target.closest('.particle')) return;
    dragging = true;
    svg.classList.add('dragging');
    lastX = e.clientX; lastY = e.clientY;
    svg.setPointerCapture(e.pointerId);
  }
  function pointerMove(e){
    if(!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    if(e.shiftKey){
      viewRot.z += dx * 0.008;
    } else {
      viewRot.y += dx * 0.008;
      viewRot.x += dy * 0.008;
    }
  }
  function pointerUp(){
    dragging = false;
    svg.classList.remove('dragging');
  }
  svg.addEventListener('pointerdown', pointerDown);
  svg.addEventListener('pointermove', pointerMove);
  svg.addEventListener('pointerup', pointerUp);
  svg.addEventListener('pointerleave', pointerUp);
})();
