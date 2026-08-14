import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SOURCE = resolve(ROOT, "recovery/unpatched/index-DrSg8VbT.js");
const TARGET = resolve(ROOT, "public/ui/assets/index-DrSg8VbT.js");

const TRANSCRIPT_VIEW = `function TranscriptView({apiRef:r}){const[s,c]=D.useState(s_),f=D.useRef({text:"",id:null,timer:0});const m=D.useCallback(()=>{const y=f.current;if(!y.text)return;const b=y.text;y.text="";c(v=>{if(y.id){const E=v.length-1;if(E>=0&&v[E].id===y.id){const x=v.slice();return x[E]={...v[E],body:v[E].body+b},x}const w=v.findIndex(O=>O.id===y.id);if(w>=0){const O=v.slice();return O[w]={...v[w],body:v[w].body+b},O}}const E=crypto.randomUUID();return y.id=E,[...v,{id:E,speaker:"LIL SMOOVE",stamp:GE(),body:b}]})},[]);D.useEffect(()=>(r.current={pushDelta(y){f.current.text+=y;if(!f.current.timer){const b=Math.max(0,40-(performance.now()-(f.current.last||0)));f.current.timer=window.setTimeout(()=>{f.current.timer=0,f.current.last=performance.now(),m()},b)}},complete(){f.current.timer&&(window.clearTimeout(f.current.timer),f.current.timer=0),m(),f.current.id=null},add(y,b){f.current.timer&&(window.clearTimeout(f.current.timer),f.current.timer=0),m(),f.current.id=null,c(v=>[...v,{id:crypto.randomUUID(),speaker:y,stamp:GE(),body:b}])}},()=>{r.current=null}),[r,m]);const y=s.length>36?s.slice(-36):s;return V.jsxDEV("div",{"data-loc":"client/src/pages/Home.tsx:744",className:"transcript-list",children:y.map(b=>V.jsxDEV("article",{"data-loc":"client/src/pages/Home.tsx:746",className:\`transcript-line transcript-\${b.speaker.toLowerCase()}\`,children:[V.jsxDEV("div",{"data-loc":"client/src/pages/Home.tsx:747",children:[V.jsxDEV("span",{"data-loc":"client/src/pages/Home.tsx:747",children:b.speaker},void 0,!1,{fileName:"/home/ubuntu/lil-smoove-orb-dashboard/client/src/pages/Home.tsx",lineNumber:747,columnNumber:63},this),V.jsxDEV("time",{"data-loc":"client/src/pages/Home.tsx:747",children:b.stamp},void 0,!1,{fileName:"/home/ubuntu/lil-smoove-orb-dashboard/client/src/pages/Home.tsx",lineNumber:747,columnNumber:131},this)]},void 0,!0,{fileName:"/home/ubuntu/lil-smoove-orb-dashboard/client/src/pages/Home.tsx",lineNumber:747,columnNumber:17},this),V.jsxDEV("p",{"data-loc":"client/src/pages/Home.tsx:748",children:b.body},void 0,!1,{fileName:"/home/ubuntu/lil-smoove-orb-dashboard/client/src/pages/Home.tsx",lineNumber:748,columnNumber:17},this)]},b.id,!0,{fileName:"/home/ubuntu/lil-smoove-orb-dashboard/client/src/pages/Home.tsx",lineNumber:746,columnNumber:15},this))},void 0,!1,{fileName:"/home/ubuntu/lil-smoove-orb-dashboard/client/src/pages/Home.tsx",lineNumber:744,columnNumber:11},this)}`;

const REPLACEMENTS = [
  {
    from: "function c_({active:r}){",
    to: "const c_=D.memo(function({active:r}){",
  },
  {
    from: 'lineNumber:60,columnNumber:5},this)}function $E(){',
    to: `lineNumber:60,columnNumber:5},this)});${TRANSCRIPT_VIEW}function $E(){`,
  },
  {
    from: "[S,N]=D.useState(s_)",
    to: "lsApi=D.useRef(null)",
  },
  {
    from: "const it=D.useCallback((q,te)=>{N(ye=>[...ye,{id:crypto.randomUUID(),speaker:q,stamp:GE(),body:te}])},[])",
    to: "const it=D.useCallback((q,te)=>{lsApi.current&&lsApi.current.add(q,te)},[])",
  },
  {
    from: 'if(be==="message.delta"){const rt=String(Oe.delta??Oe.text??Oe.content??"");if(!rt)return;la(rt),s(Qe=>Qe==="speaking"?"speaking":"thinking"),N(Qe=>{const nt=Le.current;if(nt)return Qe.map(yn=>yn.id===nt?{...yn,body:`${yn.body}${rt}`}:yn);const _n=crypto.randomUUID();return Le.current=_n,[...Qe,{id:_n,speaker:"LIL SMOOVE",stamp:GE(),body:rt}]});return}',
    to: 'if(be==="message.delta"){const rt=String(Oe.delta??Oe.text??Oe.content??"");if(!rt)return;la(rt),s(Qe=>Qe==="speaking"||Qe==="thinking"||Qe==="working"?Qe:"thinking"),lsApi.current&&lsApi.current.pushDelta(rt);return}',
  },
  {
    from: 'if(be==="message.complete"){Le.current=null,j("Response complete"),Yn();return}',
    to: 'if(be==="message.complete"){lsApi.current&&lsApi.current.complete(),Le.current=null,j("Response complete"),Yn();return}',
  },
];

let js = await readFile(SOURCE, "utf8");
for (const { from, to } of REPLACEMENTS) {
  if (!js.includes(from)) {
    throw new Error(`Patch needle missing: ${from.slice(0, 80)}`);
  }
  js = js.replace(from, to);
}

const listNeedle =
  'V.jsxDEV("div",{"data-loc":"client/src/pages/Home.tsx:744",className:"transcript-list",children:S.map((q,te)=>';
const listStart = js.indexOf(listNeedle);
if (listStart < 0) throw new Error("transcript-list start missing");
const listEndNeedle =
  '},`${q.speaker}-${te}-${q.body}`,!0,{fileName:"/home/ubuntu/lil-smoove-orb-dashboard/client/src/pages/Home.tsx",lineNumber:746,columnNumber:15},this))},void 0,!1,{fileName:"/home/ubuntu/lil-smoove-orb-dashboard/client/src/pages/Home.tsx",lineNumber:744,columnNumber:11},this)';
const listEnd = js.indexOf(listEndNeedle, listStart);
if (listEnd < 0) throw new Error("transcript-list end missing");
js =
  js.slice(0, listStart) +
  'V.jsxDEV(TranscriptView,{apiRef:lsApi},void 0,!1,{fileName:"/home/ubuntu/lil-smoove-orb-dashboard/client/src/pages/Home.tsx",lineNumber:744,columnNumber:11},this)' +
  js.slice(listEnd + listEndNeedle.length);

if (js.includes("S.map((q,te)=>")) {
  throw new Error("transcript still maps full S");
}
if (js.includes("manus-analytics") || js.includes("__MANUS_HOST_DEV__")) {
  throw new Error("patched bundle still references Manus");
}
if (!js.includes("TranscriptView") || !js.includes("pushDelta")) {
  throw new Error("stream buffer was not inserted");
}

await writeFile(TARGET, js);
console.log(`Patched bundle ${js.length} bytes -> ${TARGET}`);
