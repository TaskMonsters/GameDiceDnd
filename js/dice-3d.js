/**
 * 3D Polyhedral Dice Renderer — Enhanced Edition
 * Renders authentic polyhedral shapes with numbered faces using Three.js
 * Each die type shows proper face numbers on every visible face
 */

const Dice3D = (() => {
  let scene, camera, renderer;
  let diceObjects = [];
  let isInitialized = false;
  let animationFrameId = null;
  let container = null;
  let currentTheme = null;

  // ── Geometry builders ─────────────────────────────────────────────────────

  const buildD4 = () => {
    const geo = new THREE.TetrahedronGeometry(2.0, 0);
    return geo;
  };
  const buildD6 = () => new THREE.BoxGeometry(2.4, 2.4, 2.4);
  const buildD8 = () => {
    const geo = new THREE.OctahedronGeometry(2.0, 0);
    return geo;
  };
  const buildD10 = () => {
    // Pentagonal trapezohedron — 10 kite-shaped faces
    // We build a custom geometry that looks like a real d10
    return buildPentagonalTrapezohedron(1.5, 2.4);
  };
  const buildD12 = () => {
    const geo = new THREE.DodecahedronGeometry(1.9, 0);
    return geo;
  };
  const buildD20 = () => {
    const geo = new THREE.IcosahedronGeometry(2.0, 0);
    return geo;
  };
  const buildD100 = () => {
    // D100 looks like a d10 but labeled 00-90
    return buildPentagonalTrapezohedron(1.5, 2.4);
  };

  // Build a pentagonal trapezohedron (real d10 shape)
  const buildPentagonalTrapezohedron = (r, h) => {
    const vertices = [];
    const indices = [];
    const uvs = [];

    const top = [0, h * 0.35, 0];
    const bottom = [0, -h * 0.35, 0];

    // Upper ring (5 vertices, slightly above equator)
    const upperRing = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      upperRing.push([
        r * Math.cos(angle),
        h * 0.12,
        r * Math.sin(angle)
      ]);
    }

    // Lower ring (5 vertices, rotated 36°, slightly below equator)
    const lowerRing = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + Math.PI / 5;
      lowerRing.push([
        r * Math.cos(angle),
        -h * 0.12,
        r * Math.sin(angle)
      ]);
    }

    // Build 10 kite faces (each face = 2 triangles)
    const geo = new THREE.BufferGeometry();
    const posArr = [];
    const normArr = [];
    const uvArr = [];

    const addFace = (v0, v1, v2, v3) => {
      // Quad face: v0, v1, v2, v3 (two triangles)
      // Compute normal
      const a = new THREE.Vector3(...v0);
      const b = new THREE.Vector3(...v1);
      const c = new THREE.Vector3(...v2);
      const n = new THREE.Vector3().crossVectors(
        new THREE.Vector3().subVectors(b, a),
        new THREE.Vector3().subVectors(c, a)
      ).normalize();

      // Triangle 1: v0, v1, v2
      posArr.push(...v0, ...v1, ...v2);
      normArr.push(n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z);
      uvArr.push(0.5, 1, 0, 0, 1, 0);

      // Triangle 2: v0, v2, v3
      posArr.push(...v0, ...v2, ...v3);
      normArr.push(n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z);
      uvArr.push(0.5, 1, 1, 0, 0.5, 0.5);
    };

    // 5 upper faces (top → upperRing[i] → lowerRing[i] → upperRing[i+1])
    for (let i = 0; i < 5; i++) {
      const next = (i + 1) % 5;
      addFace(top, upperRing[i], lowerRing[i], upperRing[next]);
    }

    // 5 lower faces (bottom → lowerRing[i+1] → upperRing[i+1] → lowerRing[i])
    for (let i = 0; i < 5; i++) {
      const next = (i + 1) % 5;
      addFace(bottom, lowerRing[next], upperRing[next], lowerRing[i]);
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normArr, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
    return geo;
  };

  const geometryBuilders = {
    d4: buildD4,
    d6: buildD6,
    d8: buildD8,
    d10: buildD10,
    d12: buildD12,
    d20: buildD20,
    d100: buildD100
  };

  // ── Scene Initialization ──────────────────────────────────────────────────

  const initScene = (containerElement) => {
    if (isInitialized && container !== containerElement) {
      dispose();
    }
    if (isInitialized) return;

    container = containerElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    scene = new THREE.Scene();
    scene.background = null;

    const isMobile = width < 768;
    const fov = isMobile ? 60 : 52;
    const camY = isMobile ? 14 : 18;
    camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 1000);
    camera.position.set(0, camY, 4);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Lighting setup for dramatic dice look
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    // Main key light — top-right
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(6, 14, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    scene.add(keyLight);

    // Fill light — left side, slightly blue
    const fillLight = new THREE.DirectionalLight(0xaaccff, 0.35);
    fillLight.position.set(-8, 6, -4);
    scene.add(fillLight);

    // Rim light — below, warm
    const rimLight = new THREE.PointLight(0xffd080, 0.5, 40);
    rimLight.position.set(0, -4, 6);
    scene.add(rimLight);

    // Top accent light
    const topLight = new THREE.PointLight(0xffffff, 0.3, 30);
    topLight.position.set(0, 10, 0);
    scene.add(topLight);

    // Ground shadow plane
    const groundGeo = new THREE.PlaneGeometry(80, 80);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.18 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.8;
    ground.receiveShadow = true;
    scene.add(ground);

    isInitialized = true;
    start();
    window.addEventListener('resize', handleResize);
  };

  // ── Texture Factory ───────────────────────────────────────────────────────

  /**
   * Creates a high-quality face texture with number, gradient, and decorative elements
   * @param {string|number} label - The number/label to show on this face
   * @param {object} theme - Color theme
   * @param {string} dieType - e.g. 'd20'
   * @param {boolean} isResult - Whether this is the result face (highlighted)
   * @param {boolean} isD4Bottom - D4 reads from bottom edge, needs rotation
   */
  const makeFaceTex = (label, theme, dieType, isResult = false, isD4Bottom = false) => {
    const SIZE = 512;
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');

    const cx = SIZE / 2;
    const cy = SIZE / 2;

    // ── Background ──
    // Rich radial gradient from center highlight to dark edge
    const bgGrad = ctx.createRadialGradient(cx, cy * 0.8, 20, cx, cy, SIZE * 0.55);
    bgGrad.addColorStop(0, lightenColor(theme.gradient[1], 0.18));
    bgGrad.addColorStop(0.4, theme.gradient[0]);
    bgGrad.addColorStop(0.75, theme.faceColor);
    bgGrad.addColorStop(1, darkenColor(theme.faceColor, 0.4));
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // ── Subtle texture overlay (noise-like) ──
    ctx.globalAlpha = 0.04;
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * SIZE;
      const y = Math.random() * SIZE;
      const r = Math.random() * 3 + 1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── Specular highlight (top-left gloss) ──
    const specGrad = ctx.createRadialGradient(cx * 0.6, cy * 0.4, 10, cx * 0.6, cy * 0.4, SIZE * 0.45);
    specGrad.addColorStop(0, 'rgba(255,255,255,0.22)');
    specGrad.addColorStop(0.5, 'rgba(255,255,255,0.06)');
    specGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = specGrad;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // ── Edge border ──
    const borderPad = 18;
    ctx.strokeStyle = theme.borderColor;
    ctx.lineWidth = 14;
    ctx.globalAlpha = 0.85;
    ctx.strokeRect(borderPad, borderPad, SIZE - borderPad * 2, SIZE - borderPad * 2);
    ctx.globalAlpha = 1;

    // Inner thin border
    ctx.strokeStyle = theme.numberColor + '55';
    ctx.lineWidth = 3;
    ctx.strokeRect(borderPad + 10, borderPad + 10, SIZE - (borderPad + 10) * 2, SIZE - (borderPad + 10) * 2);

    // ── Corner decorations (small dots) ──
    const dotPositions = [[50, 50], [SIZE - 50, 50], [50, SIZE - 50], [SIZE - 50, SIZE - 50]];
    ctx.fillStyle = theme.borderColor;
    ctx.globalAlpha = 0.5;
    dotPositions.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // ── Die type label (small, top center) ──
    ctx.font = `bold 44px "Arial Narrow", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = theme.numberColor + '88';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(dieType.toUpperCase(), cx, 38);
    ctx.shadowBlur = 0;

    // ── Main number ──
    const labelStr = String(label);
    const len = labelStr.length;
    const fontSize = len >= 3 ? 160 : len === 2 ? 210 : 260;

    // Number position — center, slightly above middle
    const numY = cy + 18;

    if (isD4Bottom) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI);
      ctx.translate(-cx, -cy);
    }

    // Drop shadow for depth
    ctx.font = `900 ${fontSize}px "Georgia", "Times New Roman", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = darkenColor(theme.numberColor, 0.3);
    ctx.fillText(labelStr, cx, numY);

    // Main number fill — gradient
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    const numGrad = ctx.createLinearGradient(cx - 80, numY - fontSize / 2, cx + 80, numY + fontSize / 2);
    numGrad.addColorStop(0, '#ffffff');
    numGrad.addColorStop(0.3, theme.numberColor);
    numGrad.addColorStop(0.7, lightenColor(theme.numberColor, 0.1));
    numGrad.addColorStop(1, darkenColor(theme.numberColor, 0.2));
    ctx.fillStyle = numGrad;
    ctx.fillText(labelStr, cx, numY);

    // Subtle inner glow on number
    ctx.shadowColor = theme.glowColor;
    ctx.shadowBlur = 18;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(labelStr, cx, numY);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Underline for 6 and 9 (D&D convention)
    if (label === 6 || label === 9 || label === '6' || label === '9') {
      const underlineY = numY + fontSize * 0.42;
      ctx.strokeStyle = theme.numberColor;
      ctx.lineWidth = 6;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx - 40, underlineY);
      ctx.lineTo(cx + 40, underlineY);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (isD4Bottom) ctx.restore();

    // ── Result highlight ring (when this is the rolled result) ──
    if (isResult) {
      const ringGrad = ctx.createRadialGradient(cx, cy, SIZE * 0.3, cx, cy, SIZE * 0.52);
      ringGrad.addColorStop(0, 'rgba(255,255,255,0)');
      ringGrad.addColorStop(0.8, 'rgba(255,255,255,0)');
      ringGrad.addColorStop(0.9, theme.glowColor + 'cc');
      ringGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = ringGrad;
      ctx.fillRect(0, 0, SIZE, SIZE);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  };

  // Color helpers
  const lightenColor = (hex, amount) => {
    try {
      const num = parseInt(hex.replace('#', ''), 16);
      const r = Math.min(255, (num >> 16) + Math.round(255 * amount));
      const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount));
      const b = Math.min(255, (num & 0xff) + Math.round(255 * amount));
      return `rgb(${r},${g},${b})`;
    } catch (e) { return hex; }
  };

  const darkenColor = (hex, amount) => {
    try {
      const num = parseInt(hex.replace('#', ''), 16);
      const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
      const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * amount));
      const b = Math.max(0, (num & 0xff) - Math.round(255 * amount));
      return `rgb(${r},${g},${b})`;
    } catch (e) { return hex; }
  };

  // ── Per-die face material builders ───────────────────────────────────────

  /**
   * D4 — 4 triangular faces, numbered 1-4
   * Real d4: each face shows 3 numbers at the base edges (one per vertex)
   * We simplify: each face shows its number prominently
   */
  const buildD4Materials = (theme, result) => {
    const mats = [];
    for (let i = 1; i <= 4; i++) {
      const isResult = (result !== null && i === result);
      const tex = makeFaceTex(i, theme, 'd4', isResult);
      mats.push(new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.18,
        metalness: 0.45,
      }));
    }
    return mats;
  };

  /**
   * D6 — 6 square faces, numbered 1-6
   * Three.js BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z → 1,6,2,5,3,4
   */
  const buildD6Materials = (theme, result) => {
    const faceNums = [1, 6, 2, 5, 3, 4]; // opposite faces sum to 7
    return faceNums.map(n => {
      const isResult = (result !== null && n === result);
      const tex = makeFaceTex(n, theme, 'd6', isResult);
      return new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.15,
        metalness: 0.4,
      });
    });
  };

  /**
   * D8 — 8 triangular faces, numbered 1-8
   */
  const buildD8Materials = (theme, result) => {
    const mats = [];
    for (let i = 1; i <= 8; i++) {
      const isResult = (result !== null && i === result);
      const tex = makeFaceTex(i, theme, 'd8', isResult);
      mats.push(new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.18,
        metalness: 0.42,
      }));
    }
    return mats;
  };

  /**
   * D10 — 10 kite faces, numbered 1-10 (or 0-9)
   * Our custom geometry has 10 faces × 2 triangles = 20 triangles
   * We assign one material per pair of triangles
   */
  const buildD10Materials = (theme, result) => {
    const mats = [];
    for (let i = 0; i < 10; i++) {
      const faceNum = i + 1; // 1-10
      const isResult = (result !== null && faceNum === result);
      const tex = makeFaceTex(faceNum, theme, 'd10', isResult);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.2,
        metalness: 0.38,
      });
      // Each face = 2 triangles, so push twice
      mats.push(mat, mat);
    }
    return mats;
  };

  /**
   * D12 — 12 pentagonal faces, numbered 1-12
   */
  const buildD12Materials = (theme, result) => {
    const mats = [];
    for (let i = 1; i <= 12; i++) {
      const isResult = (result !== null && i === result);
      const tex = makeFaceTex(i, theme, 'd12', isResult);
      mats.push(new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.16,
        metalness: 0.44,
      }));
    }
    return mats;
  };

  /**
   * D20 — 20 triangular faces, numbered 1-20
   */
  const buildD20Materials = (theme, result) => {
    const mats = [];
    for (let i = 1; i <= 20; i++) {
      const isResult = (result !== null && i === result);
      const tex = makeFaceTex(i, theme, 'd20', isResult);
      mats.push(new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.14,
        metalness: 0.48,
      }));
    }
    return mats;
  };

  /**
   * D100 — same shape as d10 but labeled 00, 10, 20 ... 90
   */
  const buildD100Materials = (theme, result) => {
    const mats = [];
    const labels = ['00', '10', '20', '30', '40', '50', '60', '70', '80', '90'];
    for (let i = 0; i < 10; i++) {
      // result for d100 comes in as e.g. 50, so match label
      const labelStr = labels[i];
      const labelNum = i === 0 ? 100 : i * 10; // 00 = 100
      const isResult = (result !== null && (result === labelNum || (result === 100 && i === 0)));
      const tex = makeFaceTex(labelStr, theme, 'd%', isResult);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.2,
        metalness: 0.38,
      });
      mats.push(mat, mat);
    }
    return mats;
  };

  // ── Convert flat-shaded geometry to per-face materials ────────────────────

  /**
   * For polyhedra with triangular faces (d4, d8, d20), we need to assign
   * one material per face. Three.js polyhedra have face indices we can use.
   */
  const assignPerFaceMaterials = (geometry, materials) => {
    const faceCount = geometry.index
      ? geometry.index.count / 3
      : geometry.attributes.position.count / 3;

    const groups = geometry.groups;
    if (groups && groups.length > 0) {
      // Already has groups — update material indices
      return materials;
    }

    // Add groups: one per triangle face
    geometry.clearGroups();
    const totalTris = geometry.index
      ? geometry.index.count / 3
      : geometry.attributes.position.count / 3;

    for (let i = 0; i < totalTris; i++) {
      const matIdx = Math.min(i, materials.length - 1);
      geometry.addGroup(i * 3, 3, matIdx);
    }
    return materials;
  };

  // ── Dice Creation ─────────────────────────────────────────────────────────

  const createDie = (dieConfig, theme) => {
    const { dieType, result } = dieConfig;
    const diceInfo = DiceData.getDiceById(dieType);

    const builder = geometryBuilders[dieType] || geometryBuilders.d6;
    const geometry = builder();

    let materials;
    switch (dieType) {
      case 'd4':  materials = buildD4Materials(theme, result);   break;
      case 'd6':  materials = buildD6Materials(theme, result);   break;
      case 'd8':  materials = buildD8Materials(theme, result);   break;
      case 'd10': materials = buildD10Materials(theme, result);  break;
      case 'd12': materials = buildD12Materials(theme, result);  break;
      case 'd20': materials = buildD20Materials(theme, result);  break;
      case 'd100':materials = buildD100Materials(theme, result); break;
      default:    materials = buildD6Materials(theme, result);
    }

    // Assign per-face groups
    assignPerFaceMaterials(geometry, materials);

    const die = new THREE.Mesh(geometry, materials);
    die.castShadow = true;
    die.receiveShadow = true;

    // Add a subtle wireframe overlay for edge definition
    const edgeGeo = new THREE.EdgesGeometry(geometry, 15); // 15° threshold
    const edgeMat = new THREE.LineBasicMaterial({
      color: theme.borderColor,
      transparent: true,
      opacity: 0.35,
      linewidth: 1
    });
    const edges = new THREE.LineSegments(edgeGeo, edgeMat);
    die.add(edges);

    die.userData = {
      dieType,
      result,
      isRolling: false,
      velocity: new THREE.Vector3(),
      angularVelocity: new THREE.Vector3(),
      settled: false,
      settleTime: 0
    };

    return die;
  };

  // ── Positioning ───────────────────────────────────────────────────────────

  const positionDice = (diceArray) => {
    const count = diceArray.length;
    if (count === 0) return;

    const isMobile = container && container.clientWidth < 768;

    let spacing, rowSpacing, cols;
    if (count === 1) {
      spacing = 0; rowSpacing = 0; cols = 1;
    } else if (count <= 3) {
      spacing = isMobile ? 3.8 : 5.0;
      rowSpacing = isMobile ? 4.2 : 5.4;
      cols = count;
    } else if (count <= 6) {
      spacing = isMobile ? 3.4 : 4.4;
      rowSpacing = isMobile ? 4.0 : 5.0;
      cols = 3;
    } else if (count <= 9) {
      spacing = isMobile ? 3.0 : 3.8;
      rowSpacing = isMobile ? 3.6 : 4.4;
      cols = isMobile ? 3 : 4;
    } else {
      spacing = isMobile ? 2.6 : 3.4;
      rowSpacing = isMobile ? 3.2 : 4.0;
      cols = isMobile ? 4 : 5;
    }

    const rows = Math.ceil(count / cols);
    diceArray.forEach((die, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const rowCount = (row === rows - 1) ? count - row * cols : cols;
      const rowStartX = -(rowCount - 1) * spacing / 2;
      die.position.set(
        rowStartX + col * spacing,
        0,
        (row - (rows - 1) / 2) * rowSpacing
      );
    });
  };

  // ── Scene Management ──────────────────────────────────────────────────────

  const clearDice = () => {
    diceObjects.forEach(die => {
      scene.remove(die);
      die.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
          } else {
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
          }
        }
      });
    });
    diceObjects = [];
  };

  const addDice = (configs, theme) => {
    clearDice();
    currentTheme = theme;

    configs.forEach(config => {
      const die = createDie(config, theme);
      diceObjects.push(die);
      scene.add(die);
    });

    positionDice(diceObjects);
  };

  const updateTheme = (theme) => {
    currentTheme = theme;
    if (diceObjects.length > 0) {
      const configs = diceObjects.map(d => ({
        dieType: d.userData.dieType,
        result: d.userData.result
      }));
      addDice(configs, theme);
    }
  };

  // ── Rolling Animation ─────────────────────────────────────────────────────

  const startRoll = () => {
    diceObjects.forEach((die, idx) => {
      die.userData.isRolling = true;
      die.userData.settled = false;
      die.userData.settleTime = 0;

      // Stagger launch slightly so dice don't all move identically
      const stagger = idx * 0.03;
      die.userData.velocity.set(
        (Math.random() - 0.5) * 0.06,
        0.50 + Math.random() * 0.28 + stagger,
        (Math.random() - 0.5) * 0.06
      );
      die.userData.angularVelocity.set(
        (Math.random() - 0.5) * 0.55,
        (Math.random() - 0.5) * 0.55,
        (Math.random() - 0.5) * 0.55
      );
    });
  };

  const updatePhysics = () => {
    const gravity = -0.024;
    const damping = 0.965;
    const angularDamping = 0.92;
    const groundY = -2.8;
    const restitution = 0.42;

    diceObjects.forEach(die => {
      if (!die.userData.isRolling) return;

      die.userData.velocity.y += gravity;
      die.position.add(die.userData.velocity);

      die.rotation.x += die.userData.angularVelocity.x;
      die.rotation.y += die.userData.angularVelocity.y;
      die.rotation.z += die.userData.angularVelocity.z;

      const halfSize = 1.4;
      if (die.position.y < groundY + halfSize) {
        die.position.y = groundY + halfSize;
        die.userData.velocity.y *= -restitution;
        die.userData.velocity.multiplyScalar(damping);
        die.userData.angularVelocity.multiplyScalar(angularDamping);

        if (
          Math.abs(die.userData.velocity.y) < 0.007 &&
          die.userData.angularVelocity.length() < 0.035
        ) {
          die.userData.isRolling = false;
          die.userData.velocity.set(0, 0, 0);
          die.userData.angularVelocity.set(0, 0, 0);
          die.userData.settled = true;
        }
      }

      die.userData.angularVelocity.multiplyScalar(0.994);
    });
  };

  const isRollingComplete = () => diceObjects.every(d => !d.userData.isRolling);

  const rollDice = () => {
    return new Promise(resolve => {
      startRoll();
      const check = setInterval(() => {
        if (isRollingComplete()) {
          clearInterval(check);
          resolve();
        }
      }, 80);
      setTimeout(() => { clearInterval(check); resolve(); }, 7000);
    });
  };

  // ── Animation Loop ────────────────────────────────────────────────────────

  const animate = () => {
    if (!isInitialized) return;
    animationFrameId = requestAnimationFrame(animate);

    // Gentle idle rotation — slow and smooth
    diceObjects.forEach((die, idx) => {
      if (!die.userData.isRolling && die.userData.settled) {
        die.rotation.y += 0.004;
        // Slight tilt oscillation for visual interest
        die.rotation.x = Math.sin(Date.now() * 0.0008 + idx * 1.2) * 0.08;
      }
    });

    updatePhysics();
    renderer.render(scene, camera);
  };

  const handleResize = () => {
    if (!isInitialized || !container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    if (diceObjects.length > 0) positionDice(diceObjects);
  };

  const start = () => {
    if (animationFrameId === null) animate();
  };

  const stop = () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  const getIsInitialized = () => isInitialized;

  const dispose = () => {
    stop();
    clearDice();
    if (renderer) {
      renderer.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    }
    window.removeEventListener('resize', handleResize);
    isInitialized = false;
    scene = null; camera = null; renderer = null; container = null;
  };

  return {
    initScene, addDice, updateTheme,
    rollDice, stop, dispose,
    isInitialized: getIsInitialized
  };
})();
