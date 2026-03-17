const express = require("express");
const si      = require("systeminformation");
const os      = require("os");

const app  = express();
const PORT = 8080;

app.get("/api/stats", async (req, res) => {
  try {
    const [cpu, mem, disk, net, load, temp, time] = await Promise.all([
      si.cpu(), si.mem(), si.fsSize(), si.networkInterfaces(),
      si.currentLoad(), si.cpuTemperature(), si.time(),
    ]);
    const primaryDisk = disk.find(d => d.mount === "/" || d.mount === "C:") || disk[0] || {};
    const primaryNet  = (Array.isArray(net) ? net : [net]).find(n => n && !n.internal && n.ip4) || {};
    res.json({
      hostname:   os.hostname(),
      osType:     os.type(),
      kernel:     os.release(),
      arch:       os.arch(),
      platform:   os.platform(),
      cpuBrand:   `${cpu.manufacturer} ${cpu.brand}`.trim(),
      cpuCores:   cpu.physicalCores,
      cpuThreads: cpu.cores,
      cpuSpeed:   cpu.speed,
      cpuLoad:    Math.round(load.currentLoad),
      cpuTemp:    temp.main ?? null,
      memTotal:   mem.total,
      memUsed:    mem.active,
      memFree:    mem.free,
      memPct:     Math.round((mem.active / mem.total) * 100),
      diskTotal:  primaryDisk.size  || 0,
      diskUsed:   primaryDisk.used  || 0,
      diskPct:    Math.round(primaryDisk.use) || 0,
      ip:         primaryNet.ip4    || "N/A",
      netIface:   primaryNet.iface  || "N/A",
      uptime:     os.uptime(),
      nodeVer:    process.version,
      timezone:   time.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/", (_req, res) => { res.setHeader("Content-Type","text/html;charset=utf-8"); res.end(HTML); });

app.listen(PORT, () => {
  console.log(`\n  ┌──────────────────────────────────┐`);
  console.log(`  │  SysWatch  ·  port ${PORT}            │`);
  console.log(`  │  http://localhost:${PORT}             │`);
  console.log(`  │  Host: ${os.hostname().padEnd(24)}│`);
  console.log(`  └──────────────────────────────────┘\n`);
});

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SysWatch</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
:root{
  --bg:   #07090f;
  --s1:   #0d1018;
  --s2:   #111520;
  --s3:   #171c28;
  --bd:   rgba(148,163,184,0.1);
  --bd2:  rgba(148,163,184,0.05);
  --tx:   #e2e8f0;
  --tx2:  #94a3b8;
  --tx3:  #4a5c72;

  /* Fresh palette — teal/cyan + violet + amber + rose */
  --cy:   #06c8b4;   /* teal-cyan   — CPU  */
  --vi:   #a78bfa;   /* soft violet — MEM  */
  --am:   #fbbf24;   /* amber       — DISK */
  --ro:   #fb7185;   /* rose        — TEMP */

  --mono: 'DM Mono',monospace;
  --sans: 'DM Sans',sans-serif;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{font-size:13px;-webkit-font-smoothing:antialiased}
body{background:var(--bg);color:var(--tx);font-family:var(--mono);min-height:100vh}

/* ── NAV ── */
nav{
  height:50px;background:var(--s1);border-bottom:1px solid var(--bd);
  display:flex;align-items:center;justify-content:space-between;
  padding:0 28px;position:sticky;top:0;z-index:100;
}
.brand{display:flex;align-items:center;gap:9px;font-family:var(--sans);font-weight:700;font-size:0.95rem;color:var(--tx)}
.brand-sq{
  width:24px;height:24px;border-radius:6px;
  background:linear-gradient(135deg,var(--cy),#0891b2);
  display:flex;align-items:center;justify-content:center;
  font-size:0.75rem;color:#fff;font-weight:700;
}
.nav-r{display:flex;align-items:center;gap:14px}
.pill{
  display:flex;align-items:center;gap:6px;
  background:rgba(6,200,180,0.08);border:1px solid rgba(6,200,180,0.22);
  border-radius:20px;padding:4px 12px;font-size:0.65rem;letter-spacing:.1em;color:var(--cy);
}
.dot{width:5px;height:5px;background:var(--cy);border-radius:50%;box-shadow:0 0 6px var(--cy);animation:blink 2s ease-in-out infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
#clk{font-size:0.75rem;color:var(--tx2);letter-spacing:.05em;min-width:66px;text-align:right}

/* ── LAYOUT ── */
.wrap{max-width:1140px;margin:0 auto;padding:22px 22px 48px}
@keyframes up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}

/* ── HOST BAR ── */
.hbar{
  background:var(--s1);border:1px solid var(--bd);border-radius:10px;
  padding:18px 24px;margin-bottom:16px;
  display:flex;align-items:center;justify-content:space-between;gap:12px;
  animation:up .45s ease both;
}
.hb-l{display:flex;align-items:center;gap:14px}
.hb-ico{
  width:42px;height:42px;background:var(--s3);border:1px solid var(--bd);
  border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;
}
.hb-name{font-family:var(--sans);font-size:1.35rem;font-weight:700;letter-spacing:-.02em;color:var(--tx)}
.hb-sub{margin-top:3px;font-size:0.68rem;color:var(--tx2)}
.hb-sub em{color:var(--cy);font-style:normal;font-weight:500}
.hb-r{display:flex;gap:26px}
.hm{text-align:right}
.hm-l{font-size:0.58rem;text-transform:uppercase;letter-spacing:.14em;color:var(--tx3);margin-bottom:3px}
.hm-v{font-size:0.85rem;font-weight:600;color:var(--tx)}

/* ── KPIs ── */
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin-bottom:16px}
.kpi{
  background:var(--s1);border:1px solid var(--bd);border-radius:10px;
  padding:17px 19px;position:relative;overflow:hidden;
  animation:up .45s ease both;transition:border-color .2s,transform .15s;cursor:default;
}
.kpi:hover{border-color:rgba(148,163,184,.18);transform:translateY(-1px)}
.kpi-glow{position:absolute;top:-16px;right:-16px;width:72px;height:72px;border-radius:50%;filter:blur(28px);opacity:.2;pointer-events:none}
.kpi-lbl{font-size:0.58rem;text-transform:uppercase;letter-spacing:.16em;color:var(--tx3);margin-bottom:9px}
.kpi-val{font-family:var(--sans);font-size:2rem;font-weight:700;line-height:1;letter-spacing:-.03em}
.kpi-sub{margin-top:5px;font-size:0.63rem;color:var(--tx2)}
.kpi-trk{margin-top:13px;height:2px;background:rgba(255,255,255,0.05);border-radius:2px;overflow:hidden}
.kpi-fill{height:100%;border-radius:2px;transition:width .9s cubic-bezier(.4,0,.2,1)}
.kpi:nth-child(1){animation-delay:.04s}.kpi:nth-child(2){animation-delay:.08s}
.kpi:nth-child(3){animation-delay:.12s}.kpi:nth-child(4){animation-delay:.16s}
/* per-color */
.cy .kpi-val{color:var(--cy)} .cy .kpi-glow{background:var(--cy)} .cy .kpi-fill{background:var(--cy)}
.vi .kpi-val{color:var(--vi)} .vi .kpi-glow{background:var(--vi)} .vi .kpi-fill{background:var(--vi)}
.am .kpi-val{color:var(--am)} .am .kpi-glow{background:var(--am)} .am .kpi-fill{background:var(--am)}
.ro .kpi-val{color:var(--ro)} .ro .kpi-glow{background:var(--ro)} .ro .kpi-fill{background:var(--ro)}

/* ── CHARTS ── */
.charts{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-bottom:16px}
.cc{background:var(--s1);border:1px solid var(--bd);border-radius:10px;padding:18px 20px;animation:up .45s ease both .2s}
.cc-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px}
.cc-lbl{font-size:0.58rem;text-transform:uppercase;letter-spacing:.16em;color:var(--tx2);margin-bottom:2px}
.cc-sub{font-size:0.6rem;color:var(--tx3)}
.cc-val{font-family:var(--sans);font-size:1.45rem;font-weight:700;letter-spacing:-.02em;line-height:1;text-align:right}
.cc-avg{font-size:0.6rem;color:var(--tx2);text-align:right;margin-top:2px}
.cc-wrap{height:128px;position:relative}

/* ── INFO ── */
.infos{display:grid;grid-template-columns:1fr 1fr;gap:13px}
.ic{background:var(--s1);border:1px solid var(--bd);border-radius:10px;padding:18px 20px;animation:up .45s ease both .28s}
.ic-lbl{font-size:0.58rem;text-transform:uppercase;letter-spacing:.16em;color:var(--tx2);
  margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--bd2)}
.ir{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--bd2)}
.ir:last-child{border-bottom:none}
.ir-k{font-size:0.66rem;color:var(--tx2)}
.ir-v{font-size:0.7rem;font-weight:500;color:var(--tx);text-align:right;max-width:60%;word-break:break-all}
.chip{display:inline-block;padding:2px 8px;border-radius:4px;font-size:0.6rem;font-weight:600;letter-spacing:.04em}
.c-cy{background:rgba(6,200,180,.1);color:var(--cy);border:1px solid rgba(6,200,180,.22)}
.c-vi{background:rgba(167,139,250,.1);color:var(--vi);border:1px solid rgba(167,139,250,.2)}
.c-am{background:rgba(251,191,36,.1);color:var(--am);border:1px solid rgba(251,191,36,.2)}

footer{text-align:center;padding:18px 0 0;font-size:0.6rem;color:var(--tx3);letter-spacing:.08em}
</style>
</head>
<body>
<nav>
  <div class="brand"><div class="brand-sq">S</div>SysWatch</div>
  <div class="nav-r">
    <div class="pill"><div class="dot"></div>LIVE</div>
    <div id="clk"></div>
  </div>
</nav>

<div class="wrap">

  <div class="hbar">
    <div class="hb-l">
      <div class="hb-ico">🖥</div>
      <div>
        <div class="hb-name" id="h-name">···</div>
        <div class="hb-sub" id="h-sub">···</div>
      </div>
    </div>
    <div class="hb-r">
      <div class="hm"><div class="hm-l">Uptime</div>   <div class="hm-v" id="h-up">···</div></div>
      <div class="hm"><div class="hm-l">IP Address</div><div class="hm-v" id="h-ip">···</div></div>
      <div class="hm"><div class="hm-l">Node.js</div>  <div class="hm-v" id="h-nd">···</div></div>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi cy"><div class="kpi-glow"></div>
      <div class="kpi-lbl">CPU Load</div>
      <div class="kpi-val" id="k-cpu">--%</div>
      <div class="kpi-sub" id="k-cpu-s">···</div>
      <div class="kpi-trk"><div class="kpi-fill" id="b-cpu" style="width:0%"></div></div>
    </div>
    <div class="kpi vi"><div class="kpi-glow"></div>
      <div class="kpi-lbl">Memory</div>
      <div class="kpi-val" id="k-mem">--%</div>
      <div class="kpi-sub" id="k-mem-s">···</div>
      <div class="kpi-trk"><div class="kpi-fill" id="b-mem" style="width:0%"></div></div>
    </div>
    <div class="kpi am"><div class="kpi-glow"></div>
      <div class="kpi-lbl">Disk</div>
      <div class="kpi-val" id="k-dsk">--%</div>
      <div class="kpi-sub" id="k-dsk-s">···</div>
      <div class="kpi-trk"><div class="kpi-fill" id="b-dsk" style="width:0%"></div></div>
    </div>
    <div class="kpi ro"><div class="kpi-glow"></div>
      <div class="kpi-lbl">CPU Temp</div>
      <div class="kpi-val" id="k-tmp">--°</div>
      <div class="kpi-sub" id="k-tmp-s">main sensor</div>
      <div class="kpi-trk"><div class="kpi-fill" id="b-tmp" style="width:0%"></div></div>
    </div>
  </div>

  <div class="charts">
    <div class="cc">
      <div class="cc-head">
        <div><div class="cc-lbl">CPU Load — 30s History</div><div class="cc-sub" id="cd-cpu">collecting data…</div></div>
        <div><div class="cc-val" id="cc-cpu" style="color:var(--cy)">0%</div><div class="cc-avg" id="ca-cpu"></div></div>
      </div>
      <div class="cc-wrap"><canvas id="cChart"></canvas></div>
    </div>
    <div class="cc">
      <div class="cc-head">
        <div><div class="cc-lbl">Memory — 30s History</div><div class="cc-sub" id="cd-mem">collecting data…</div></div>
        <div><div class="cc-val" id="cc-mem" style="color:var(--vi)">0%</div><div class="cc-avg" id="ca-mem"></div></div>
      </div>
      <div class="cc-wrap"><canvas id="mChart"></canvas></div>
    </div>
  </div>

  <div class="infos">
    <div class="ic">
      <div class="ic-lbl">Operating System</div>
      <div class="ir"><span class="ir-k">Hostname</span>    <span class="ir-v" id="i-hn">···</span></div>
      <div class="ir"><span class="ir-k">OS Type</span>     <span class="ir-v" id="i-os">···</span></div>
      <div class="ir"><span class="ir-k">Kernel</span>      <span class="ir-v" id="i-kr">···</span></div>
      <div class="ir"><span class="ir-k">Architecture</span><span class="ir-v" id="i-ar">···</span></div>
      <div class="ir"><span class="ir-k">Platform</span>    <span class="ir-v" id="i-pl">···</span></div>
      <div class="ir"><span class="ir-k">Timezone</span>    <span class="ir-v" id="i-tz">···</span></div>
    </div>
    <div class="ic">
      <div class="ic-lbl">Hardware &amp; Network</div>
      <div class="ir"><span class="ir-k">CPU Model</span>      <span class="ir-v" id="i-cm">···</span></div>
      <div class="ir"><span class="ir-k">Cores / Threads</span><span class="ir-v" id="i-ct">···</span></div>
      <div class="ir"><span class="ir-k">CPU Speed</span>      <span class="ir-v" id="i-cs">···</span></div>
      <div class="ir"><span class="ir-k">Total RAM</span>      <span class="ir-v" id="i-rm">···</span></div>
      <div class="ir"><span class="ir-k">Interface</span>      <span class="ir-v" id="i-if">···</span></div>
      <div class="ir"><span class="ir-k">IP Address</span>     <span class="ir-v" id="i-ip">···</span></div>
    </div>
  </div>
</div>
<footer>SysWatch · Node.js · auto-refresh every 5s</footer>

<script>
const N  = 30;
const $  = id => document.getElementById(id);
const gb = b  => (b/1024**3).toFixed(1)+' GB';
const upfmt = s => {
  const d=Math.floor(s/86400),h=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60);
  return [d&&d+'d',h&&h+'h',m+'m'].filter(Boolean).join(' ');
};

// Clock
const tick = () => $('clk').textContent = new Date().toLocaleTimeString('en-GB');
tick(); setInterval(tick,1000);

// ── Chart factory ─────────────────────────────────────────────────────────────
function makeChart(canvasId, hexColor) {
  const canvas = $(canvasId);
  const ctx    = canvas.getContext('2d');

  // Build gradient fresh after canvas has layout
  function getGrad() {
    const h = canvas.offsetHeight || 128;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0,   hexColor + '38');
    g.addColorStop(0.5, hexColor + '10');
    g.addColorStop(1,   hexColor + '00');
    return g;
  }

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: Array(N).fill(''),
      datasets: [{
        data:            Array(N).fill(null),
        borderColor:     hexColor,
        borderWidth:     1.6,
        pointRadius:     0,
        pointHoverRadius:0,
        tension:         0.4,
        fill:            true,
        backgroundColor: getGrad(),
        spanGaps:        false,
      }]
    },
    options: {
      responsive:         true,
      maintainAspectRatio:false,
      animation:          { duration: 450, easing: 'easeInOutQuart' },
      plugins:            { legend:{ display:false }, tooltip:{ enabled:false } },
      scales: {
        x: { display: false },
        y: {
          display: true,
          min: 0, max: 100,
          grid:   { color: 'rgba(148,163,184,0.07)', drawBorder: false },
          border: { display: false },
          ticks:  {
            color:        '#64748b',
            font:         { family:'DM Mono', size: 11 },
            callback:     v => [0,50,100].includes(v) ? v+'%' : null,
            maxTicksLimit: 3,
          }
        }
      }
    }
  });

  // Refresh gradient on first real resize
  chart._refreshGrad = () => {
    chart.data.datasets[0].backgroundColor = getGrad();
    chart.update('none');
  };
  setTimeout(() => chart._refreshGrad(), 300);
  return chart;
}

