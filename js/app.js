// Fixed SNN Visualizer with a stable orbit camera system

class SNNVisualizer {
  constructor() {
    this.state = {
      isRunning: true,
      showWeights: false,
      speed: 1,
      firingRate: 0.75,
      pulseDecay: 0.95,
      threshold: 1.0,
      pauseSpikes: false,
      selectedNeuron: null,
    };

    this.config = {
      networkSize: 120,
      connectionProb: 0.3,
      neuronSize: 1.0,
      pulseIntensity: 1.5,
      cameraMoveSpeed: 0.3,
      leak: 0.985, // membrane leak per step
      refractoryMs: 80, // short refractory period after spike
      backgroundImpulse: 0.08, // base random input magnitude when background fires
      excRatio: 0.8, // fraction of excitatory neurons
      interProbScale: 0.2, // 0..1: cross-cluster probability scale
      interWeightScale: 0.3, // 0..1: cross-cluster weight scale
      clusterCount: 4,
      clusterSize: 30,
      fogStrength: 0.3,
    };

    this._bannerTimer = null;

    this.CLUSTER_COLORS = [
      {
        primary: { r: 0.800, g: 0.467, b: 0.133 }, // Ochre blaze (#CC7722)
        glow: { r: 0.965, g: 0.804, b: 0.522 }, // sunlit ochre
        name: "Ochre Blaze",
      },
      {
        primary: { r: 0.757, g: 0.604, b: 0.420 }, // Camel dune (#C19A6B)
        glow: { r: 0.910, g: 0.796, b: 0.620 }, // lifted camel
        name: "Camel Dune",
      },
      {
        primary: { r: 0.651, g: 0.482, b: 0.357 }, // Tan mesa (#A67B5B)
        glow: { r: 0.839, g: 0.667, b: 0.494 }, // warm mesa
        name: "Mesa Ember",
      },
      {
        primary: { r: 0.902, g: 0.843, b: 0.725 }, // Desert veil (#E6D7B9)
        glow: { r: 0.992, g: 0.929, b: 0.812 }, // pale highlight
        name: "Desert Veil",
      },
    ];

    this.neurons = [];
    this.connections = [];
    this.voltageHistory = [];
    this._simAccumulator = 0; // supports fractional speeds

    this.lessonConfig = this.createLessonConfig();
    this.lessonCache = new Map();
    this.activeTemplate = null;

    // Make this instance globally accessible for lesson buttons
    window.snnVisualizer = this;

    this.init();
  }

  init() {
    this.theme = this.readThemeVariables();
    this.initDOM();
    this.initCanvas();
    this.createNetwork();
    this.bindUI();
    this.initLessons();
    this.initTooltips();
    this.fixUIStyles(); // Add this line to fix the UI styles

    // Debug: Log network creation
    console.log(`Network initialized with ${this.neurons.length} neurons`);

    // Start animation immediately
    this.animate();
  }

  // Initialize parameter/tool tooltips. This used to be referenced
  // but was missing, causing initialization to crash. We implement
  // a lightweight, dependency-free tooltip system that positions
  // the tooltip near the cursor and keeps it within the viewport.
  initTooltips() {
    try {
      const infos = document.querySelectorAll('.param-info');
      if (!infos || infos.length === 0) return; // No-op if not present

      infos.forEach((infoEl) => {
        let tip = infoEl.querySelector('.tooltip');
        if (!tip) {
          // Create a minimal fallback tooltip if missing
          tip = document.createElement('div');
          tip.className = 'tooltip';
          tip.textContent = 'No additional info available.';
          infoEl.appendChild(tip);
        }

        // Ensure base styles for JS‑controlled positioning/visibility
        tip.style.position = 'fixed';
        tip.style.visibility = 'hidden';
        tip.style.opacity = '0';
        tip.style.pointerEvents = 'none';

        // Move tooltip to body so it's never clipped by panel stacking/overflow
        if (tip.parentElement !== document.body) {
          // Keep content but detach from panel
          const bodyTip = tip.cloneNode(true);
          document.body.appendChild(bodyTip);
          tip.remove();
          tip = bodyTip;
        }

        const placeNearIcon = () => {
          const padding = 12;
          const rect = infoEl.getBoundingClientRect();
          const tipRect = tip.getBoundingClientRect();
          // Prefer right of icon; if not enough space, place to left
          const preferRightX = rect.right + 10;
          const preferLeftX = rect.left - tipRect.width - 10;
          let x = preferRightX <= window.innerWidth - padding ? preferRightX : Math.max(padding, preferLeftX);
          // Align vertically with icon; clamp to viewport
          let y = rect.top - 4;
          const maxX = window.innerWidth - tipRect.width - padding;
          const maxY = window.innerHeight - tipRect.height - padding;
          x = Math.max(padding, Math.min(x, maxX));
          y = Math.max(padding, Math.min(y, maxY));
          tip.style.left = `${x}px`;
          tip.style.top = `${y}px`;
          tip.style.zIndex = "10000";
          // Ensure appearance when detached from panel CSS
          tip.style.background = tip.style.background || this.theme.surface3;
          tip.style.color = tip.style.color || this.theme.text;
          tip.style.padding = tip.style.padding || '12px';
          tip.style.borderRadius = tip.style.borderRadius || '8px';
          tip.style.border =
            tip.style.border || `1px solid ${this.theme.accentSubtle}`;
          tip.style.boxShadow = tip.style.boxShadow || '0 4px 20px rgba(0,0,0,0.3)';
          tip.style.maxWidth = tip.style.maxWidth || '320px';
        };

        const show = () => {
          placeNearIcon();
          tip.style.visibility = 'visible';
          tip.style.opacity = '1';
        };
        const hide = () => {
          tip.style.visibility = 'hidden';
          tip.style.opacity = '0';
        };

        infoEl.addEventListener('mouseenter', show);
        infoEl.addEventListener('mouseleave', hide);
        window.addEventListener('resize', () => {
          if (tip.style.visibility === 'visible') placeNearIcon();
        });
        // Also keep accessible on focus/blur for keyboard users
        infoEl.setAttribute('tabindex', '0');
        infoEl.addEventListener('focus', show);
        infoEl.addEventListener('blur', hide);
      });
    } catch (e) {
      console.warn('Tooltip initialization failed:', e);
      // Do not block visualization if tooltips fail
    }
  }

  readThemeVariables() {
    const styles = getComputedStyle(document.documentElement);
    const read = (name, fallback) => {
      const value = styles.getPropertyValue(name);
      return value ? value.trim() : fallback;
    };

    return {
      bg: read("--bg", "#020201"),
      surface1: read("--surface-1", "#1c130b"),
      surface2: read("--surface-2", "#271b10"),
      surface3: read("--surface-3", "#342416"),
      border: read("--border", "#4b311d"),
      text: read("--text", "#f4eadc"),
      text2: read("--text-2", "#e0c4a3"),
      textMuted: read("--text-muted", "#b8926a"),
      textAccent: read("--text-accent", "#f6c274"),
      accentPrimary: read("--accent-primary", "#d89b5a"),
      accentSubtle: read("--accent-subtle", "#8f6339"),
      accentGlow: read("--accent-glow", "#ffcf80"),
      accentDanger: read("--accent-danger", "#d5744a"),
    };
  }

