import { useEffect, useRef } from "react";

/**
 * NodesAnimation - React port dari Nodes-Connect-Animation
 * https://github.com/hisyamyasidp/Nodes-Connect-Animation
 *
 * Canvas animation: titik-titik hexagonal saling konek, ikut cursor mouse,
 * dengan spring physics + organic noise per-node.
 */
const NodesAnimation = ({ className = "" }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const circle = Math.PI * 2;
    let nodes = [];
    const mouse = { x: -9999, y: -9999 };
    let NODE_QUANTITY = 0;
    let animFrameId;
    let isDestroyed = false;

    // === CONFIG (sama persis dari main.js kamu) ===
    const SENSITIVITY = 140;
    const SIBLINGS_LIMIT = 7;
    const DENSITY = 70;
    const ANCHOR_LENGTH = 24;
    const MOUSE_RADIUS = 220;
    const CENTER_AREA_RATIO = 0.55;
    const HEX_SIZE = 64;

    let shapeOffsetX = 0, shapeOffsetY = 0;
    let shapeVelX = 0, shapeVelY = 0;
    let originalCenterX = 0, originalCenterY = 0;
    const SPRING_STRENGTH = 0.12;   // lebih rendah = gerakan lebih lambat & smooth
    const SPRING_DAMPING = 0.28;    // lebih tinggi = lebih cepat berhenti, tidak boing
    const MAX_DRIFT = 300;

    const STRETCH_AMOUNT = 5;
    const STRETCH_SPEED_CAP = 30;

    const NODE_SPRING_STRENGTH = 0.22;  // lebih rendah = node tidak over-shoot
    const NODE_DAMPING = 0.38;           // lebih tinggi = berhenti lebih cepat
    const WOBBLE_AMOUNT = 1.5;           // dikurangi biar tidak goyang berlebihan

    const NOISE_AMOUNT = 50;
    const NOISE_SPEED_MIN = 0.6;
    const NOISE_SPEED_MAX = 1.1;

    // === NODE ===
    function Node(x, y) {
      this.anchorX = x;
      this.anchorY = y;
      this.x = x + (Math.random() * 2 - 1) * ANCHOR_LENGTH;
      this.y = y + (Math.random() * 2 - 1) * ANCHOR_LENGTH;
      this.vx = 0;
      this.vy = 0;
      this.wobbleSeed = Math.random() * 1000;
      this.radius = 2.5 + Math.random() * 3;
      this.siblings = [];
      this.brightness = 0;
      this.noisePhaseX = Math.random() * Math.PI * 2;
      this.noisePhaseY = Math.random() * Math.PI * 2;
      this.noiseSpeedX = NOISE_SPEED_MIN + Math.random() * (NOISE_SPEED_MAX - NOISE_SPEED_MIN);
      this.noiseSpeedY = NOISE_SPEED_MIN + Math.random() * (NOISE_SPEED_MAX - NOISE_SPEED_MIN);
      this.noiseAmp = 0.6 + Math.random() * 0.8;
    }

    Node.prototype.drawNode = function () {
      const alpha = 0.25 + 0.75 * this.brightness;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, circle);
      ctx.fillStyle = "rgba(255, 255, 255, " + alpha + ")";
      ctx.fill();
    };

    Node.prototype.drawLine = function () {
      for (let i = 0; i < this.siblings.length; i++) {
        const partner = this.siblings[i];
        const dist = calcDistance(this, partner);
        const alpha = 0.08 + 0.5 * (1 - dist / SENSITIVITY);
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(partner.x, partner.y);
        ctx.lineWidth = 1.5 - dist / SENSITIVITY;
        ctx.strokeStyle = "rgba(160, 130, 255, " + alpha + ")";
        ctx.stroke();
      }
    };

    Node.prototype.moveToMouse = function (dt) {
      const noise = NOISE_AMOUNT * this.noiseAmp;
      const noiseX = Math.sin(this.noisePhaseX) * noise;
      const noiseY = Math.sin(this.noisePhaseY) * noise;
      this.noisePhaseX += this.noiseSpeedX * dt * 0.001;
      this.noisePhaseY += this.noiseSpeedY * dt * 0.001;

      const targetX = this.anchorX + shapeOffsetX + noiseX;
      const targetY = this.anchorY + shapeOffsetY + noiseY;

      const wobble = Math.sin(Date.now() * 0.004 + this.wobbleSeed) * WOBBLE_AMOUNT;
      const ax = (targetX - this.x) * NODE_SPRING_STRENGTH + wobble * 0.5;
      const ay = (targetY - this.y) * NODE_SPRING_STRENGTH + wobble * 0.5;

      this.vx = (this.vx + ax) * (1 - NODE_DAMPING);
      this.vy = (this.vy + ay) * (1 - NODE_DAMPING);

      this.x += this.vx * (dt / 16);
      this.y += this.vy * (dt / 16);
    };

    function calcDistance(a, b) {
      return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function resizeCanvas() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      originalCenterX = canvas.width / 2;
      originalCenterY = canvas.height / 2;
      shapeOffsetX = 0;
      shapeOffsetY = 0;
      shapeVelX = 0;
      shapeVelY = 0;
      initNodes();
    }

    function hexGridInCircle(cx, cy, hexSize, radius) {
      const points = [];
      const cols = Math.ceil(radius / (hexSize * 0.75)) + 2;
      const rows = Math.ceil(radius / (hexSize * Math.sqrt(3) / 2)) + 2;
      for (let q = -cols; q <= cols; q++) {
        for (let r = -rows; r <= rows; r++) {
          const x = hexSize * (3 / 2 * q);
          const y = hexSize * (Math.sqrt(3) * r + (Math.sqrt(3) / 2 * q));
          if (Math.hypot(x, y) <= radius) points.push([cx + x, cy + y]);
        }
      }
      return points;
    }

    function initNodes() {
      nodes = [];
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const shorter = Math.min(canvas.width, canvas.height);
      const baseRadius = shorter * CENTER_AREA_RATIO;

      const pts = hexGridInCircle(cx, cy, HEX_SIZE, baseRadius);
      for (const [x, y] of pts) nodes.push(new Node(x, y));

      // Extra random nodes di lingkaran luar
      const outer = shorter * 0.48;
      NODE_QUANTITY = Math.floor((canvas.width * canvas.height) / (DENSITY * DENSITY));
      const extra = Math.max(0, NODE_QUANTITY - nodes.length);
      for (let i = 0; i < extra; i++) {
        const angle = Math.random() * circle;
        const r = baseRadius + Math.random() * (outer - baseRadius);
        nodes.push(new Node(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r));
      }
    }

    function findSiblings() {
      for (const node of nodes) node.siblings = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dist = calcDistance(nodes[i], nodes[j]);
          if (dist < SENSITIVITY) {
            if (nodes[i].siblings.length < SIBLINGS_LIMIT)
              nodes[i].siblings.push(nodes[j]);
            if (nodes[j].siblings.length < SIBLINGS_LIMIT)
              nodes[j].siblings.push(nodes[i]);
          }
        }
      }
    }

    function updateBrightness() {
      for (const node of nodes) {
        const d = calcDistance(node, mouse);
        node.brightness = d < MOUSE_RADIUS ? 1 - d / MOUSE_RADIUS : 0;
      }
    }

    let lastTime = performance.now();
    function render(now) {
      if (isDestroyed) return;
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;

      // Shape chase spring
      const mdx = mouse.x - (originalCenterX + shapeOffsetX);
      const mdy = mouse.y - (originalCenterY + shapeOffsetY);
      const dist = Math.hypot(mdx, mdy);
      const pull = Math.min(dist, MAX_DRIFT) / (dist || 1);
      const ax = mdx * pull * SPRING_STRENGTH;
      const ay = mdy * pull * SPRING_STRENGTH;
      shapeVelX = (shapeVelX + ax) * (1 - SPRING_DAMPING);
      shapeVelY = (shapeVelY + ay) * (1 - SPRING_DAMPING);

      // Stretch deformasi
      const speed = Math.hypot(shapeVelX, shapeVelY);
      const stretchFactor = Math.min(speed / STRETCH_SPEED_CAP, 1) * STRETCH_AMOUNT;
      const stretchAngle = Math.atan2(shapeVelY, shapeVelX);

      shapeOffsetX += shapeVelX * (dt / 16);
      shapeOffsetY += shapeVelY * (dt / 16);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const node of nodes) node.moveToMouse(dt);

      findSiblings();
      updateBrightness();

      for (const node of nodes) {
        node.drawLine();
        node.drawNode();
      }

      animFrameId = requestAnimationFrame(render);
    }

    // === EVENTS ===
    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onMouseLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };
    const onTouchMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.touches[0].clientX - rect.left;
      mouse.y = e.touches[0].clientY - rect.top;
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });

    const resizeObserver = new ResizeObserver(() => resizeCanvas());
    resizeObserver.observe(canvas);

    resizeCanvas();
    animFrameId = requestAnimationFrame(render);

    return () => {
      isDestroyed = true;
      cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      canvas.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ display: "block" }}
    />
  );
};

export default NodesAnimation;