const cChart = makeChart('cChart', '#06c8b4');
const mChart = makeChart('mChart', '#a78bfa');

let cpuH = [], memH = [];

function push(chart, val, hist) {
  hist.push(val);
  if (hist.length > N) hist.shift();
  // pad with nulls on the LEFT so line always draws right-to-left fill
  const pad = Array(N - hist.length).fill(null);
  chart.data.datasets[0].data = [...pad, ...hist];
  chart.update('none');
}

// ── Fetch & render ────────────────────────────────────────────────────────────
async function refresh() {
  let d;
  try { d = await fetch('/api/stats').then(r => r.json()); } catch(e) { return; }

  // Hero
  $('h-name').textContent = d.hostname;
  $('h-sub').innerHTML    = '<em>'+d.osType+'</em> · '+d.kernel+' · '+d.arch;
  $('h-up').textContent   = upfmt(d.uptime);
  $('h-ip').textContent   = d.ip;
  $('h-nd').textContent   = d.nodeVer;

  // KPIs
  $('k-cpu').textContent   = d.cpuLoad+'%';
  $('k-cpu-s').textContent = d.cpuCores+' cores · '+d.cpuSpeed+' GHz';
  $('b-cpu').style.width   = d.cpuLoad+'%';

  $('k-mem').textContent   = d.memPct+'%';
  $('k-mem-s').textContent = gb(d.memUsed)+' of '+gb(d.memTotal);
  $('b-mem').style.width   = d.memPct+'%';

  $('k-dsk').textContent   = d.diskPct+'%';
  $('k-dsk-s').textContent = gb(d.diskUsed)+' of '+gb(d.diskTotal);
  $('b-dsk').style.width   = d.diskPct+'%';

  if (d.cpuTemp !== null) {
    $('k-tmp').textContent   = d.cpuTemp+'°C';
    $('b-tmp').style.width   = Math.min(d.cpuTemp, 100)+'%';
  } else {
    $('k-tmp').textContent   = 'N/A';
    $('k-tmp-s').textContent = 'sensor unavailable';
  }

  // Charts
  push(cChart, d.cpuLoad, cpuH);
  push(mChart, d.memPct,  memH);

  $('cc-cpu').textContent = d.cpuLoad+'%';
  $('cc-mem').textContent = d.memPct+'%';

  const avg = arr => arr.length ? Math.round(arr.reduce((a,b)=>a+b)/arr.length) : 0;
  $('cd-cpu').textContent = cpuH.length < N ? 'collecting data…' : 'last 30s';
  $('cd-mem').textContent = memH.length < N ? 'collecting data…' : 'last 30s';
  $('ca-cpu').textContent = cpuH.length > 1 ? 'avg '+avg(cpuH)+'%' : '';
  $('ca-mem').textContent = memH.length > 1 ? 'avg '+avg(memH)+'%' : '';

  // Info table
  $('i-hn').innerHTML  = '<span class="chip c-cy">'+d.hostname+'</span>';
  $('i-os').textContent = d.osType;
  $('i-kr').textContent = d.kernel;
  $('i-ar').innerHTML  = '<span class="chip c-vi">'+d.arch+'</span>';
  $('i-pl').textContent = d.platform;
  $('i-tz').textContent = d.timezone;
  $('i-cm').textContent = d.cpuBrand;
  $('i-ct').textContent = d.cpuCores+' cores / '+d.cpuThreads+' threads';
  $('i-cs').textContent = d.cpuSpeed+' GHz';
  $('i-rm').textContent = gb(d.memTotal);
  $('i-if').innerHTML  = '<span class="chip c-am">'+d.netIface+'</span>';
  $('i-ip').textContent = d.ip;
}

refresh();
setInterval(refresh, 5000);
</script>
</body>
</html>`;
