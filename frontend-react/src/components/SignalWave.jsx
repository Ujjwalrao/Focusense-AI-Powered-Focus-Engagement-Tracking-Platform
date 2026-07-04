import { useEffect, useRef } from "react";

/**
 * SignalWave — Focusense ka signature visual element.
 *
 * Kya hai: ek oscilloscope jaisi scrolling waveform. Idle mode me
 * (landing page hero) yeh ambient breathing motion dikhata hai — jaise
 * koi instrument "on" hai aur signal padh raha hai. "live" mode me
 * (dashboard) yeh actual engagement score (0-100) se driven hota hai —
 * jab score badhta hai, wave amplitude badhta hai; jab girta hai, flat
 * ho jaata hai. Yeh literally "attention ka signal" ko visualize karta hai.
 *
 * Kyun canvas: 60fps par smooth scrolling line ke liye SVG re-render se
 * kaafi zyada efficient hai — ek hi <canvas>, poora kaam GPU-friendly
 * 2D context draws se hota hai.
 */
export default function SignalWave({
  value = null,           // 0-100 ya null (null = idle ambient mode)
  color = "#FFB020",
  echoColor = "rgba(94,234,212,0.35)",
  height = 160,
  className = "",
}) {
  const canvasRef = useRef(null);
  const historyRef = useRef(new Array(140).fill(30));
  const phaseRef = useRef(0);
  const valueRef = useRef(value);

  // Latest prop value ko ref me rakhte hain taaki animation loop ke
  // andar stale closure na bane — loop khud recreate nahi hota har render pe
  useEffect(() => { valueRef.current = value; }, [value]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf;
    let width = canvas.clientWidth;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      width = canvas.clientWidth;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    }
    resize();
    window.addEventListener("resize", resize);

    function drawPath(points, strokeStyle, lineWidth, glow) {
      ctx.beginPath();
      const stepX = width / (points.length - 1);
      points.forEach((v, i) => {
        const x = i * stepX;
        const y = height / 2 - (v - 50) * (height / 130);
        if (i === 0) ctx.moveTo(x, y);
        else {
          const prevX = (i - 1) * stepX;
          const prevY = height / 2 - (points[i - 1] - 50) * (height / 130);
          const cx = (prevX + x) / 2;
          ctx.quadraticCurveTo(prevX, prevY, cx, (prevY + y) / 2);
        }
      });
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (glow) {
        ctx.shadowColor = strokeStyle;
        ctx.shadowBlur = 14;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.stroke();
    }

    function tick() {
      phaseRef.current += 0.045;
      const hist = historyRef.current;

      let target;
      if (valueRef.current === null) {
        // Idle ambient breathing: do sine waves overlap + halka noise
        target = 46 + Math.sin(phaseRef.current) * 14 + Math.sin(phaseRef.current * 2.7) * 5 + (Math.random() - 0.5) * 4;
      } else {
        // Live mode: target ko smoothly follow karo (koi sudden jump nahi)
        const noise = (Math.random() - 0.5) * 3;
        target = valueRef.current + noise;
      }

      const last = hist[hist.length - 1];
      const smoothed = last + (target - last) * 0.25;
      hist.push(smoothed);
      hist.shift();

      ctx.clearRect(0, 0, width, height);

      // Faint echo line (cyan) — thoda delayed/offset copy, depth ke liye
      const echo = hist.map((v, i) => hist[Math.max(0, i - 8)] ?? v);
      drawPath(echo, echoColor, 1.5, false);

      // Main signal line (amber), glow ke saath
      drawPath(hist, color, 2.2, true);

      // Leading edge pulse dot
      const lastX = width - width / (hist.length - 1);
      const lastY = height / 2 - (hist[hist.length - 1] - 50) * (height / 130);
      ctx.beginPath();
      ctx.arc(lastX, lastY, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fill();

      raf = requestAnimationFrame(tick);
    }
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color, echoColor, height]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: `${height}px`, display: "block" }}
      aria-hidden="true"
    />
  );
}