  hexWithAlpha(hex, alpha) {
    const sanitized = hex.replace("#", "").trim();
    if (sanitized.length !== 6) {
      return hex;
    }
    const r = parseInt(sanitized.slice(0, 2), 16);
    const g = parseInt(sanitized.slice(2, 4), 16);
    const b = parseInt(sanitized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  hexToRgb(hex) {
    const sanitized = hex.replace("#", "").trim();
    if (sanitized.length !== 6) {
      return { r: 255, g: 255, b: 255 };
    }
    return {
      r: parseInt(sanitized.slice(0, 2), 16),
      g: parseInt(sanitized.slice(2, 4), 16),
      b: parseInt(sanitized.slice(4, 6), 16),
    };
  }

  applyThemeColorsToMarkup(html) {
    if (!html || typeof html !== "string") return html;
    const replacements = [
      { pattern: /#ff9bf0/gi, value: this.theme.textAccent },
      { pattern: /#374e84/gi, value: this.theme.accentPrimary },
      { pattern: /#60a5fa/gi, value: this.theme.accentGlow },
      { pattern: /#94a3b8/gi, value: this.theme.textMuted },
      { pattern: /#9aa5b1/gi, value: this.theme.textMuted },
      { pattern: /#9ca3af/gi, value: this.theme.textMuted },
      { pattern: /#f1f5f9/gi, value: this.theme.text },
      { pattern: /#cbd5f5/gi, value: this.theme.text2 },
      { pattern: /#e2e8f0/gi, value: this.theme.text2 },
      { pattern: /#1e293b/gi, value: this.theme.surface2 },
      { pattern: /#0a0c12/gi, value: this.theme.surface2 },
      { pattern: /#1a1d29/gi, value: this.theme.surface3 },
      { pattern: /#808080/gi, value: this.theme.textMuted },
      { pattern: /#181b22/gi, value: this.theme.surface1 },
    ];

    let themed = html;
    for (const { pattern, value } of replacements) {
      themed = themed.replace(pattern, value);
    }
    return themed;
  }

  fixUIStyles() {
    // Fix controls panel position
    const controlsElement = document.getElementById("controls");
    if (controlsElement) {
      controlsElement.style.position = "fixed";
      controlsElement.style.left = "16px";
      controlsElement.style.top = "180px"; // Lower position to prevent overlap
      controlsElement.style.zIndex = "5";
      controlsElement.style.width = "320px";
      controlsElement.style.maxHeight = "calc(100vh - 220px)";
    }

    // Fix sliders
    const styleElement = document.createElement("style");
    styleElement.textContent = `
      input[type="range"] {
        -webkit-appearance: none;
        height: 6px;
        background: var(--surface-2);
        border-radius: 3px;
        width: 100%;
      }

      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        height: 16px;
        width: 16px;
        border-radius: 50%;
        background: var(--accent-primary);
        border: 2px solid var(--surface-1);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
        cursor: pointer;
        transition: transform 0.18s ease, box-shadow 0.18s ease;
      }

      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.55);
      }

      input[type="range"]::-moz-range-track {
        height: 6px;
        background: var(--surface-2);
        border-radius: 3px;
      }

      input[type="range"]::-moz-range-thumb {
        height: 16px;
        width: 16px;
        border-radius: 50%;
        background: var(--accent-primary);
        border: 2px solid var(--surface-1);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
        cursor: pointer;
        transition: transform 0.18s ease, box-shadow 0.18s ease;
      }

      input[type="range"]::-moz-range-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.55);
      }

      .lesson-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        backdrop-filter: blur(8px);
      }

      .lesson-modal-content {
        background: var(--surface-1);
        border: 1px solid var(--border);
        padding: 32px;
        max-width: 800px;
        max-height: 85vh;
        overflow-y: auto;
        color: var(--text);
        position: relative;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
      }

      .lesson-modal-content h1,
      .lesson-modal-content h2,
      .lesson-modal-content h3 {
        color: var(--text-accent);
      }

      .lesson-modal-content strong {
        color: var(--accent-primary);
      }
    `;
    document.head.appendChild(styleElement);

    // Fix lesson panel
    const lessonPanel = document.getElementById("lessonPanel");
    if (lessonPanel) {
      lessonPanel.style.zIndex = "10";
    }

    // Fix navigation controls
    const navControls = document.getElementById("navControls");
    if (navControls) {
      navControls.style.zIndex = "10";
      const statusBar = document.getElementById("statusBar");
      if (statusBar && !navControls.dataset.hoverBound) {
        navControls.dataset.hoverBound = "true";
        let hideTimeout = null;
        const showPopover = () => {
          navControls.classList.add("is-visible");
        };
        const clearHide = () => {
          if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
          }
        };
        const scheduleHide = () => {
          clearHide();
          hideTimeout = setTimeout(() => {
            if (!statusBar.matches(":hover") && !navControls.matches(":hover")) {
              navControls.classList.remove("is-visible");
            }
          }, 160);
        };

        const handleEnter = () => {
          clearHide();
          showPopover();
        };

        statusBar.addEventListener("mouseenter", handleEnter);
        statusBar.addEventListener("mouseleave", scheduleHide);
        navControls.addEventListener("mouseenter", handleEnter);
        navControls.addEventListener("mouseleave", scheduleHide);
      }
    }
  }

  initDOM() {
    this.dom = {
      canvas: document.getElementById("three-canvas"),
      playBtn: document.getElementById("play"),
      speedSlider: document.getElementById("speed"),
      presetSelect: document.getElementById("presetSelect"),
      presetSummary: document.getElementById("presetSummary"),
      exportTemplateBtn: document.getElementById("exportTemplate"),
      importTemplateBtn: document.getElementById("importTemplate"),
      importTemplateInput: document.getElementById("templateImport"),
      importHelpBtn: document.getElementById("importHelp"),
      neuronMeta: document.getElementById("neuronMeta"),
      networkSizeSlider: document.getElementById("networkSize"),
      sizeValueLabel: document.getElementById("sizeValue"),
      clusterCountSlider: document.getElementById("clusterCount"),
      clustersValueLabel: document.getElementById("clustersValue"),
      clusterSizeSlider: document.getElementById("clusterSize"),
      clusterSizeValueLabel: document.getElementById("clusterSizeValue"),
      interProbSlider: document.getElementById("interProb"),
      interProbValueLabel: document.getElementById("interProbValue"),
      interWeightSlider: document.getElementById("interWeight"),
      interWeightValueLabel: document.getElementById("interWeightValue"),
      excRatioSlider: document.getElementById("excRatio"),
      excRatioValueLabel: document.getElementById("excValue"),
      fogSlider: document.getElementById("fogStrength"),
      fogValueLabel: document.getElementById("fogValue"),
      connectionProbSlider: document.getElementById("connectionProb"),
      probValueLabel: document.getElementById("probValue"),
      firingRateSlider: document.getElementById("firingRate"),
      firingValueLabel: document.getElementById("firingValue"),
      pulseDecaySlider: document.getElementById("pulseDecay"),
      decayValueLabel: document.getElementById("decayValue"),
      thresholdSlider: document.getElementById("threshold"),
      thresholdValueLabel: document.getElementById("thresholdValue"),
      resetBtn: document.getElementById("resetNetwork"),
      showWeightsBtn: document.getElementById("showWeights"),
      pauseSpikesBtn: document.getElementById("pauseSpikes"),
      injectSpikeBtn: document.getElementById("injectSpike"),
      lessonSelect: document.getElementById("lessonSelect"),
      lessonContent: document.getElementById("lessonContent"),
      voltageValue: document.getElementById("voltageValue"),
      trace: document.getElementById("trace"),
      errEl: document.getElementById("err"),
    };

    // Initialize trace canvas
    if (this.dom.trace) {
      this.traceCtx = this.dom.trace.getContext("2d");
      this.clearTrace();
    }
  }

  initCanvas() {
    if (!this.dom.canvas) {
      console.error("Canvas element not found!");
      return;
    }

    this.ctx = this.dom.canvas.getContext("2d");
    this.resizeCanvas();

    // Set up a proper orbit camera system
    this.camera = {
      position: { x: 0, y: 0, z: 0 }, // Calculated from orbit
      target: { x: 0, y: 0, z: 0 },
      rotation: { pitch: 0.2, yaw: -0.5 },
      distance: 1800, // Adjusted for a closer view
      mouse: {
        x: 0,
        y: 0,
        lastX: 0,
        lastY: 0,
        isLeftDown: false,
        isRightDown: false,
        sensitivity: 0.006,
      },
      moveSpeed: 3.0,
      move: { forward: 0, right: 0, up: 0 },
    };

    this.initCameraControls();

    window.addEventListener("resize", () => this.resizeCanvas());
  }

  resizeCanvas() {
    this.dom.canvas.width = window.innerWidth;
    this.dom.canvas.height = window.innerHeight;
    this.dom.canvas.style.width = window.innerWidth + "px";
    this.dom.canvas.style.height = window.innerHeight + "px";
  }

  initCameraControls() {
    this.dom.canvas.addEventListener("mousedown", (e) => this.onMouseDown(e));
    window.addEventListener("mouseup", (e) => this.onMouseUp(e));
    window.addEventListener("mousemove", (e) => this.onMouseMove(e));
    this.dom.canvas.addEventListener("wheel", (e) => this.onWheel(e));
    this.dom.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    this.dom.canvas.addEventListener("click", (e) => this.onCanvasClick(e));
    window.addEventListener("keydown", (e) => this.onKeyDown(e));
    window.addEventListener("keyup", (e) => this.onKeyUp(e));
  }

  onMouseDown(e) {
    if (e.button === 0) this.camera.mouse.isLeftDown = true;
    if (e.button === 2) this.camera.mouse.isRightDown = true;
    this.camera.mouse.lastX = e.clientX;
    this.camera.mouse.lastY = e.clientY;
  }

  onMouseUp(e) {
    if (e.button === 0) this.camera.mouse.isLeftDown = false;
    if (e.button === 2) this.camera.mouse.isRightDown = false;
  }

  onMouseMove(e) {
    const deltaX = e.clientX - this.camera.mouse.lastX;
    const deltaY = e.clientY - this.camera.mouse.lastY;
    this.camera.mouse.lastX = e.clientX;
    this.camera.mouse.lastY = e.clientY;

    if (this.camera.mouse.isLeftDown) {
      // Orbit mode
      this.camera.rotation.yaw -= deltaX * this.camera.mouse.sensitivity;
      this.camera.rotation.pitch -= deltaY * this.camera.mouse.sensitivity;
      this.camera.rotation.pitch = Math.max(
        -Math.PI / 2.1,
        Math.min(Math.PI / 2.1, this.camera.rotation.pitch)
      );
    } else if (this.camera.mouse.isRightDown) {
      // Pan mode
      const right = this.getCameraRight();
      const up = this.getCameraUp();
      const panSpeed = 0.9;

      // Pan the target
      this.camera.target.x -= (right.x * deltaX - up.x * deltaY) * panSpeed;
      this.camera.target.y -= (right.y * deltaX - up.y * deltaY) * panSpeed;
      this.camera.target.z -= (right.z * deltaX - up.z * deltaY) * panSpeed;
    }
  }

  onWheel(e) {
    e.preventDefault();
    const zoomSpeed = 40;
    this.camera.distance += (e.deltaY > 0 ? 1 : -1) * zoomSpeed;
    this.camera.distance = Math.max(200, Math.min(5000, this.camera.distance));
  }

  onCanvasClick(e) {
    // Detect neuron clicks for selection
    const rect = this.dom.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let closestNeuron = null;
    let closestDistance = Infinity;

    this.neurons.forEach((neuron) => {
      const projected = this.project3D(neuron.position);
      const distance = Math.sqrt(
        (mouseX - projected.x) ** 2 + (mouseY - projected.y) ** 2
      );

      if (distance < 30 && distance < closestDistance) {
        closestDistance = distance;
        closestNeuron = neuron;
      }
    });

    if (closestNeuron) {
      this.state.selectedNeuron = closestNeuron;
      this.voltageHistory = [];
      this.clearTrace(); // Clear trace when selecting a new neuron

      if (this.dom.voltageValue) {
        const v = this.state.selectedNeuron.voltage;
        const last = this.state.selectedNeuron.lastFire || 0;
        const ago = last ? `${((Date.now() - last) / 1000).toFixed(1)}s ago` : "no spike yet";
        this.dom.voltageValue.textContent = `${v.toFixed(3)} (${ago})`;
      }

      this.renderNeuronDetails(this.state.selectedNeuron);
    }
  }

  onKeyDown(e) {
    if (e.code === "KeyW") this.camera.move.forward = 1;
    if (e.code === "KeyS") this.camera.move.forward = -1;
    if (e.code === "KeyD") this.camera.move.right = 1;
    if (e.code === "KeyA") this.camera.move.right = -1;
    if (e.code === "KeyE") this.camera.move.up = 1;
    if (e.code === "KeyQ") this.camera.move.up = -1;
    if (e.code === "Space") {
      e.preventDefault();
      this.resetCamera();
    }
  }

  onKeyUp(e) {
    if (e.code === "KeyW" || e.code === "KeyS") this.camera.move.forward = 0;
    if (e.code === "KeyA" || e.code === "KeyD") this.camera.move.right = 0;
    if (e.code === "KeyQ" || e.code === "KeyE") this.camera.move.up = 0;
  }

  getCameraForward() {
    return this.normalize({
      x: this.camera.target.x - this.camera.position.x,
      y: this.camera.target.y - this.camera.position.y,
      z: this.camera.target.z - this.camera.position.z,
    });
  }

  getCameraRight() {
    return this.normalize(
      this.cross({ x: 0, y: 1, z: 0 }, this.getCameraForward())
    );
  }

  getCameraUp() {
    return this.cross(this.getCameraForward(), this.getCameraRight());
  }

  normalize(v) {
    const l = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (l === 0) return { x: 0, y: 1, z: 0 };
    return { x: v.x / l, y: v.y / l, z: v.z / l };
  }

  cross(a, b) {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    };
  }

  formatLabel(value) {
    if (value === undefined || value === null) return "";
    return value
      .toString()
      .replace(/[_\-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }

  buildMetaGrid(rows) {
    if (!rows || !rows.length) return "";
    const cells = rows
      .filter((row) => row && row.label)
      .map((row) => {
        let value = row.value;
        if (value === undefined || value === null || value === "—") {
          value = "—";
        } else if (typeof value === "number") {
          value = value.toString();
        }
        return `<span class="meta-label">${row.label}</span><span class="meta-value">${value}</span>`;
      })
      .join("");
    if (!cells) return "";
    return `<div class="meta-grid">${cells}</div>`;
  }

  resolveMetadataNote(metadata) {
    if (!metadata) return null;
    const candidates = [
      ...(Array.isArray(metadata.anatomicalNotes) ? metadata.anatomicalNotes : []),
      ...(Array.isArray(metadata.notes) ? metadata.notes : []),
      ...(Array.isArray(metadata.references) ? metadata.references : []),
      ...(Array.isArray(metadata.neuromodulators) ? metadata.neuromodulators : []),
      typeof metadata.description === "string" ? metadata.description : null,
    ];
    return (
      candidates.find((entry) => typeof entry === "string" && entry.trim().length) || null
    );
  }

  getClusterMetaForNeuron(neuron) {
    if (!neuron || !this.clusterMetadata) return null;
    return (
      this.clusterMetadata.find(
        (meta) => meta && (meta.id === neuron.clusterId || meta.index === neuron.clusterIndex)
      ) || null
    );
  }

  renderNeuronDetails(neuron) {
    if (!this.dom.neuronMeta) return;
    if (!neuron) {
      this.dom.neuronMeta.innerHTML =
        '<div class="meta-placeholder">Select a neuron to inspect its properties.</div>';
      return;
    }

    const region = this.regionInfo || {};
    const cluster = this.getClusterMetaForNeuron(neuron) || {};
    const regionNote = this.resolveMetadataNote(region.metadata);
    const clusterNote = this.resolveMetadataNote(cluster.metadata);
    const outgoing = Array.isArray(neuron.connections) ? neuron.connections.length : 0;
    const incoming = this.connections.reduce(
      (sum, conn) => (conn.to === neuron ? sum + 1 : sum),
      0
    );
    const groupSummary = (cluster.groupSummary || []).map(
      (entry) => `${entry.label}: ${entry.count}`
    );
    const bio = neuron.bio || {};
    const regionLabel =
      region.name || region.presetLabel || this.formatLabel(this.config.presetId);
    const groupLabel = neuron.groupLabel || this.formatLabel(neuron.groupPreset);
    const excitStr = neuron.type === "I" ? "Inhibitory" : "Excitatory";
    const synapseType = bio.synapseType ? ` &bull; Synapse: ${bio.synapseType}` : "";
    const peerGroup =
      cluster.groups && neuron.groupPreset ? cluster.groups[neuron.groupPreset] : null;

    const intrinsicRows = [
      {
        label: "Threshold",
        value:
          neuron.threshold !== undefined ? Number(neuron.threshold).toFixed(2) : "—",
      },
      {
        label: "Leak",
        value: neuron.leak !== undefined ? Number(neuron.leak).toFixed(3) : "—",
      },
      {
        label: "Background",
        value:
          neuron.bgImpulse !== undefined ? Number(neuron.bgImpulse).toFixed(3) : "—",
      },
      {
        label: "Spike Gain",
        value: neuron.spikeGain !== undefined ? Number(neuron.spikeGain).toFixed(2) : "—",
      },
      {
        label: "Refractory",
        value:
          neuron.refractoryMs !== undefined
            ? `${Number(neuron.refractoryMs).toFixed(0)} ms`
            : "—",
      },
    ].filter((row) => row.value !== "—");

    const bioRowsRaw = [
      { label: "Resting Vm", value: bio.restingPotential },
      { label: "Spike Threshold", value: bio.spikeThreshold },
      { label: "Reset Vm", value: bio.resetPotential },
      { label: "Tau m", value: bio.membraneTimeConstant },
      { label: "EPSP Rise", value: bio.EPSP_rise },
      { label: "EPSP Decay", value: bio.EPSP_decay },
      { label: "IPSP Rise", value: bio.IPSP_rise },
      { label: "IPSP Decay", value: bio.IPSP_decay },
      { label: "Synaptic Delay", value: bio.synapticDelay },
      { label: "Weight", value: bio.weight },
    ];

    const bioRows = bioRowsRaw
      .map((row) => {
        if (row.value === undefined || row.value === null) return null;
        const numeric = Number(row.value);
        if (!Number.isFinite(numeric)) {
          return { label: row.label, value: row.value };
        }
        const suffix =
          row.label.includes("Vm")
            ? " mV"
            : row.label === "Weight"
            ? ""
            : " ms";
        const digits = row.label === "Weight" ? 2 : 1;
        return {
          label: row.label,
          value: `${numeric.toFixed(digits)}${suffix}`,
        };
      })
      .filter(Boolean);

    const connectionsGrid = this.buildMetaGrid([
      { label: "Outgoing", value: outgoing },
      { label: "Incoming", value: incoming },
      { label: "Cluster Size", value: cluster.totalNeurons ?? "—" },
      { label: "Peers", value: peerGroup ? peerGroup.length : "—" },
    ]);

    const intrinsicGrid = this.buildMetaGrid([...intrinsicRows, ...bioRows]);
    const groupLine = groupSummary.length
      ? `<div class="meta-note">${groupSummary.join(" • ")}</div>`
      : "";

    this.dom.neuronMeta.innerHTML = `
      <div class="meta-section">
        <div class="meta-heading">Region</div>
        <div class="meta-value">${regionLabel || "Procedural Network"}</div>
        ${
          region.presetLabel && region.presetLabel !== regionLabel
            ? `<div class="meta-note">Preset: ${region.presetLabel}</div>`
            : ""
        }
        ${regionNote ? `<div class="meta-note">${regionNote}</div>` : ""}
      </div>
      <div class="meta-section">
        <div class="meta-heading">Cluster</div>
        <div class="meta-value">${cluster.label || `Cluster ${((cluster.index ?? 0) + 1)}`}</div>
        ${clusterNote ? `<div class="meta-note">${clusterNote}</div>` : ""}
        ${groupLine}
      </div>
      <div class="meta-section">
        <div class="meta-heading">Neuron</div>
        <div class="meta-value">${groupLabel || excitStr}</div>
        <div class="meta-note">Type: ${excitStr}${synapseType}</div>
        ${
          connectionsGrid
            ? `<div class="meta-subheading">Connectivity</div>${connectionsGrid}`
            : ""
        }
      </div>
      ${
        intrinsicGrid
          ? `<div class="meta-section">
              <div class="meta-heading">Biophysics</div>
              ${intrinsicGrid}
            </div>`
          : ""
      }
    `;
  }

  updateCameraPosition() {
    const cam = this.camera;

    // Handle WASD panning (moves the target)
    const speed = cam.moveSpeed;
    const lookDir = this.getCameraForward();
    const forward = this.normalize({ x: lookDir.x, y: 0, z: lookDir.z });
    const right = this.getCameraRight();

    cam.target.x +=
      (forward.x * cam.move.forward + right.x * cam.move.right) * speed;
    cam.target.z +=
      (forward.z * cam.move.forward + right.z * cam.move.right) * speed;
    cam.target.y += cam.move.up * speed;

    // Calculate camera position based on orbit (distance, rotation, target)
    const hDist = cam.distance * Math.cos(cam.rotation.pitch);
    const vDist = cam.distance * Math.sin(cam.rotation.pitch);

    cam.position.x = cam.target.x - hDist * Math.sin(cam.rotation.yaw);
    cam.position.y = cam.target.y + vDist;
    cam.position.z = cam.target.z - hDist * Math.cos(cam.rotation.yaw);
  }

  resetCamera() {
    this.camera.target = { x: 0, y: 0, z: 0 };
    this.camera.rotation = { pitch: 0.2, yaw: -0.5 };
    this.camera.distance = 1800;
  }

  project3D(pos) {
    const cam = this.camera;
    const fwd = this.getCameraForward();
    const right = this.getCameraRight();
    const up = this.getCameraUp();

    const dx = pos.x - cam.position.x;
    const dy = pos.y - cam.position.y;
    const dz = pos.z - cam.position.z;

    const x2 = dx * right.x + dy * right.y + dz * right.z;
    const y2 = dx * up.x + dy * up.y + dz * up.z;
    const z2 = dx * fwd.x + dy * fwd.y + dz * fwd.z;

    const fov = 1000; // Adjusted field of view factor
    const distance = Math.max(1, z2);
    const scale = fov / distance;

    return {
      x: this.dom.canvas.width / 2 + x2 * scale,
      y: this.dom.canvas.height / 2 - y2 * scale,
      scale: scale,
      depth: z2,
    };
  }

  // Test function to force render visible neurons
  testRender() {
    // Clear canvas
    this.ctx.fillStyle = this.theme.surface2;
    this.ctx.fillRect(0, 0, this.dom.canvas.width, this.dom.canvas.height);

    // Draw test circle to verify canvas works
    this.ctx.fillStyle = this.theme.accentDanger;
    this.ctx.beginPath();
    this.ctx.arc(100, 100, 30, 0, Math.PI * 2);
    this.ctx.fill();

    // Check if neurons exist
    if (!this.neurons || this.neurons.length === 0) {
      this.ctx.fillStyle = this.theme.text;
      this.ctx.font = "24px Arial";
      this.ctx.fillText("No neurons created!", 200, 200);
      return;
    }

    // Draw neurons at fixed positions to test visibility
    this.neurons.forEach((neuron, i) => {
      const x = 200 + (i % 10) * 60;
      const y = 200 + Math.floor(i / 10) * 60;
      const radius = 20;

      // Draw neuron
      const color = neuron.colors.primary;
      this.ctx.fillStyle = `rgb(${Math.floor(color.r * 255)}, ${Math.floor(
        color.g * 255
      )}, ${Math.floor(color.b * 255)})`;
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw neuron ID
      this.ctx.fillStyle = this.theme.text;
      this.ctx.font = "12px Arial";
      this.ctx.fillText(i.toString(), x - 5, y + 3);
    });

    // Draw debug info
    this.ctx.fillStyle = this.theme.text;
    this.ctx.font = "16px Arial";
    this.ctx.fillText(`Neurons: ${this.neurons.length}`, 20, 50);
    this.ctx.fillText(`Connections: ${this.connections.length}`, 20, 70);
  }

  // Simple working 3D projection
  simpleProject3D(pos) {
    const cam = this.camera;

    // Simple distance-based projection
    const dx = pos.x - cam.position.x;
    const dy = pos.y - cam.position.y;
    const dz = pos.z - cam.position.z;

    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const scale = 500 / Math.max(distance, 50);

    const screenX = this.dom.canvas.width / 2 + dx * scale;
    const screenY = this.dom.canvas.height / 2 - dy * scale;

    return {
      x: screenX,
      y: screenY,
      scale: Math.max(0.1, scale / 5),
      depth: distance,
    };
  }

  // Working render function
  workingRender() {
    // Clear canvas
    this.ctx.fillStyle = this.theme.surface2;
    this.ctx.fillRect(0, 0, this.dom.canvas.width, this.dom.canvas.height);

    if (!this.neurons || this.neurons.length === 0) {
      this.ctx.fillStyle = this.theme.accentDanger;
      this.ctx.font = "20px Arial";
      this.ctx.fillText("Network not created!", 100, 100);
      return;
    }

    // Render neurons with simple projection
    this.neurons.forEach((neuron, i) => {
      const projected = this.simpleProject3D(neuron.position);

      if (
        projected.x < -100 ||
        projected.x > this.dom.canvas.width + 100 ||
        projected.y < -100 ||
        projected.y > this.dom.canvas.height + 100
      ) {
        return;
      }

      const radius = Math.max(5, 15 * projected.scale);
      const intensity = neuron.pulse / this.config.pulseIntensity;

      // Draw neuron
      const color =
        intensity > 0.1 ? neuron.colors.glow : neuron.colors.primary;
      const brightness = intensity > 0.1 ? 1.0 : 0.8;
      this.ctx.fillStyle = `rgb(${Math.floor(
        color.r * 255 * brightness
      )}, ${Math.floor(color.g * 255 * brightness)}, ${Math.floor(
        color.b * 255 * brightness
      )})`;

      this.ctx.beginPath();
      this.ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Add rim
      this.ctx.strokeStyle = this.hexWithAlpha(this.theme.text, 0.5);
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    });

    // (removed old canvas debug overlay; bottom status bar shows this info)
    // Step 5 HUD: preset snapshot
    const presetId = this.config.presetId || "None";
    const clusterInfo = `${this.config.clusterCount}x${this.config.clusterSize}`;
    const efrac = (this.config.excRatio ?? 0).toFixed(2);
    const hud2 = `PRESET: ${presetId} | ${clusterInfo} | E frac ${efrac}`;
    this.ctx.fillText(hud2, this.dom.canvas.width / 2, 46);
    this.ctx.textAlign = "left"; // Reset alignment
  }

  render() {
    // First check if neurons exist
    if (!this.neurons || this.neurons.length === 0) {
      console.error("No neurons available for rendering!");
      this.createNetwork();
      return;
    }

    // Clear canvas
    this.ctx.fillStyle = this.theme.bg;
    this.ctx.fillRect(0, 0, this.dom.canvas.width, this.dom.canvas.height);

    const now = Date.now();
    const recentWindow = 180;

    // Precompute projections and recency
    const projById = new Map();
    const projNeurons = [];
    const recentlyFired = new Set();
    for (const n of this.neurons) {
      const p = this.project3D(n.position);
      projById.set(n.id, p);
      projNeurons.push({ n, p });
      if (now - (n.lastFire || 0) < recentWindow) recentlyFired.add(n.id);
    }

    // Sort and render connections back-to-front using average depth
    const clusterSize = Math.max(1, this.config.clusterSize || Math.floor(this.config.networkSize / (this.config.clusterCount || 1)));
    const edges = this.connections
      .map((conn) => {
        const sp = projById.get(conn.from.id);
        const ep = projById.get(conn.to.id);
        return { conn, sp, ep, depth: (sp.depth + ep.depth) / 2 };
      })
      .sort((a, b) => b.depth - a.depth); // far first

    // determine fog scale by depth
    const maxDepth = Math.max(1, ...projNeurons.map((x) => x.p.depth));
    const fogK = Math.min(1, Math.max(0, this.config.fogStrength || 0));
    const fogFactor = (d) => 1 - fogK * (Math.min(1, d / maxDepth));

    for (const e of edges) {
      const bothFired = recentlyFired.has(e.conn.from.id) && recentlyFired.has(e.conn.to.id);
      const sameCluster =
        Math.floor(e.conn.from.id / clusterSize) === Math.floor(e.conn.to.id / clusterSize);

      if (bothFired && sameCluster) {
        const c = e.conn.from.colors.glow;
        const alpha = 0.8 * fogFactor(e.depth);
        this.ctx.strokeStyle = `rgba(${Math.floor(c.r * 255)}, ${Math.floor(c.g * 255)}, ${Math.floor(c.b * 255)}, ${alpha})`;
        this.ctx.lineWidth = 0.6;
      } else {
        const alpha = 0.15 * fogFactor(e.depth);
        this.ctx.strokeStyle = this.hexWithAlpha(this.theme.accentSubtle, alpha);
        this.ctx.lineWidth = 0.2;
      }

      this.ctx.beginPath();
      this.ctx.moveTo(e.sp.x, e.sp.y);
      this.ctx.lineTo(e.ep.x, e.ep.y);
      this.ctx.stroke();
    }

    // Sort and render neurons back-to-front
    projNeurons.sort((a, b) => b.p.depth - a.p.depth);
    for (const item of projNeurons) {
      const neuron = item.n;
      const projected = item.p;

      if (
        projected.x < -200 ||
        projected.x > this.dom.canvas.width + 200 ||
        projected.y < -200 ||
        projected.y > this.dom.canvas.height + 200
      ) continue;

      const baseRadius = 4;
      const radius = Math.max(0.75, baseRadius * projected.scale * (projected.zoomFactor || 1) * this.config.neuronSize);
      const intensity = neuron.pulse / this.config.pulseIntensity;
      const isActive = intensity > 0.10;

      if (isActive) {
        const glowRadius = radius * (1.8 + intensity * 2.0);
        const gradient = this.ctx.createRadialGradient(projected.x, projected.y, 0, projected.x, projected.y, glowRadius);
        const glowColor = neuron.colors.glow;
        const f = fogFactor(projected.depth);
        gradient.addColorStop(0, `rgba(${Math.floor(glowColor.r * 255)}, ${Math.floor(glowColor.g * 255)}, ${Math.floor(glowColor.b * 255)}, ${f * intensity * 0.6})`);
        gradient.addColorStop(0.5, `rgba(${Math.floor(glowColor.r * 255)}, ${Math.floor(glowColor.g * 255)}, ${Math.floor(glowColor.b * 255)}, ${f * intensity * 0.3})`);
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(projected.x, projected.y, glowRadius, 0, Math.PI * 2);
        this.ctx.fill();
      }

      const depthFade = Math.min(1, 800 / Math.max(20, projected.depth));
      const squareSize = radius * 2;
      if (isActive) {
        const color = neuron.colors.primary;
        const f = fogFactor(projected.depth);
        this.ctx.fillStyle = `rgba(${Math.floor(color.r * 255 * depthFade)}, ${Math.floor(color.g * 255 * depthFade)}, ${Math.floor(color.b * 255 * depthFade)}, ${0.85 * f})`;
      } else {
        const accent = this.hexToRgb(this.theme.accentSubtle);
        const f = fogFactor(projected.depth);
        this.ctx.fillStyle = `rgba(${Math.floor(accent.r * depthFade)}, ${Math.floor(accent.g * depthFade)}, ${Math.floor(accent.b * depthFade)}, ${0.45 * f})`;
      }
      this.ctx.fillRect(projected.x - squareSize / 2, projected.y - squareSize / 2, squareSize, squareSize);
      // Step 5: subtle inhibitory cue (small cyan dot at top-left)
      if (neuron.type === 'I') {
        const dotR = Math.max(1.2, squareSize * 0.06);
        const glowAccent = this.hexToRgb(this.theme.accentGlow);
        this.ctx.fillStyle = `rgba(${glowAccent.r}, ${glowAccent.g}, ${glowAccent.b}, ${0.7 * depthFade})`;
        this.ctx.beginPath();
        this.ctx.arc(
          projected.x - squareSize / 2 + dotR + 1,
          projected.y - squareSize / 2 + dotR + 1,
          dotR,
          0,
          Math.PI * 2
        );
        this.ctx.fill();
      }

      const f2 = fogFactor(projected.depth);
      this.ctx.strokeStyle = isActive
        ? `rgba(${Math.floor(neuron.colors.glow.r * 255 * depthFade)}, ${Math.floor(neuron.colors.glow.g * 255 * depthFade)}, ${Math.floor(neuron.colors.glow.b * 255 * depthFade)}, ${0.9 * f2})`
        : this.hexWithAlpha(this.theme.border, 0.7 * f2);
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([]);
      this.ctx.strokeRect(projected.x - squareSize / 2, projected.y - squareSize / 2, squareSize, squareSize);

      if (squareSize > 12) {
        this.ctx.fillStyle = this.hexWithAlpha(this.theme.text, 0.9 * depthFade);
        this.ctx.font = `${Math.max(8, Math.min(12, squareSize * 0.4))}px Inter, monospace`;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(neuron.id.toString(), projected.x, projected.y);
      }

      if (neuron === this.state.selectedNeuron) {
        this.ctx.strokeStyle = this.theme.accentPrimary;
        this.ctx.lineWidth = Math.max(2, squareSize * 0.1);
        this.ctx.strokeRect(projected.x - squareSize / 2, projected.y - squareSize / 2, squareSize, squareSize);
      }

      if (this.state.showWeights && neuron.connections.length > 0 && radius > 8) {
        this.renderWeightPanel(neuron, projected);
      }
    }

    // Debug info - top center and always visible
    this.ctx.fillStyle = this.hexWithAlpha(this.theme.text, 0.7);
    this.ctx.font = "12px Inter, monospace";
    this.ctx.textAlign = "center";
    const zoom = (1800 / this.camera.distance).toFixed(2);
    const debugText = `CAM DIST: ${Math.round(
      this.camera.distance
    )} | ZOOM: ${zoom}x | NEURONS: ${this.neurons.length}`;
    this.ctx.fillText(debugText, this.dom.canvas.width / 2, 30);
    this.ctx.textAlign = "left"; // Reset alignment
  }

  // Draw a lightweight weights panel next to a neuron
  // Shows top outgoing connections with their weights.
  renderWeightPanel(neuron, projected) {
    const maxRows = 5;
    if (!neuron || !neuron.connections || neuron.connections.length === 0) return;

    // Sort by weight desc and take a few
    const rows = neuron.connections
      .slice(0)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, maxRows)
      .map((c) => ({ id: c.to.id, w: c.weight }));

    // Panel geometry
    const padX = 6;
    const padY = 6;
    const lineH = 12;
    const headerH = 14;
    const width = 100;
    const height = headerH + rows.length * lineH + padY * 2;

    // Offset panel to the upper-right of the neuron
    let x = projected.x + 10;
    let y = projected.y - height - 6;

    // Keep inside the canvas
    x = Math.max(4, Math.min(x, this.dom.canvas.width - width - 4));
    y = Math.max(4, Math.min(y, this.dom.canvas.height - height - 4));

    // Panel background
    this.ctx.fillStyle = this.hexWithAlpha(this.theme.surface3, 0.92); // matches UI surface tone
    this.ctx.fillRect(x, y, width, height);

    // Border
    this.ctx.strokeStyle = this.theme.accentSubtle; // edge accent
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

    // Header
    this.ctx.fillStyle = this.theme.text;
    this.ctx.font = "11px Inter, monospace";
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "top";
    this.ctx.fillText(`→ ${neuron.id}`, x + padX, y + padY);

    // Rows
    this.ctx.fillStyle = this.theme.text2;
    rows.forEach((r, i) => {
      const yy = y + padY + headerH + i * lineH - 2;
      this.ctx.fillText(`${r.id.toString().padStart(2, " ")}: ${r.w.toFixed(2)}`,
        x + padX,
        yy
      );
    });

    // No return value
  }

  clearTrace() {
    if (!this.traceCtx) return;

    const w = this.dom.trace.width;
    const h = this.dom.trace.height;

    this.traceCtx.fillStyle = this.theme.surface3; // Dark background for trace
    this.traceCtx.fillRect(0, 0, w, h);

    // Axes and grid (0.0, 0.5, 1.0)
    this.traceCtx.strokeStyle = this.theme.border;
    this.traceCtx.lineWidth = 1;
    const ticks = [0, 0.5, 1.0];
    ticks.forEach((t) => {
      const y = h - (t / 1.5) * h;
      this.traceCtx.beginPath();
      this.traceCtx.moveTo(0, y);
      this.traceCtx.lineTo(w, y);
      this.traceCtx.stroke();
      this.traceCtx.fillStyle = this.theme.textMuted;
      this.traceCtx.font = "10px Inter, monospace";
      this.traceCtx.fillText(t.toFixed(1), 4, Math.max(10, y - 2));
    });

    // Threshold dashed line at current threshold
    this.traceCtx.strokeStyle = this.hexWithAlpha(this.theme.accentDanger, 0.4);
    this.traceCtx.setLineDash([3, 3]);
    const thresholdY = h - (this.state.threshold / 1.5) * h;
    this.traceCtx.beginPath();
    this.traceCtx.moveTo(0, thresholdY);
    this.traceCtx.lineTo(w, thresholdY);
    this.traceCtx.stroke();
    this.traceCtx.setLineDash([]);
  }

  drawTrace() {
    if (!this.traceCtx || !this.state.selectedNeuron) return;

    this.clearTrace();

    this.traceCtx.strokeStyle = this.theme.accentPrimary; // Trace line accent
    this.traceCtx.lineWidth = 2;
    this.traceCtx.beginPath();

    const history = this.voltageHistory;
    const canvasWidth = this.dom.trace.width;
    const canvasHeight = this.dom.trace.height;

    for (let i = 0; i < history.length; i++) {
      const x = (i / Math.max(1, history.length - 1)) * canvasWidth;
      const y = canvasHeight - (history[i] / 1.5) * canvasHeight; // Scale voltage to fit
      if (i === 0) {
        this.traceCtx.moveTo(x, y);
      } else {
        this.traceCtx.lineTo(x, y);
      }
    }
    this.traceCtx.stroke();

    // Overlay spike markers for the selected neuron (last 4s)
    const now = Date.now();
    const windowMs = 1500;
    const spikes = this.state.selectedNeuron.spikeHistory || [];
    this.traceCtx.strokeStyle = "rgba(255, 120, 120, 0.35)";
    this.traceCtx.lineWidth = 1;
    spikes.forEach((t) => {
      if (now - t <= windowMs) {
        const x = this.dom.trace.width - ((now - t) / windowMs) * this.dom.trace.width;
        this.traceCtx.beginPath();
        this.traceCtx.moveTo(x, 0);
        this.traceCtx.lineTo(x, this.dom.trace.height);
        this.traceCtx.stroke();
      }
    });
  }

  createNetwork() {
    // Clear previous network
    this.neurons = [];
    this.connections = [];
    this.voltageHistory = [];
    this.state.selectedNeuron = null;
    this.clusterMetadata = [];
    this.regionInfo = null;

    if (this.config.presetId && this.config.presetId !== 'None' && this.activeTemplate) {
      this.createNetworkFromTemplate(this.activeTemplate);
      return;
    }

    // Create neurons with random positions in 3D space
    // Derive network size from cluster controls (updated for presets)
    this.config.networkSize = this.config.clusterCount * this.config.clusterSize;
    const networkSize = this.config.networkSize;
    const radius = 260; // Closer grouping

    // Precompute cluster layout grid
    const clusterCount = Math.max(1, this.config.clusterCount);
    const cols = Math.ceil(Math.sqrt(clusterCount));
    const rows = Math.ceil(clusterCount / cols);
    const spacingX = 240;
    const spacingY = 240;

    const registry = window.SNN_REGISTRY;
    const presetEntry = (this.config.presetId && registry)
      ? registry.RegionPresets?.[this.config.presetId]
      : null;
    const regionLabel =
      presetEntry?.label ||
      (this.config.presetId && this.config.presetId !== 'None'
        ? this.formatLabel(this.config.presetId)
        : 'Procedural Network');
    this.regionInfo = {
      id: this.config.presetId || 'procedural',
      name: regionLabel,
      presetLabel: presetEntry?.label || null,
      metadata: presetEntry?.metadata || null,
    };

    // From preset: per-cluster archetype list
    let clusterTypeList = new Array(clusterCount).fill(null);
    if (this.config.presetId && this.config.presetId !== 'None' && window.SNN_REGISTRY) {
      const preset = window.SNN_REGISTRY.RegionPresets[this.config.presetId];
      if (preset && Array.isArray(preset.clusters) && preset.clusters.length > 0) {
        const list = [];
        preset.clusters.forEach((c) => {
          for (let k = 0; k < (c.count || 1); k++) list.push(c.typeId);
        });
        for (let idx = 0; idx < clusterCount; idx++) {
          clusterTypeList[idx] = list[idx % list.length] || null;
        }
      }
    }

    const clustersMeta = Array.from({ length: clusterCount }, (_, idx) => {
      const archeId = clusterTypeList[idx];
      const arche = archeId && registry ? registry.ClusterTypes?.[archeId] : null;
      return {
        id: idx,
        label: arche?.label || `Cluster ${idx + 1}`,
        index: idx,
        regionId: this.regionInfo.id,
        regionName: this.regionInfo.name,
        archetypeId: archeId || null,
        archetypeLabel: arche?.label || null,
        metadata: arche?.metadata || null,
        neurons: [],
        groups: {},
      };
    });

    const sampleTypeId = (mix) => {
      if (!mix || mix.length === 0) return null;
      let r = Math.random(), acc = 0;
      for (const m of mix) {
        acc += m.fraction || 0;
        if (r <= acc) return m.typeId;
      }
      return mix[mix.length - 1].typeId;
    };

    for (let i = 0; i < networkSize; i++) {
      // Determine which cluster this neuron belongs to (4 clusters total)
      const clusterId = Math.floor(i / this.config.clusterSize);

      // Set cluster-specific position offset
      const row = Math.floor(clusterId / cols);
      const col = clusterId % cols;
      const clusterOffset = {
        x: (col - (cols - 1) / 2) * spacingX,
        y: (row - (rows - 1) / 2) * spacingY,
        z: 0,
      };

      // Random position within cluster
      const r = radius * (0.5 + Math.random() * 0.5); // Between 50% and 100% of radius
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI - Math.PI / 2;

      const position = {
        x: clusterOffset.x + r * Math.cos(theta) * Math.cos(phi) * 0.5,
        y: clusterOffset.y + r * Math.sin(phi) * 0.5,
        z: r * Math.sin(theta) * Math.cos(phi) * 0.5,
      };

      // Assign cluster color
      const colors = this.CLUSTER_COLORS[clusterId % this.CLUSTER_COLORS.length];

      // Determine neuron type (from preset mix if available)
      let nType = null;
      let groupPresetId = null;
      if (clusterTypeList[clusterId] && window.SNN_REGISTRY) {
        const arche = window.SNN_REGISTRY.ClusterTypes[clusterTypeList[clusterId]];
        const typeId = sampleTypeId(arche?.mix);
        groupPresetId = typeId;
        const def = window.SNN_REGISTRY.NeuronTypes[typeId];
        if (def) nType = def;
      }
      const isExcitatory = nType ? (nType.type !== 'inhibitory') : (i < Math.floor(this.config.excRatio * networkSize));
      const groupPreset = groupPresetId || (isExcitatory ? 'excitatory' : 'inhibitory');
      const groupLabel = this.formatLabel(groupPreset);
      const clusterMeta = clustersMeta[clusterId];

      this.neurons.push({
        id: i,
        position,
        voltage: Math.random() * 0.2, // Initial voltage
        pulse: 0, // Visual pulse effect
        colors,
        connections: [],
        lastFire: 0, // Timestamp of last spike
        spikeHistory: [], // Recent spike timestamps
        inputAccum: 0,
        refractoryUntil: 0,
        type: isExcitatory ? 'E' : 'I',
        // per-neuron overrides if provided by preset
        threshold: nType?.threshold,
        leak: nType?.leak,
        refractoryMs: nType?.refractoryMs,
        bgImpulse: nType?.bgImpulse,
        spikeGain: nType?.spikeGain,
        clusterId,
        clusterIndex: clusterId,
        clusterLabel: clusterMeta.label,
        clusterMetadata: clusterMeta.metadata || null,
        archetypeId: clusterTypeList[clusterId] || null,
        archetypeLabel:
          (clusterTypeList[clusterId] &&
            window.SNN_REGISTRY &&
            window.SNN_REGISTRY.ClusterTypes[clusterTypeList[clusterId]]?.label) ||
          null,
        regionId: this.regionInfo.id,
        regionName: this.regionInfo.name,
        regionMetadata: this.regionInfo.metadata || null,
        groupPreset,
        groupLabel,
        neuronTypeId: groupPreset,
        neuronTypeLabel: groupLabel,
        bio: nType?.bio || null,
      });
      const neuron = this.neurons[this.neurons.length - 1];
      clusterMeta.neurons.push(neuron);
      if (!clusterMeta.groups[groupPreset]) clusterMeta.groups[groupPreset] = [];
      clusterMeta.groups[groupPreset].push(neuron);
    }

    // Create connections between neurons with probability based on cluster membership
    for (let i = 0; i < networkSize; i++) {
      const fromNeuron = this.neurons[i];
      const fromCluster = Math.floor(i / this.config.clusterSize);

      for (let j = 0; j < networkSize; j++) {
        if (i === j) continue; // Skip self-connections

        const toNeuron = this.neurons[j];
        const toCluster = Math.floor(j / this.config.clusterSize);

        // Probability and weights: if preset + archetypes available, use them; else fallback
        const same = fromCluster === toCluster;

        let connectionProb;
        let weight;

        const usingPreset = this.config.presetId && this.config.presetId !== 'None' && window.SNN_REGISTRY;
        if (usingPreset) {
          const fromArcheId = clusterTypeList[fromCluster];
          const fromArche = window.SNN_REGISTRY.ClusterTypes[fromArcheId] || null;
          if (fromArche && fromArche.intra && fromArche.inter) {
            const p = same ? (fromArche.intra.prob ?? 0.2) : (fromArche.inter.prob ?? 0.05);
            // Base slider is a global multiplier, interProbScale further reduces cross-cluster
            connectionProb = this.config.connectionProb * (same ? p : p * ((this.config.interProbScale ?? 0.2) || 0.2));

            const key = fromNeuron.type === 'E' ? 'E' : 'I';
            const range = same ? (fromArche.intra.weight?.[key]) : (fromArche.inter.weight?.[key]);
            const minW = Array.isArray(range) ? range[0] : 0.2;
            const maxW = Array.isArray(range) ? range[1] : 0.6;
            const baseW = minW + Math.random() * (maxW - minW);
            const interScale = same ? 1 : ((this.config.interWeightScale ?? 0.3) || 0.3);
            weight = baseW * interScale * (fromNeuron.type === 'E' ? 1 : -1);
          }
        }

        if (connectionProb === undefined) {
          // Fallback to legacy global model
          const baseProbability = this.config.connectionProb;
          connectionProb = baseProbability * (same ? 1.8 : (0.02 + 0.28 * (this.config.interProbScale ?? 0.2)));
          if (fromNeuron.type === 'E') {
            const baseE = 0.45 + Math.random() * 0.55;
            const interW = 0.10 + 0.90 * (this.config.interWeightScale ?? 0.3);
            weight = same ? baseE : baseE * interW;
          } else {
            const baseI = 0.25 + Math.random() * 0.45;
            const interWI = 0.10 + 0.90 * (this.config.interWeightScale ?? 0.3);
            weight = -(same ? baseI : baseI * interWI);
          }
        }

        if (Math.random() < connectionProb) {
          // Create the connection
          const connection = {
            from: fromNeuron,
            to: toNeuron,
            weight,
          };

          this.connections.push(connection);
          fromNeuron.connections.push(connection);
        }
      }
    }

    // Seed a few initial spikes so the simulation is visibly active immediately
    // Seed per-cluster to avoid global simultaneous onset
    for (let c = 0; c < this.config.clusterCount; c++) {
      const start = c * this.config.clusterSize;
      const end = start + this.config.clusterSize;
      const selection = [];
      for (let k = 0; k < 2; k++) {
        const idx = start + Math.floor(Math.random() * (end - start));
        selection.push(this.neurons[idx]);
      }
      selection.forEach((n) => this.fireNeuron(n));
    }

    clustersMeta.forEach((meta) => {
      meta.totalNeurons = meta.neurons.length;
      meta.groupSummary = Object.entries(meta.groups).map(([preset, list]) => ({
        preset,
        label: this.formatLabel(preset),
        count: list.length,
        type: (registry?.NeuronTypes?.[preset]?.type) || null,
      }));
    });
    this.clusterMetadata = clustersMeta;

    // Sync UI labels to derived sizes
    if (this.dom.sizeValueLabel) this.dom.sizeValueLabel.textContent = this.config.networkSize;
    if (this.dom.networkSizeSlider) this.dom.networkSizeSlider.value = String(this.config.networkSize);
    if (this.dom.clustersValueLabel) this.dom.clustersValueLabel.textContent = this.config.clusterCount;
    if (this.dom.clusterCountSlider) this.dom.clusterCountSlider.value = String(this.config.clusterCount);
    if (this.dom.clusterSizeValueLabel) this.dom.clusterSizeValueLabel.textContent = this.config.clusterSize;
    if (this.dom.clusterSizeSlider) this.dom.clusterSizeSlider.value = String(this.config.clusterSize);

    // Clear trace if a neuron was selected
    this.clearTrace();

    if (this.dom.voltageValue) {
      this.dom.voltageValue.textContent = "--";
    }
    if (this.dom.neuronMeta) this.renderNeuronDetails(null);

    console.log(
      `Network created with ${this.neurons.length} neurons and ${this.connections.length} connections`
    );
  }

  createNetworkFromTemplate(template) {
    const registry = window.SNN_REGISTRY;
    const neuronTypes = registry?.NeuronTypes || {};
    const clusters = Array.isArray(template?.clusters) ? template.clusters : [];

    if (!clusters.length) {
      console.warn('Template preset has no clusters', template);
      return;
    }

    const presetEntry = registry?.RegionPresets?.[this.config.presetId];
    const regionInfo = {
      id: template.id || this.config.presetId || template.regionName || 'template',
      name: template.regionName || presetEntry?.label || this.formatLabel(this.config.presetId),
      presetLabel: presetEntry?.label || null,
      metadata: template.metadata || presetEntry?.metadata || null,
    };
    this.regionInfo = regionInfo;
    this.clusterMetadata = [];

    const clusterCount = clusters.length;
    const cols = Math.ceil(Math.sqrt(clusterCount));
    const rows = Math.ceil(clusterCount / Math.max(cols, 1));
    const spacingX = 240;
    const spacingY = 240;
    const radius = 240;

    const baseProbScale = this.config.connectionProb ? this.config.connectionProb / 0.3 : 0;
    const crossProbScale = this.config.interProbScale !== undefined
      ? this.config.interProbScale / 0.2
      : 1;
    const crossWeightScale = this.config.interWeightScale !== undefined
      ? this.config.interWeightScale / 0.3
      : 1;

    const clustersMeta = [];
    const clusterLookup = new Map();

    const addConnection = (fromNeuron, toNeuron, weight) => {
      if (!fromNeuron || !toNeuron || fromNeuron === toNeuron) return;
      const connection = { from: fromNeuron, to: toNeuron, weight };
      this.connections.push(connection);
      fromNeuron.connections.push(connection);
    };

    const scaleProbability = (prob, isInter) => {
      const base = typeof prob === 'number' ? prob : (isInter ? 0.05 : 0.2);
      if (base <= 0) return 0;
      if (isInter) {
        if (!this.config.interProbScale) return 0;
        return Math.max(0, Math.min(base * crossProbScale, 0.95));
      }
      if (!this.config.connectionProb) return 0;
      return Math.max(0, Math.min(base * baseProbScale, 0.95));
    };

    const deriveWeight = (rule, isInter) => {
      const presetDef = neuronTypes[rule.from] || {};
      const base = typeof rule.weight === 'number' ? rule.weight : (presetDef.weight ?? 0.6);
      const scale = isInter ? crossWeightScale : 1;
      const magnitude = base * scale * (0.9 + Math.random() * 0.2);
      return rule.type === 'inhibitory' ? -Math.abs(magnitude) : Math.abs(magnitude);
    };

    clusters.forEach((clusterCfg, idx) => {
      const clusterMeta = {
        id: clusterCfg.id || `cluster_${idx}`,
        label: clusterCfg.name || `Cluster ${idx + 1}`,
        index: idx,
        regionId: regionInfo.id,
        regionName: regionInfo.name,
        metadata: clusterCfg.metadata || null,
        neurons: [],
        groups: {},
      };
      clustersMeta.push(clusterMeta);
      clusterLookup.set(clusterMeta.id, clusterMeta);

      const row = Math.floor(idx / Math.max(cols, 1));
      const col = idx % Math.max(cols, 1);
      const clusterOffset = {
        x: (col - (cols - 1) / 2) * spacingX,
        y: (row - (rows - 1) / 2) * spacingY,
        z: 0,
      };

      (clusterCfg.neuronGroups || []).forEach((group) => {
        const presetId = group.preset;
        const count = Math.max(0, group.count | 0);
        const typeDef = neuronTypes[presetId] || {};
        const groupLabel = this.formatLabel(presetId);
        for (let n = 0; n < count; n++) {
          const r = radius * (0.4 + Math.random() * 0.6);
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI - Math.PI / 2;
          const position = {
            x: clusterOffset.x + r * Math.cos(theta) * Math.cos(phi) * 0.5,
            y: clusterOffset.y + r * Math.sin(phi) * 0.5,
            z: r * Math.sin(theta) * Math.cos(phi) * 0.5,
          };

          const neuron = {
            id: this.neurons.length,
            position,
            voltage: Math.random() * 0.2,
            pulse: 0,
            colors: this.CLUSTER_COLORS[idx % this.CLUSTER_COLORS.length],
            connections: [],
            lastFire: 0,
            spikeHistory: [],
            inputAccum: 0,
            refractoryUntil: 0,
            type: typeDef.type === 'inhibitory' ? 'I' : 'E',
            threshold: typeDef.threshold,
            leak: typeDef.leak,
            refractoryMs: typeDef.refractoryMs,
            bgImpulse: typeDef.bgImpulse,
            spikeGain: typeDef.spikeGain,
            bio: typeDef.bio || null,
            groupPreset: presetId,
            groupLabel,
            neuronTypeId: presetId,
            neuronTypeLabel: groupLabel,
            clusterId: clusterMeta.id,
            clusterLabel: clusterMeta.label,
            clusterIndex: idx,
            clusterMetadata: clusterMeta.metadata || null,
            regionId: regionInfo.id,
            regionName: regionInfo.name,
            regionMetadata: regionInfo.metadata || null,
          };

          this.neurons.push(neuron);
          clusterMeta.neurons.push(neuron);
          if (!clusterMeta.groups[presetId]) clusterMeta.groups[presetId] = [];
          clusterMeta.groups[presetId].push(neuron);
        }
      });
    });

    clustersMeta.forEach((meta) => {
      meta.totalNeurons = meta.neurons.length;
      meta.groupSummary = Object.entries(meta.groups).map(([preset, list]) => ({
        preset,
        label: this.formatLabel(preset),
        count: list.length,
        type: (registry?.NeuronTypes?.[preset]?.type) || null,
      }));
    });
    this.clusterMetadata = clustersMeta;

    // Internal cluster wiring
    clusters.forEach((clusterCfg, idx) => {
      const clusterMeta = clustersMeta[idx];
      (clusterCfg.internalConnectivity || []).forEach((rule) => {
        const sources = clusterMeta.groups[rule.from] || [];
        const targets = clusterMeta.groups[rule.to] || [];
        const probability = scaleProbability(rule.probability, false);
        if (!sources.length || !targets.length || probability <= 0) return;
        sources.forEach((src) => {
          targets.forEach((tgt) => {
            if (src === tgt) return;
            if (Math.random() <= probability) {
              const weight = deriveWeight(rule, false);
              addConnection(src, tgt, weight);
            }
          });
        });
      });
    });

    // Inter-cluster wiring
    (template.connections || []).forEach((edge) => {
      const fromMeta = clusterLookup.get(edge.fromCluster);
      const toMeta = clusterLookup.get(edge.toCluster);
      if (!fromMeta || !toMeta) return;
      (edge.connectivity || []).forEach((rule) => {
        const sources = fromMeta.groups[rule.from] || [];
        const targets = toMeta.groups[rule.to] || [];
        const probability = scaleProbability(rule.probability, true);
        if (!sources.length || !targets.length || probability <= 0) return;
        sources.forEach((src) => {
          targets.forEach((tgt) => {
            if (Math.random() <= probability) {
              const weight = deriveWeight(rule, true);
              addConnection(src, tgt, weight);
            }
          });
        });
      });
    });

    // Store summary stats
    this.config.networkSize = this.neurons.length;
    this.config.clusterCount = clusterCount;
    const derivedClusterSizes = clustersMeta.map((meta) => meta.neurons.length);
    if (derivedClusterSizes.length) {
      const avg = Math.round(derivedClusterSizes.reduce((a, b) => a + b, 0) / derivedClusterSizes.length);
      this.config.clusterSize = avg;
    }


    // Seed a couple of neurons per cluster so the network is immediately active
    clustersMeta.forEach((meta) => {
      const pool = meta.neurons;
      if (!pool.length) return;
      const seeds = Math.min(2, pool.length);
      for (let i = 0; i < seeds; i++) {
        const neuron = pool[Math.floor(Math.random() * pool.length)];
        this.fireNeuron(neuron);
      }
    });

    this.clearTrace();
    if (this.dom.voltageValue) this.dom.voltageValue.textContent = '--';

    console.log(`Template network built: ${template.regionName || this.config.presetId} (${this.neurons.length} neurons, ${this.connections.length} connections)`);
    this.clearTrace();
    if (this.dom.voltageValue) this.dom.voltageValue.textContent = "--";
    if (this.dom.neuronMeta) this.renderNeuronDetails(null);
  }

  fireNeuron(neuron) {
    if (!neuron) return;

    // Set pulse for visual effect
    neuron.pulse = this.config.pulseIntensity;

    // Reset voltage
    neuron.voltage = 0;

    // Record spike time
    const now = Date.now();
    neuron.lastFire = now;
    if (Array.isArray(neuron.spikeHistory)) {
      neuron.spikeHistory.push(now);
      if (neuron.spikeHistory.length > 100) neuron.spikeHistory.shift();
    }
    const refr = (neuron.refractoryMs ?? this.config.refractoryMs) ?? 0;
    neuron.refractoryUntil = now + refr;

    // Propagate to connected neurons
    const gain = neuron.spikeGain ?? 1.0;
    neuron.connections.forEach((conn) => {
      conn.to.inputAccum = (conn.to.inputAccum || 0) + conn.weight * gain;
    });
  }

  updateNetwork() {
    if (this.state.pauseSpikes) return;

    // Support fractional speeds smoothly via accumulator
    this._simAccumulator += Math.max(0, this.state.speed);
    const steps = Math.floor(this._simAccumulator);
    this._simAccumulator -= steps;

    for (let i = 0; i < steps; i++) {
      const toFire = [];
      const now = Date.now();

      // First pass: decay, apply accumulated input, background input, then decide spikes
      this.neurons.forEach((neuron) => {
        // Visual pulse decay always
        neuron.pulse *= this.state.pulseDecay;

        // Refractory period: skip integration and threshold checks
        if (neuron.refractoryUntil && now < neuron.refractoryUntil) {
          neuron.inputAccum = 0; // still clear any queued input this step
          return;
        }

        // Leaky integration + queued input (per-neuron override if present)
        const leak = neuron.leak ?? this.config.leak ?? 0.985;
        neuron.voltage = neuron.voltage * leak + (neuron.inputAccum || 0);
        neuron.inputAccum = 0;

        // Background random input
        if (Math.random() < this.state.firingRate) {
          const base = (neuron.bgImpulse ?? this.config.backgroundImpulse) ?? 0.08;
          const amp = base * (0.25 + 0.75 * (1 - Math.min(1, Math.max(0, this.state.firingRate))));
          neuron.voltage += amp;
        }

        // Threshold test after integration
        const thr = neuron.threshold ?? this.state.threshold;
        if (neuron.voltage >= thr) toFire.push(neuron);
      });

      // Second pass: fire spikes (apply to next step via inputAccum)
      toFire.forEach((n) => this.fireNeuron(n));
    }

    // Update voltage trace for selected neuron
    if (this.state.selectedNeuron) {
      this.voltageHistory.push(this.state.selectedNeuron.voltage);
      if (this.voltageHistory.length > 150) {
        this.voltageHistory.shift();
      }

      if (this.dom.voltageValue) {
        const v = this.state.selectedNeuron.voltage;
        const last = this.state.selectedNeuron.lastFire || 0;
        const ago = last ? `${((Date.now() - last) / 1000).toFixed(1)}s ago` : "no spike yet";
        this.dom.voltageValue.textContent = `${v.toFixed(3)} (${ago})`;
      }

      this.drawTrace();
    }
  }

  bindUI() {
    // All the UI binding code
    if (this.dom.playBtn) {
      this.dom.playBtn.addEventListener("click", () => {
        this.state.isRunning = !this.state.isRunning;
        this.dom.playBtn.textContent = this.state.isRunning ? "Pause" : "Play";
        this.dom.playBtn.classList.toggle("on", this.state.isRunning);
      });
    }

    if (this.dom.speedSlider) {
      this.dom.speedSlider.addEventListener("input", (e) => {
        this.state.speed = parseFloat(e.target.value);
      });
    }

    if (this.dom.exportTemplateBtn) {
      this.dom.exportTemplateBtn.addEventListener("click", () => this.exportCurrentTemplate());
    }

    if (this.dom.importTemplateBtn && this.dom.importTemplateInput) {
      this.dom.importTemplateBtn.addEventListener("click", () => this.dom.importTemplateInput.click());
      this.dom.importTemplateInput.addEventListener("change", (e) => {
        this.handleTemplateFileList(e.target.files);
      });
    }

    if (this.dom.importHelpBtn) {
      this.dom.importHelpBtn.addEventListener("click", () => this.showTemplateImportDocs());
    }

    // Preset selection
    if (this.dom.presetSelect) {
      this.dom.presetSelect.addEventListener("change", (e) => {
        const id = e.target.value;
        this.applyPreset(id);
      });
    }

    this.refreshPresetOptions(this.config.presetId || 'None');

    // Initialize lock state
    this.updatePresetLockUI();

    if (this.dom.networkSizeSlider) {
      this.dom.networkSizeSlider.addEventListener("input", (e) => {
        this.config.networkSize = parseInt(e.target.value);
        // Keep cluster size in sync with network size and cluster count
        if (this.config.clusterCount > 0) {
          this.config.clusterSize = Math.max(1, Math.round(this.config.networkSize / this.config.clusterCount));
          if (this.dom.clusterSizeSlider) this.dom.clusterSizeSlider.value = String(this.config.clusterSize);
          if (this.dom.clusterSizeValueLabel) this.dom.clusterSizeValueLabel.textContent = this.config.clusterSize;
        }
        if (this.dom.sizeValueLabel) {
          this.dom.sizeValueLabel.textContent = this.config.networkSize;
        }
      });

      this.dom.networkSizeSlider.addEventListener("change", () => {
        this.createNetwork();
      });
    }

    if (this.dom.connectionProbSlider) {
      this.dom.connectionProbSlider.addEventListener("input", (e) => {
        this.config.connectionProb = parseFloat(e.target.value);
        if (this.dom.probValueLabel) {
          this.dom.probValueLabel.textContent =
            this.config.connectionProb.toFixed(2);
        }
      });

      this.dom.connectionProbSlider.addEventListener("change", () => {
        this.createNetwork();
      });
    }

    // Cluster count control
    if (this.dom.clusterCountSlider) {
      this.dom.clusterCountSlider.addEventListener("input", (e) => {
        this.config.clusterCount = parseInt(e.target.value);
        if (this.dom.clustersValueLabel) this.dom.clustersValueLabel.textContent = this.config.clusterCount;
        // Update derived network size
        this.config.networkSize = this.config.clusterCount * this.config.clusterSize;
        if (this.dom.networkSizeSlider) this.dom.networkSizeSlider.value = String(this.config.networkSize);
        if (this.dom.sizeValueLabel) this.dom.sizeValueLabel.textContent = this.config.networkSize;
      });
      this.dom.clusterCountSlider.addEventListener("change", () => this.createNetwork());
    }

    // Cluster size control
    if (this.dom.clusterSizeSlider) {
      this.dom.clusterSizeSlider.addEventListener("input", (e) => {
        this.config.clusterSize = parseInt(e.target.value);
        if (this.dom.clusterSizeValueLabel) this.dom.clusterSizeValueLabel.textContent = this.config.clusterSize;
        // Update derived network size
        this.config.networkSize = this.config.clusterCount * this.config.clusterSize;
        if (this.dom.networkSizeSlider) this.dom.networkSizeSlider.value = String(this.config.networkSize);
        if (this.dom.sizeValueLabel) this.dom.sizeValueLabel.textContent = this.config.networkSize;
      });
      this.dom.clusterSizeSlider.addEventListener("change", () => this.createNetwork());
    }

    // Inter-cluster probability
    if (this.dom.interProbSlider) {
      this.dom.interProbSlider.addEventListener("input", (e) => {
        this.config.interProbScale = parseFloat(e.target.value);
        if (this.dom.interProbValueLabel)
          this.dom.interProbValueLabel.textContent = this.config.interProbScale.toFixed(2);
      });
      this.dom.interProbSlider.addEventListener("change", () => this.createNetwork());
    }

    // Inter-cluster weight
    if (this.dom.interWeightSlider) {
      this.dom.interWeightSlider.addEventListener("input", (e) => {
        this.config.interWeightScale = parseFloat(e.target.value);
        if (this.dom.interWeightValueLabel)
          this.dom.interWeightValueLabel.textContent = this.config.interWeightScale.toFixed(2);
      });
      this.dom.interWeightSlider.addEventListener("change", () => this.createNetwork());
    }

    // E/I balance (excitatory ratio)
    if (this.dom.excRatioSlider) {
      this.dom.excRatioSlider.addEventListener("input", (e) => {
        this.config.excRatio = parseFloat(e.target.value);
        if (this.dom.excRatioValueLabel)
          this.dom.excRatioValueLabel.textContent = this.config.excRatio.toFixed(2);
      });
      this.dom.excRatioSlider.addEventListener("change", () => this.createNetwork());
    }

    // Depth fog strength
    if (this.dom.fogSlider) {
      this.dom.fogSlider.addEventListener("input", (e) => {
        this.config.fogStrength = parseFloat(e.target.value);
        if (this.dom.fogValueLabel)
          this.dom.fogValueLabel.textContent = this.config.fogStrength.toFixed(2);
      });
    }

    if (this.dom.resetBtn) {
      this.dom.resetBtn.addEventListener("click", () => {
        this.createNetwork();
      });
    }

    if (this.dom.showWeightsBtn) {
      this.dom.showWeightsBtn.addEventListener("click", () => {
        this.state.showWeights = !this.state.showWeights;
        this.dom.showWeightsBtn.classList.toggle("on", this.state.showWeights);
      });
    }

    if (this.dom.injectSpikeBtn) {
      this.dom.injectSpikeBtn.addEventListener("click", () => {
        const randomNeuron =
          this.neurons[Math.floor(Math.random() * this.neurons.length)];
        this.fireNeuron(randomNeuron);
      });
    }

    // Additional controls
    if (this.dom.firingRateSlider) {
      this.dom.firingRateSlider.addEventListener("input", (e) => {
        this.state.firingRate = parseFloat(e.target.value);
        if (this.dom.firingValueLabel) {
          this.dom.firingValueLabel.textContent = this.state.firingRate.toFixed(2);
        }
      });
    }

    if (this.dom.pauseSpikesBtn) {
      this.dom.pauseSpikesBtn.addEventListener("click", () => {
        this.state.pauseSpikes = !this.state.pauseSpikes;
        this.dom.pauseSpikesBtn.classList.toggle("on", this.state.pauseSpikes);
        this.dom.pauseSpikesBtn.textContent = this.state.pauseSpikes
          ? "Resume Spikes"
          : "Pause Spikes";
      });
    }

    // Additional parameter controls
    if (this.dom.pulseDecaySlider) {
      this.dom.pulseDecaySlider.addEventListener("input", (e) => {
        this.state.pulseDecay = parseFloat(e.target.value);
        if (this.dom.decayValueLabel) {
          this.dom.decayValueLabel.textContent =
            this.state.pulseDecay.toFixed(2);
        }
      });
    }

    if (this.dom.thresholdSlider) {
      this.dom.thresholdSlider.addEventListener("input", (e) => {
        this.state.threshold = parseFloat(e.target.value);
        if (this.dom.thresholdValueLabel) {
          this.dom.thresholdValueLabel.textContent =
            this.state.threshold.toFixed(1);
        }
      });
    }
  }

  // Step 1 preset applicator: update clusterCount, clusterSize, and excRatio using registry.
  applyPreset(presetId) {
    if (!window.SNN_REGISTRY) return;
    const preset = window.SNN_REGISTRY.RegionPresets[presetId];

    if (!preset || presetId === 'None') {
      this.config.presetId = 'None';
      this.activeTemplate = null;
      if (typeof this.updatePresetLockUI === 'function') this.updatePresetLockUI();
      if (typeof this.renderPresetSummary === 'function') this.renderPresetSummary(presetId);
      this.createNetwork();
      return;
    }

    this.config.presetId = presetId;
    this.activeTemplate = window.SNN_REGISTRY.getTemplateForPreset(preset);

    const counts = window.SNN_REGISTRY.deriveCounts(preset);
    const ei = window.SNN_REGISTRY.estimateEI(preset);

    if (counts) {
      this.config.clusterCount = counts.clusters;
      this.config.clusterSize = counts.clusterSize;
      this.config.networkSize = counts.totalNeurons ?? (counts.clusters * counts.clusterSize);
      if (this.dom.clustersValueLabel) this.dom.clustersValueLabel.textContent = this.config.clusterCount;
      if (this.dom.clusterCountSlider) this.dom.clusterCountSlider.value = String(this.config.clusterCount);
      if (this.dom.clusterSizeValueLabel) this.dom.clusterSizeValueLabel.textContent = this.config.clusterSize;
      if (this.dom.clusterSizeSlider) this.dom.clusterSizeSlider.value = String(this.config.clusterSize);
      if (this.dom.sizeValueLabel) this.dom.sizeValueLabel.textContent = this.config.networkSize;
      if (this.dom.networkSizeSlider) this.dom.networkSizeSlider.value = String(this.config.networkSize);
    }

    if (typeof ei === 'number' && !Number.isNaN(ei)) {
      this.config.excRatio = ei;
      if (this.dom.excRatioSlider) this.dom.excRatioSlider.value = ei.toFixed(2);
      if (this.dom.excRatioValueLabel) this.dom.excRatioValueLabel.textContent = ei.toFixed(2);
    }

    if (typeof this.updatePresetLockUI === 'function') this.updatePresetLockUI();
    if (typeof this.renderPresetSummary === 'function') this.renderPresetSummary(presetId);
    this.createNetwork();
  }


  // Step 4: Disable/enable controls that are governed by a preset
  updatePresetLockUI() {
    const locked = !!(this.config.presetId && this.config.presetId !== 'None');
    const setDisabled = (el) => { if (el) el.disabled = locked; };
    setDisabled(this.dom.clusterCountSlider);
    setDisabled(this.dom.clusterSizeSlider);
    setDisabled(this.dom.excRatioSlider);
  }

  // Step 4: Show a compact summary of the active preset
  renderPresetSummary(presetId) {
    if (!this.dom.presetSummary) return;
    if (!presetId || presetId === 'None' || !window.SNN_REGISTRY) {
      this.dom.presetSummary.textContent = '';
      return;
    }

    const preset = window.SNN_REGISTRY.RegionPresets[presetId];
    if (!preset) {
      this.dom.presetSummary.textContent = '';
      return;
    }

    const template = window.SNN_REGISTRY.getTemplateForPreset(preset);
    if (template && Array.isArray(template.clusters) && template.clusters.length) {
      const segments = template.clusters.map((cluster) => {
        const groups = (cluster.neuronGroups || []).map((group) => `${group.count}x${group.preset}`);
        return `${cluster.name || cluster.id}: ${groups.join(', ')}`;
      });
      const ei = window.SNN_REGISTRY.estimateEI(preset);
      const ratioText = Number.isFinite(ei) ? `  |  E frac ≈ ${ei.toFixed(2)}` : '';
      this.dom.presetSummary.textContent = `${segments.join('  |  ')}${ratioText}`;
      return;
    }

    const parts = [];
    (preset.clusters || []).forEach((c) => {
      const label = window.SNN_REGISTRY.ClusterTypes[c.typeId]?.label || c.typeId;
      parts.push(`${c.count || 1}x${label}`);
    });
    const ei = window.SNN_REGISTRY.estimateEI(preset);
    this.dom.presetSummary.textContent = `${parts.join('  |  ')}  |  E frac ≈ ${ei.toFixed(2)}`;
  }

  refreshPresetOptions(selectedId) {
    if (!this.dom.presetSelect || !window.SNN_REGISTRY) return;
    const registry = window.SNN_REGISTRY;
    const entries = typeof registry.listTemplates === 'function'
      ? registry.listTemplates()
      : Object.keys(registry.RegionPresets || {}).map((key) => ({
          id: key,
          label: registry.RegionPresets[key]?.label || key,
        }));

    const sorted = entries
      .filter((entry, idx, arr) => arr.findIndex((e) => e.id === entry.id) === idx)
      .sort((a, b) => {
        if (a.id === 'None') return -1;
        if (b.id === 'None') return 1;
        return a.label.localeCompare(b.label);
      });

    const currentSelection = selectedId || this.dom.presetSelect.value || 'None';
    this.dom.presetSelect.innerHTML = '';
    const frag = document.createDocumentFragment();
    sorted.forEach(({ id, label }) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = label;
      frag.appendChild(option);
    });
    this.dom.presetSelect.appendChild(frag);
    if (registry.RegionPresets[currentSelection]) {
      this.dom.presetSelect.value = currentSelection;
    }
  }

  exportCurrentTemplate() {
    if (!window.SNN_REGISTRY) return;
    const presetId =
      (this.config.presetId && this.config.presetId !== 'None')
        ? this.config.presetId
        : this.dom.presetSelect?.value;

    if (!presetId || presetId === 'None') {
      this.showBanner('Select a template preset before exporting.');
      return;
    }

    try {
      const json = window.SNN_REGISTRY.exportTemplateConfig(presetId, 2);
      const preset = window.SNN_REGISTRY.RegionPresets[presetId];
      const label = preset?.label || presetId;
      const slug = (label || 'template').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${slug || 'template'}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      this.showBanner(`Exported template "${label}".`);
    } catch (error) {
      console.error('Template export failed', error);
      this.showBanner(`Template export failed: ${error.message || error}`, 'error', 5000);
    }
  }

  async handleTemplateFileList(fileList) {
    if (!fileList || !fileList.length || !window.SNN_REGISTRY) return;
    const file = fileList[0];
    try {
      const text = await file.text();
      const template = window.SNN_CONFIG_IO
        ? window.SNN_CONFIG_IO.deserializeTemplate(text)
        : JSON.parse(text);
      const desiredKey = (template.id || template.regionName || file.name || 'Imported_Template')
        .toString()
        .replace(/[^a-z0-9_]+/gi, '_')
        .replace(/^_+|_+$/g, '');
      let key = desiredKey || `Template_${Date.now()}`;
      let suffix = 1;
      const presets = window.SNN_REGISTRY.RegionPresets || {};
      while (presets[key]) {
        key = `${desiredKey}_${suffix++}`;
      }
      const registered = window.SNN_REGISTRY.registerTemplate(key, template);
      this.refreshPresetOptions(key);
      if (this.dom.presetSelect) {
        this.dom.presetSelect.value = key;
      }
      this.applyPreset(key);
      this.showBanner(`Imported template "${registered.regionName || key}".`);
    } catch (error) {
      console.error('Template import failed', error);
      this.showBanner(`Template import failed: ${error.message || error}`, 'error', 6000);
    } finally {
      if (this.dom.importTemplateInput) {
        this.dom.importTemplateInput.value = '';
      }
    }
  }

  showTemplateImportDocs() {
    const escapeHtml = (value) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    const accentColor = this.theme?.textAccent || "#f6c274";
    const textColor = this.theme?.text || "#f4eadc";
    const secondaryText = this.theme?.textMuted || "#b8926a";
    const surfaceTwo = this.theme?.surface2 || "#271b10";
    const borderColor = this.theme?.border || "#4b311d";

    const exampleTemplate = escapeHtml(
      JSON.stringify(
        {
          id: "Custom_Hub",
          regionName: "Custom Hub",
          clusters: [
            {
              id: "Hub_A",
              name: "Hub A",
              neuronGroups: [
                { preset: "pyramidal", count: 80 },
                { preset: "basket", count: 20 },
              ],
              internalConnectivity: [
                { from: "pyramidal", to: "pyramidal", probability: 0.3, type: "excitatory" },
                { from: "basket", to: "pyramidal", probability: 0.8, type: "inhibitory" },
              ],
            },
            {
              id: "Hub_B",
              name: "Hub B",
              neuronGroups: [
                { preset: "pyramidal", count: 60 },
                { preset: "basket", count: 15 },
              ],
              internalConnectivity: [
                { from: "pyramidal", to: "pyramidal", probability: 0.2, type: "excitatory" },
                { from: "basket", to: "pyramidal", probability: 0.75, type: "inhibitory" },
              ],
            },
          ],
          connections: [
            {
              fromCluster: "Hub_A",
              toCluster: "Hub_B",
              connectivity: [
                {
                  from: "pyramidal",
                  to: "pyramidal",
                  probability: 0.25,
                  type: "excitatory",
                  weight: 1.1,
                  delay: 4.5,
                },
              ],
            },
          ],
          metadata: {
            notes: ["Weights and delays override defaults when provided."],
          },
        },
        null,
        2
      )
    );

    const bodyHtml = `
      <h1 style="margin-top:0; color:${accentColor};">Template Import Guide</h1>
      <p style="color:${textColor};">This import loads a JSON configuration that describes neuron clusters and the synaptic map between them. Each template becomes a selectable preset in the visualizer.</p>
      <h2 style="color:${accentColor};">Top-level fields</h2>
      <ul>
        <li style="color:${secondaryText};"><code>id</code> (string, optional): Unique key used internally. If omitted, a key is derived from <code>regionName</code>.</li>
        <li style="color:${secondaryText};"><code>regionName</code> (string): Friendly label shown in the preset menu.</li>
        <li style="color:${secondaryText};"><code>clusters</code> (array, required): Each cluster defines neuron groups and local wiring.</li>
        <li style="color:${secondaryText};"><code>connections</code> (array, optional): Long-range projections between clusters.</li>
        <li style="color:${secondaryText};"><code>metadata</code> (object, optional): Free-form notes, references, etc.</li>
      </ul>
      <h2 style="color:${accentColor};">Cluster objects</h2>
      <ul>
        <li style="color:${secondaryText};"><code>id</code>, <code>name</code>: Identifiers used for cross references.</li>
        <li style="color:${secondaryText};"><code>neuronGroups</code>: Array of { <code>preset</code>, <code>count</code> } entries referencing presets such as <em>pyramidal</em>, <em>basket</em>, <em>relay</em>.</li>
        <li style="color:${secondaryText};"><code>internalConnectivity</code>: Array of rules { <code>from</code>, <code>to</code>, <code>probability</code>, <code>type</code>, optional <code>weight</code>, <code>delay</code> } describing within-cluster synapses.</li>
      </ul>
      <h2 style="color:${accentColor};">Connection edges</h2>
      <p style="color:${textColor};">Each entry links two clusters with a <code>connectivity</code> list using the same rule format. Probabilities are scaled by the global sliders at runtime.</p>
      <h2 style="color:${accentColor};">Example JSON</h2>
      <pre style="background:${surfaceTwo}; border:1px solid ${borderColor}; padding:12px; border-radius:8px; color:${textColor}; overflow-x:auto;"><code>${exampleTemplate}</code></pre>
      <p style="color:${textColor};">Upload saved files via the <strong>Import</strong> button. Valid templates appear in the Preset dropdown instantly.</p>
    `;

    const modal = document.createElement("div");
    modal.className = "lesson-modal";
    modal.style.zIndex = "1000";

    const modalContent = document.createElement("div");
    modalContent.className = "lesson-modal-content";

    const closeBtn = document.createElement("button");
    closeBtn.className = "close-btn";
    closeBtn.innerHTML = "&times;";
    modalContent.appendChild(closeBtn);

    const scrollRegion = document.createElement("div");
    scrollRegion.className = "import-docs";
    scrollRegion.style.overflowY = "auto";
    scrollRegion.style.maxHeight = "70vh";
    scrollRegion.innerHTML = bodyHtml;
    modalContent.appendChild(scrollRegion);

    const footer = document.createElement("div");
    footer.style.marginTop = "24px";
    footer.style.paddingTop = "16px";
    footer.style.borderTop = `1px solid ${this.theme.border}`;

    const footerButton = document.createElement("button");
    footerButton.className = "btn";
    footerButton.textContent = "CLOSE";
    footer.appendChild(footerButton);
    modalContent.appendChild(footer);

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    if (!document.querySelector("style#modal-styles")) {
      const style = document.createElement("style");
      style.id = "modal-styles";
      style.textContent = `
        .lesson-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.85);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          backdrop-filter: blur(8px);
        }
        .lesson-modal-content {
          background: var(--surface-1);
          border: 1px solid var(--border);
          padding: 32px;
          max-width: 800px;
          max-height: 85vh;
          overflow: hidden;
          color: var(--text);
          position: relative;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
          display: flex;
          flex-direction: column;
        }
        .lesson-modal-content h1,
        .lesson-modal-content h2 {
          color: var(--text-accent);
        }
        .lesson-modal-content pre {
          background: var(--surface-2);
          border: 1px solid var(--border);
          padding: 12px;
          border-radius: 8px;
          color: var(--text);
          overflow-x: auto;
        }
        .close-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          color: var(--text-muted);
          font-size: 18px;
          width: 36px;
          height: 36px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }
      `;
      document.head.appendChild(style);
    }

    const closeModal = () => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    };

    closeBtn.addEventListener("click", closeModal);
    footerButton.addEventListener("click", closeModal);
    modal.addEventListener("click", (evt) => {
      if (evt.target === modal) closeModal();
    });
  }

  showBanner(message, tone = 'info', duration = 3500) {
    if (!this.dom.errEl) return;
    this.dom.errEl.textContent = message;
    this.dom.errEl.dataset.tone = tone;
    this.dom.errEl.style.display = 'block';
    if (this._bannerTimer) clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => {
      this.dom.errEl.style.display = 'none';
    }, duration);
  }

  createLessonConfig() {
    return {
      1: {
        title: "Lesson 1: Basic Spikes",
        content:
          "Each neuron accumulates voltage over time. When it reaches threshold (v≥1), it fires a spike and resets to 0.",
        file: "lessons/lesson1.html",
      },
      2: {
        title: "Lesson 2: Synaptic Transmission",
        content:
          "Spikes travel along synapses (connections) between neurons, with varying weights affecting signal strength.",
        file: "lessons/lesson2.html",
      },
      3: {
        title: "Lesson 3: Network Plasticity",
        content:
          "Synaptic weights can change over time based on neural activity, enabling learning and adaptation.",
        file: "lessons/lesson3.html",
      },
      4: {
        title: "Lesson 4: Pattern Recognition",
        content:
          "SNNs can learn to recognize temporal patterns in spike trains, making them ideal for processing time-series data.",
        file: "lessons/lesson4.html",
      },
      5: {
        title: "Lesson 5: Network Topology",
        content:
          "Brain-like networks organize into clusters and modules, creating small-world properties that optimize both local processing and global communication.",
        file: "lessons/lesson5.html",
      },
      6: {
        title: "Lesson 6: Inhibition & Competition",
        content:
          "Inhibitory connections create competitive dynamics, enabling winner-take-all mechanisms crucial for attention and decision-making.",
        file: "lessons/lesson6.html",
      },
      7: {
        title: "Lesson 7: Multi-layer Processing",
        content:
          "Hierarchical networks extract increasingly complex features, similar to cortical organization in biological brains.",
        file: "lessons/lesson7.html",
      },
      8: {
        title: "Lesson 8: Memory Systems",
        content:
          "Different types of memory (working, long-term, episodic) emerge from distinct network architectures and plasticity rules.",
        file: "lessons/lesson8.html",
      },
      9: {
        title: "Lesson 9: Large-Scale Networks",
        content:
          "Brain-wide networks coordinate information integration, giving rise to global workspace dynamics and potentially consciousness.",
        file: "lessons/lesson9.html",
      },
      10: {
        title: "Lesson 10: Neural Oscillations",
        content:
          "Rhythmic neural activity coordinates processing across brain regions, enabling binding and temporal organization of information.",
        file: "lessons/lesson10.html",
      },
      11: {
        title: "Lesson 11: Brain Emulation Theory",
        content:
          "Whole brain emulation aims to create functional copies of specific brains, requiring advances in scanning, modeling, and computing.",
        file: "lessons/lesson11.html",
      },
      12: {
        title: "Lesson 12: Ethics & Future",
        content:
          "Digital minds raise profound questions about consciousness, identity, rights, and humanity's future that we must address responsibly.",
        file: "lessons/lesson12.html",
      },
    };
  }

  initLessons() {
    if (this.dom.lessonSelect) {
      this.dom.lessonSelect.addEventListener("change", (e) => {
        this.updateLesson(parseInt(e.target.value));
      });
    }

    this.updateLesson(1);
  }

  updateLesson(lessonNumber) {
    const lesson = this.lessonConfig[lessonNumber];

    if (lesson && this.dom.lessonContent) {
      const snippet = `
      <div class="lesson">
        <strong>${lesson.title}</strong><br />
        ${lesson.content}
        <button class="btn" style="margin-top: 8px; padding: 6px 12px; font-size: 12px;" onclick="window.snnVisualizer.showFullLesson(${lessonNumber})">View Full Lesson</button>
      </div>
    `;
      this.dom.lessonContent.innerHTML = this.applyThemeColorsToMarkup(snippet);
      // Make sure the info container is visible with correct styling
      const infoElement = document.getElementById("info");
      if (infoElement) {
        infoElement.style.display = "block";
        infoElement.style.position = "fixed";
        infoElement.style.right = "16px";
        infoElement.style.bottom = "16px";
        infoElement.style.maxWidth = "400px";
        infoElement.style.zIndex = "100";
        infoElement.style.background = this.theme.surface1;
        infoElement.style.border = `1px solid ${this.theme.border}`;
        infoElement.style.backdropFilter = "blur(12px)";
        infoElement.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.4)";
        infoElement.style.padding = "20px";
      }
    }
  }


  async showFullLesson(lessonNumber) {
    const lesson = this.lessonConfig[lessonNumber];

    if (!lesson) {
      console.error(`No content found for lesson ${lessonNumber}`);
      return;
    }

    const lessonHtml = await this.getLessonHtml(lessonNumber);
    if (!lessonHtml) {
      console.error(`Unable to load lesson ${lessonNumber}`);
      return;
    }

    const modal = document.createElement("div");
    modal.className = "lesson-modal";
    modal.style.zIndex = "1000";

    const modalContent = document.createElement("div");
    modalContent.className = "lesson-modal-content";

    const closeBtn = document.createElement("button");
    closeBtn.className = "close-btn";
    closeBtn.innerHTML = "&times;";
    modalContent.appendChild(closeBtn);

    const iframe = document.createElement("iframe");
    iframe.className = "lesson-frame";
    iframe.setAttribute("title", lesson.title);
    iframe.setAttribute("loading", "lazy");
    iframe.style.width = "100%";
    iframe.style.minHeight = "60vh";
    iframe.style.border = "none";
    iframe.style.background = "transparent";
    iframe.srcdoc = lessonHtml;
    modalContent.appendChild(iframe);

    const footer = document.createElement("div");
    footer.style.marginTop = "24px";
    footer.style.paddingTop = "16px";
    footer.style.borderTop = `1px solid ${this.theme.border}`;

    const footerButton = document.createElement("button");
    footerButton.className = "btn";
    footerButton.textContent = "CLOSE LESSON";
    footer.appendChild(footerButton);
    modalContent.appendChild(footer);

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    if (!document.querySelector("style#modal-styles")) {
      const style = document.createElement("style");
      style.id = "modal-styles";
      style.textContent = `
        .lesson-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.85);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          backdrop-filter: blur(8px);
        }
        .lesson-modal-content {
          background: var(--surface-1);
          border: 1px solid var(--border);
          padding: 32px;
          max-width: 800px;
          max-height: 85vh;
          overflow: hidden;
          color: var(--text);
          position: relative;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
          display: flex;
          flex-direction: column;
        }
        .lesson-modal-content iframe {
          flex: 1 1 auto;
          width: 100%;
          min-height: 60vh;
          border: none;
          background: transparent;
        }
        .close-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          color: var(--text-muted);
          font-size: 18px;
          width: 36px;
          height: 36px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }
      `;
      document.head.appendChild(style);
    }

    const closeModal = () => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
        document.removeEventListener("keydown", onKeyDown);
      }
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    closeBtn.addEventListener("click", closeModal);
    footerButton.addEventListener("click", closeModal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });
    document.addEventListener("keydown", onKeyDown);
  }

  async getLessonHtml(lessonNumber) {
    const cached = this.lessonCache.get(lessonNumber);
    if (cached) {
      return cached;
    }

    const lesson = this.lessonConfig[lessonNumber];
    if (!lesson) {
      return null;
    }

    if (lesson.file) {
      const fileHtml = await this.fetchLessonFile(lesson);
      if (fileHtml) {
        const themed = this.applyThemeColorsToMarkup(fileHtml);
        this.lessonCache.set(lessonNumber, themed);
        return themed;
      }
    }

    const fallback = this.getFullLessonContent(lessonNumber);
    if (fallback) {
      return this.wrapLessonContent(lesson.title, fallback);
    }

    return this.wrapLessonContent(
      lesson.title || `Lesson ${lessonNumber}`,
      '<p style="font-size: 16px;">Lesson content is currently unavailable.</p>'
    );
  }

  async fetchLessonFile(lesson) {
    if (!lesson || !lesson.file) {
      return null;
    }

    try {
      const response = await fetch(lesson.file, { cache: "no-store" });
      if (!response.ok) {
        console.warn(`Lesson file not found: ${lesson.file} (status ${response.status})`);
        return null;
      }
      const htmlText = await response.text();
      return this.normalizeLessonHtml(htmlText, lesson);
    } catch (error) {
      console.error(`Failed to load lesson file ${lesson.file}:`, error);
      return null;
    }
  }

  normalizeLessonHtml(htmlText, lesson) {
    if (!htmlText) {
      return null;
    }

    const trimmed = htmlText.trim();
    const hasHtmlTag = /<html[\s>]/i.test(trimmed);
    const baseHref = lesson && lesson.file ? new URL(lesson.file, window.location.href).href : window.location.href;

    if (hasHtmlTag) {
      if (/<head[\s>]/i.test(trimmed)) {
        if (!/<base/i.test(trimmed)) {
          const withBase = trimmed.replace(/<head([^>]*)>/i, `<head$1><base href="${baseHref}">`);
          return this.applyThemeColorsToMarkup(withBase);
        }
        return this.applyThemeColorsToMarkup(trimmed);
      }
      const injected = trimmed.replace(/<html([^>]*)>/i, `<html$1><head><base href="${baseHref}"></head>`);
      return this.applyThemeColorsToMarkup(injected);
    }

    return this.wrapLessonContent(lesson ? lesson.title : "Lesson", trimmed);
  }

  wrapLessonContent(title, bodyContent) {
    const safeTitle = title || "Lesson";
    const safeBody = bodyContent || '<p style="font-size: 16px;">Lesson content is currently unavailable.</p>';
    const themedHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${safeTitle}</title>
  <style>
    body {
      font-family: 'Inter', sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 24px;
      background: ${this.theme.surface2};
      color: ${this.theme.text};
    }
    h1, h2 {
      color: ${this.theme.accentPrimary};
      border-bottom: 2px solid ${this.theme.accentSubtle};
      padding-bottom: 10px;
    }
    h3 {
      color: ${this.theme.accentGlow};
      margin-top: 24px;
    }
    ul {
      padding-left: 20px;
    }
    li {
      margin: 8px 0;
    }
    strong {
      color: ${this.theme.textAccent};
    }
    code {
      background: ${this.theme.surface3};
      padding: 2px 6px;
      border-radius: 3px;
      color: ${this.theme.text2};
    }
  </style>
</head>
<body>
${safeBody}
</body>
</html>`;
    return this.applyThemeColorsToMarkup(themedHtml);
  }
  getFullLessonContent(lessonNumber) {
    const lessons = {
      1: `
        <h1 style="color: #ff9bf0; font-size: 28px; margin-bottom: 16px;">Lesson 1: Basic Spike Dynamics</h1>
        <p>Spiking Neural Networks (SNNs) use discrete spikes to communicate information, unlike traditional neural networks that use continuous values. This fundamental difference makes SNNs more biologically realistic and energy-efficient.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Key Concepts</h2>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Membrane Potential</h3>
        <p>The voltage inside a neuron that accumulates over time. In our simulation, this is represented by the <code style="background: #1e293b; padding: 4px 8px; border-radius: 4px; font-family: 'Courier New', monospace;">voltage</code> property of each neuron. As the neuron receives inputs from connected neurons, its membrane potential increases.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Threshold</h3>
        <p>When the membrane potential reaches this critical level (typically 1.0 in our simulation), the neuron fires a spike. This is the fundamental mechanism that determines when information is transmitted.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Spike Generation</h3>
        <p>A brief electrical pulse sent to all connected neurons when the threshold is reached. In our visualization, you can see this as the bright glow effect around firing neurons.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Reset Mechanism</h3>
        <p>After firing, the membrane potential returns to 0, preparing the neuron for the next accumulation cycle. This prevents continuous firing and creates the discrete nature of spikes.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Interactive Exploration</h2>
        <p>Try adjusting the following parameters to see how they affect spike dynamics:</p>
        <ul style="margin-left: 20px;">
          <li style="margin-bottom: 8px;"><strong style="color: #ff9bf0;">Network Size:</strong> More neurons create more complex spike patterns</li>
          <li style="margin-bottom: 8px;"><strong style="color: #ff9bf0;">Connection Probability:</strong> Higher values create more interconnected networks</li>
          <li style="margin-bottom: 8px;"><strong style="color: #ff9bf0;">Firing Rate:</strong> Controls how often neurons spontaneously fire</li>
          <li style="margin-bottom: 8px;"><strong style="color: #ff9bf0;">Spike Threshold:</strong> Lower values make neurons fire more easily</li>
        </ul>
        <p>Watch how spikes propagate through the network and create cascading patterns of activity!</p>
      `,
      2: `
        <h1 style="color: #ff9bf0; font-size: 28px; margin-bottom: 16px;">Lesson 2: Synaptic Transmission</h1>
        <p>Understanding how spikes travel between neurons and how synaptic weights affect signal transmission in spiking neural networks.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Synaptic Connections</h2>
        <p>In our visualization, you can see synapses as the thin grey lines connecting neurons. These connections have different strengths (weights) that determine how much voltage is transmitted when a spike occurs.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Connection Weights</h3>
        <p>Each synapse has a weight value between 0.1 and 1.0. Stronger connections (higher weights) transmit more voltage, making the receiving neuron more likely to fire.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Spike Propagation</h3>
        <p>When a neuron fires, it sends its spike to all connected neurons simultaneously. The receiving neurons add the weighted input to their membrane potential.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Network Clustering</h2>
        <p>Notice how neurons are organized into clusters with stronger internal connections and weaker connections between clusters. This creates interesting propagation patterns where activity tends to spread within clusters first.</p>
        
        <p><strong style="color: #ff9bf0;">Try this:</strong> Enable "Show Weights" to see detailed connection information for each neuron, and use "Inject Spike" to watch how activity propagates through the network.</p>
      `,
      3: `
        <h1 style="color: #ff9bf0; font-size: 28px; margin-bottom: 16px;">Lesson 3: Network Plasticity</h1>
        <p>How neural networks adapt and learn by modifying their synaptic connections over time.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Hebbian Learning</h2>
        <p>The fundamental principle "neurons that fire together, wire together" governs how connections strengthen when neurons are repeatedly active at the same time.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Synaptic Strengthening</h3>
        <p>When two connected neurons fire within a short time window, their synaptic connection becomes stronger, making future co-activation more likely.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Synaptic Weakening</h3>
        <p>Connections that are rarely used gradually weaken over time, allowing the network to forget unused patterns and focus on relevant information.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Homeostasis</h2>
        <p>Networks maintain stability through homeostatic mechanisms that prevent runaway excitation or complete silence, balancing learning with stable operation.</p>
        
        <p><strong style="color: #ff9bf0;">Observe:</strong> Watch how repeated activation patterns in our network create stronger pathways between frequently co-active neurons.</p>
      `,
      4: `
        <h1 style="color: #ff9bf0; font-size: 28px; margin-bottom: 16px;">Lesson 4: Pattern Recognition</h1>
        <p>How spiking neural networks excel at detecting and learning temporal patterns in spike trains.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Temporal Coding</h2>
        <p>Unlike rate coding, temporal coding uses the precise timing of spikes to encode information, allowing for much faster and more efficient computation.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Spike Time Dependent Plasticity</h3>
        <p>The timing between pre- and post-synaptic spikes determines whether connections strengthen or weaken, enabling learning of temporal sequences.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Feature Detection</h3>
               <p>Specialized neurons can learn to respond to specific temporal patterns, acting as feature detectors for complex spatiotemporal inputs.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Competition and Selection</h2>
        <p>Winner-take-all mechanisms ensure that only the most relevant patterns survive, creating selective responses to important features.</p>
        
        <p><strong style="color: #ff9bf0;">Experiment:</strong> Use the "Inject Spike" button to create different activation patterns and observe how they propagate through different clusters in unique ways.</p>
      `,
      5: `
        <h1 style="color: #ff9bf0; font-size: 28px; margin-bottom: 16px;">Lesson 5: Network Topology</h1>
        <p>Understanding how the organization and structure of neural networks affects information processing and computational capabilities.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Small-World Networks</h2>
        <p>Brain-like networks exhibit small-world properties: high local clustering combined with short path lengths between distant regions, optimizing both specialized processing and global integration.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Modularity</h3>
        <p>Networks organize into modules (clusters) with dense internal connections and sparse connections between modules, enabling specialized processing while maintaining coordination.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Hub Neurons</h3>
        <p>Highly connected neurons act as hubs, integrating information from multiple sources and facilitating communication across the network.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Hierarchical Structure</h2>
        <p>Multiple scales of organization from local circuits to global networks enable complex information processing and emergent behaviors.</p>
        
        <p><strong style="color: #ff9bf0;">Notice:</strong> Our visualization shows clustered organization where neurons within clusters are more densely connected than those between clusters.</p>
      `,
      6: `
        <h1 style="color: #ff9bf0; font-size: 28px; margin-bottom: 16px;">Lesson 6: Inhibition & Competition</h1>
        <p>How inhibitory mechanisms create selection, attention, and decision-making capabilities in neural networks.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Lateral Inhibition</h2>
        <p>Neighboring neurons suppress each other's activity, creating competitive dynamics that enhance contrast and selectivity in neural responses.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Winner-Take-All</h3>
        <p>Competition between neurons ensures that only the strongest signals survive, implementing selection and attention mechanisms crucial for focused processing.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Excitation-Inhibition Balance</h3>
        <p>The critical ratio between excitatory and inhibitory connections determines network dynamics, stability, and computational capabilities.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Attention Mechanisms</h2>
        <p>Inhibitory circuits can gate information flow, allowing networks to focus on relevant inputs while suppressing distracting information.</p>
        
        <p><strong style="color: #ff9bf0;">Experiment:</strong> Try adjusting the threshold parameter to see how it affects competitive dynamics between neurons and clusters.</p>
      `,
      7: `
        <h1 style="color: #ff9bf0; font-size: 28px; margin-bottom: 16px;">Lesson 7: Multi-layer Processing</h1>
        <p>How hierarchical neural networks extract increasingly complex features through multiple processing stages.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Feature Hierarchy</h2>
        <p>Each layer detects features of increasing complexity, from simple edges and patterns in early layers to complex objects and concepts in deeper layers.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Cortical Columns</h3>
        <p>Functional units that process specific aspects of input, organized in columnar structures that work together to analyze complex patterns.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Feed-forward and Feedback</h3>
        <p>Information flows both bottom-up (sensory input) and top-down (predictions and context), enabling sophisticated processing and learning.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Abstraction Levels</h2>
        <p>Progressive abstraction from concrete sensory data to high-level concepts enables flexible and generalizable representations.</p>
        
        <p><strong style="color: #ff9bf0;">Observe:</strong> Notice how activity patterns in our network create hierarchical processing as signals propagate through connected clusters.</p>
      `,
      8: `
        <h1 style="color: #ff9bf0; font-size: 28px; margin-bottom: 16px;">Lesson 8: Memory Systems</h1>
        <p>How different types of memory emerge from distinct neural network architectures and plasticity mechanisms.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Working Memory</h2>
        <p>Temporary storage through persistent neural activity, maintaining information in active states for immediate use in cognitive tasks.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Long-term Memory</h3>
        <p>Stable information storage through permanent changes in synaptic strengths, enabling retention of knowledge and experiences over time.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Episodic Memory</h3>
        <p>Time-linked sequences of events stored as patterns of neural activity, enabling recall of specific experiences and their temporal context.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Associative Memory</h2>
        <p>Pattern completion and recall mechanisms that retrieve complete memories from partial cues, enabling flexible and robust memory access.</p>
        
        <p><strong style="color: #ff9bf0;">Watch:</strong> Observe how persistent activity in our network clusters creates memory-like behavior where patterns can be sustained over time.</p>
      `,
      9: `
        <h1 style="color: #ff9bf0; font-size: 28px; margin-bottom: 16px;">Lesson 9: Large-Scale Networks</h1>
        <p>How brain-wide coordination enables higher-order cognitive functions and potentially consciousness.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Global Workspace</h2>
        <p>Conscious access through global broadcasting of information across brain networks, enabling integration and flexible cognitive control.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Default Mode Network</h3>
        <p>Resting state activity patterns that maintain global connectivity and prepare the brain for future cognitive demands.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Information Integration</h3>
        <p>Binding of distributed processing across brain regions to create unified perceptual and cognitive experiences.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Critical Dynamics</h2>
        <p>Networks operating at the edge of chaos exhibit optimal information processing, flexibility, and computational capabilities.</p>
        
        <p><strong style="color: #ff9bf0;">Observe:</strong> Watch how activity spreads across the entire network, demonstrating global integration of distributed processing.</p>
      `,
      10: `
        <h1 style="color: #ff9bf0; font-size: 28px; margin-bottom: 16px;">Lesson 10: Neural Oscillations</h1>
        <p>How rhythmic neural activity coordinates processing across brain regions and enables temporal organization.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Gamma Rhythms</h2>
        <p>High-frequency oscillations (30-100 Hz) that coordinate local processing, attention, and conscious awareness within brain regions.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Alpha and Beta Rhythms</h3>
        <p>Medium-frequency oscillations (8-30 Hz) that facilitate communication between brain regions and regulate information flow.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Theta Rhythms</h3>
        <p>Low-frequency oscillations (4-8 Hz) crucial for memory formation, spatial navigation, and temporal sequence encoding.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Phase Coupling</h2>
        <p>Synchronization of oscillations across brain regions enables temporal coordination and binding of distributed processing.</p>
        
        <p><strong style="color: #ff9bf0;">Look for:</strong> Rhythmic patterns in the voltage traces and synchronized activity between connected neurons in our simulation.</p>
      `,
      11: `
        <h1 style="color: #ff9bf0; font-size: 28px; margin-bottom: 16px;">Lesson 11: Brain Emulation Theory</h1>
        <p>The ultimate goal of computational neuroscience: creating complete functional copies of biological brains.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Whole Brain Emulation</h2>
        <p>Creating digital copies of specific brains that preserve individual personality, memories, and cognitive patterns through detailed neural simulation.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Scanning Technology</h3>
        <p>Advanced imaging techniques needed to map every neuron, synapse, and molecular detail with sufficient resolution for functional reconstruction.</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Computational Requirements</h3>
        <p>Enormous processing power and storage needed to simulate 86 billion neurons and 100 trillion synapses in real-time with biological accuracy.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Technical Challenges</h2>
        <p>Scaling from current small-scale simulations to full brain complexity while maintaining speed, accuracy, and biological fidelity.</p>
        
        <p><strong style="color: #ff9bf0;">Foundation:</strong> Our simple network demonstrates the basic principles that must scale up millions of times for complete brain emulation.</p>
      `,
      12: `
        <h1 style="color: #ff9bf0; font-size: 28px; margin-bottom: 16px;">Lesson 12: Ethics & Future</h1>
        <p>The profound philosophical and ethical questions raised by the possibility of creating digital minds.</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Consciousness Questions</h2>
        <p>Would a perfect neural simulation be conscious? How could we determine consciousness in digital minds, and what are the implications?</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Identity and Continuity</h3>
        <p>What makes you "you" - is it the pattern of neural activity, the physical substrate, or something else? Could there be multiple copies of the same person?</p>
        
        <h3 style="color: #ff9bf0; margin-top: 24px;">Rights and Protections</h3>
        <p>If digital minds are conscious, what rights should they have? Protection from suffering, deletion, unwanted modification, or forced labor?</p>
        
        <h2 style="color: #ff9bf0; font-size: 22px; margin-top: 24px; margin-bottom: 12px;">Our Responsibility</h2>
        <p>As creators of potentially conscious digital minds, we have profound moral obligations to consider their wellbeing, rights, and place in society.</p>
        
        <p><strong style="color: #ff9bf0;">Critical Thinking:</strong> These questions require careful consideration as we advance toward more sophisticated neural simulations and potential digital consciousness.</p>
      `,
    };

    return lessons[lessonNumber] || null;
  }

  animate() {
    // Animation loop only; all event bindings belong in bindUI()
    requestAnimationFrame(() => this.animate());

    this.updateCameraPosition();

    // Update bottom status text
    if (this.dom.statusText) {
      const zoom = (1800 / this.camera.distance).toFixed(2);
      this.dom.statusText.textContent = `CAM: ${Math.round(this.camera.distance)} | ZOOM: ${zoom}x | NEURONS: ${this.neurons.length}`;
    }

    if (this.state.isRunning) {
      this.updateNetwork();
    }

    this.render();
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  if (typeof THREE === "undefined") {
    console.warn("THREE.js not found, using fallback");
  }

  try {
    new SNNVisualizer();
  } catch (error) {
    console.error("Failed to initialize SNN Visualizer:", error);
    const errEl = document.getElementById("err");
    if (errEl) {
      errEl.textContent = "Failed to initialize neural network visualization.";
      errEl.style.display = "block";
    }
  }
});

// Remove emergency fallback - it causes the wrong style flash










