import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PATCH_DIR = join(ROOT, "patches");

const zOld =
  'z=D.useCallback(async()=>{f("connecting"),s("offline"),j("Minting a short-lived WebSocket ticket");try{const q=await fetch("/api/auth/ws-ticket",{method:"POST",credentials:"include"});if(q.status===401){const Oe=await q.json().catch(()=>({}));if(Oe.login_url){window.location.assign(Oe.login_url);return}}if(!q.ok)throw new Error(`Ticket endpoint returned HTTP ${q.status}`);const{ticket:te}=await q.json();if(!te)throw new Error("Ticket endpoint returned no ticket");const ye=window.location.protocol==="https:"?"wss:":"ws:",be=new WebSocket(`${ye}//${window.location.host}/api/ws?ticket=${encodeURIComponent(te)}`);we.current=be,be.onopen=()=>j("Secure WebSocket established"),be.onmessage=g,be.onerror=()=>j("Native WebSocket encountered an error"),be.onclose=Oe=>{we.current=null,I.current=null,X(null),f("offline"),s("offline"),j(`Reconnecting private gateway (${Oe.code||"closed"})`),Z.current&&(ue.current=window.setTimeout(()=>void z(),1800))}}catch(q){f("offline"),s("offline"),j(q instanceof Error?q.message:"Private gateway is unavailable"),Z.current&&(ue.current=window.setTimeout(()=>void z(),2400))}},[g]);';

const zNew = [
  "z=D.useCallback(async()=>{",
  "ue.current&&window.clearTimeout(ue.current),ue.current=null;",
  "if(we.current){const prev=we.current;we.current=null;prev.onclose=null;try{prev.close()}catch{}}",
  "I.current&&(Hs.current=!0),I.current=null,X(null),",
  'f("connecting"),s("offline"),',
  'j(Rc.current?"Minting a short-lived WebSocket ticket (retry "+Rc.current+")":"Minting a short-lived WebSocket ticket");',
  "try{",
  'const q=await fetch("/api/auth/ws-ticket",{method:"POST",credentials:"include",signal:AbortSignal.timeout(8e3)});',
  "if(q.status===401){const Oe=await q.json().catch(()=>({}));if(Oe.login_url){window.location.assign(Oe.login_url);return}}",
  'if(!q.ok)throw new Error("Ticket endpoint returned HTTP "+q.status);',
  "const{ticket:te}=await q.json();",
  'if(!te)throw new Error("Ticket endpoint returned no ticket");',
  'const ye=window.location.protocol==="https:"?"wss:":"ws:",be=new WebSocket(ye+"//"+window.location.host+"/api/ws?ticket="+encodeURIComponent(te));',
  "we.current=be,",
  'be.onopen=()=>j("Secure WebSocket established"),',
  "be.onmessage=g,",
  'be.onerror=()=>j("Native WebSocket encountered an error"),',
  "be.onclose=Oe=>{",
  "if(we.current!==be)return;",
  "we.current=null,I.current&&(Hs.current=!0),I.current=null,X(null),f(\"offline\"),s(\"offline\");",
  "if(!Z.current)return;",
  "Rc.current+=1;",
  "if(Rc.current>8){sr(!0),j(\"Private gateway retries exhausted (\"+(Oe.code||\"closed\")+\") — tap Retry\");return}",
  "j(\"Reconnecting private gateway (\"+(Oe.code||\"closed\")+\") — retry \"+Rc.current),",
  "ue.current=window.setTimeout(()=>void z(),Math.min(18e3,800*2**Math.min(Rc.current,5)))",
  "}",
  "}catch(q){",
  'f("offline"),s("offline");',
  "if(!Z.current)return;",
  "Rc.current+=1;",
  'if(Rc.current>8){sr(!0),j("Private gateway retries exhausted — tap Retry");return}',
  'j((q instanceof Error?q.message:"Private gateway is unavailable")+" — retry "+Rc.current),',
  "ue.current=window.setTimeout(()=>void z(),Math.min(18e3,1e3*2**Math.min(Rc.current,5)))",
  "}",
  "},[g]);",
].join("");

const patches = [
  {
    id: "01-honesty-state",
    oldString:
      '[pe,ge]=D.useState(null),we=D.useRef(null),ue=D.useRef(null),Z=D.useRef(!0),Ae=D.useRef(0),I=D.useRef(null),Le=D.useRef(null),ie=D.useRef(null),se=D.useRef(null),De=D.useRef(null),Ue=D.useRef([]),L=D.useRef(!1),Q=D.useRef(!1),U=D.useRef(!1),ve=D.useRef(null)',
    newString:
      '[pe,ge]=D.useState(null),[vl,sv]=D.useState("unknown"),[rr,sr]=D.useState(!1),we=D.useRef(null),ue=D.useRef(null),Z=D.useRef(!0),Ae=D.useRef(0),I=D.useRef(null),Le=D.useRef(null),ie=D.useRef(null),se=D.useRef(null),De=D.useRef(null),Ue=D.useRef([]),L=D.useRef(!1),Q=D.useRef(!1),U=D.useRef(!1),Tf=D.useRef(!1),Rc=D.useRef(0),Hs=D.useRef(!1),ve=D.useRef(null)',
  },
  {
    id: "02-authority-not-button",
    oldString:
      'V.jsxDEV("button",{"data-loc":"client/src/pages/Home.tsx:771",className:"approval-row",type:"button",onClick:()=>s(r==="approval"?"idle":"approval"),children:[',
    newString:
      'V.jsxDEV("div",{"data-loc":"client/src/pages/Home.tsx:771",className:"approval-row",children:[',
  },
  {
    id: "03-authority-text",
    oldString:
      'children:r==="approval"?"APPROVAL WAITING":"NO APPROVALS WAITING"',
    newString:
      'children:r==="approval"?pe||"APPROVAL WAITING":"NO APPROVALS WAITING"',
  },
  {
    id: "04-authority-handoff",
    oldString:
      'lineNumber:773,columnNumber:11},this)]},void 0,!0,{fileName:"/home/ubuntu/lil-smoove-orb-dashboard/client/src/pages/Home.tsx",lineNumber:771',
    newString:
      'lineNumber:773,columnNumber:11},this),V.jsxDEV("a",{"data-loc":"client/src/pages/Home.tsx:774",className:"admin-link",href:"/chat",children:"Decide in Hermes admin — separate console"},void 0,!1,{fileName:"/home/ubuntu/lil-smoove-orb-dashboard/client/src/pages/Home.tsx",lineNumber:774,columnNumber:11},this)]},void 0,!0,{fileName:"/home/ubuntu/lil-smoove-orb-dashboard/client/src/pages/Home.tsx",lineNumber:771',
  },
  {
    id: "05-channel-label",
    oldString: 'children:r==="offline"?"CHECKING SESSION":"VERIFIED"',
    newString:
      'children:rr?"RETRY CONNECTION":c==="live"&&we.current?.readyState===WebSocket.OPEN?"VERIFIED":c==="connecting"?"CHECKING SESSION":"OFFLINE"',
  },
  {
    id: "06-session-retry",
    oldString: 'className:"session-status",children:[',
    newString:
      'className:"session-status",onClick:()=>{rr&&(sr(!1),Rc.current=0,void z())},role:rr?"button":"status",children:[',
  },
  {
    id: "07-voice-deck",
    oldString:
      'children:O||b&&r==="listening"?"LISTENING LIVE":r==="transcribing"?"TRANSCRIBING":r==="speaking"?"PLAYING RESPONSE":r==="thinking"||r==="working"?"PROCESSING":r==="interrupted"?"INTERRUPTED":"READY"',
    newString:
      'children:c!=="live"?(c==="connecting"?"CHECKING":"OFFLINE"):O||b&&r==="listening"?"LISTENING LIVE":r==="transcribing"?"TRANSCRIBING":r==="speaking"?"PLAYING RESPONSE":r==="thinking"||r==="working"?"PROCESSING":r==="interrupted"?"INTERRUPTED":r==="idle"?"READY":r==="approval"?"AWAITING YOU":"CHECKING"',
  },
  {
    id: "08-voice-layer-footer",
    oldString: 'children:"ELEVENLABS READY"',
    newString:
      'children:vl==="ready"?"ELEVENLABS READY":vl==="degraded"?"ELEVENLABS DEGRADED":vl==="down"?"ELEVENLABS DOWN":"ELEVENLABS UNKNOWN"',
  },
  {
    id: "09-active-tool",
    oldString: 'children:r==="working"?"Hermes tool":"No tool in motion"',
    newString: "children:fe",
  },
  {
    id: "10-admin-separate",
    oldString: 'children:["OPEN HERMES ADMIN ",',
    newString: 'children:["OPEN HERMES ADMIN (SEPARATE CONSOLE) ",',
  },
  {
    id: "11-speak-fail-resume",
    oldString:
      'await Oe.play()}catch{te===Mt.current&&(j("Text response complete; speech provider unavailable"),s("idle"))}',
    newString:
      'await Oe.play(),sv("ready")}catch{Ke.current=!1,U.current=!1,sv("down"),te===Mt.current&&(j("Text response complete; speech provider unavailable"),s("idle"),Q.current&&window.setTimeout(()=>Pe.current(),180))}',
  },
  {
    id: "12-speak-stream-voice",
    oldString:
      'Oe.type==="start"&&typeof Oe.sample_rate=="number"&&(lt.current=Oe.sample_rate)',
    newString:
      'Oe.type==="start"&&typeof Oe.sample_rate=="number"&&(lt.current=Oe.sample_rate,sv("ready"))',
  },
  {
    id: "13-speak-stream-error",
    oldString: 'ye.onerror=()=>j("Streaming speech transport unavailable")',
    newString:
      'ye.onerror=()=>{sv("degraded"),j("Streaming speech transport unavailable")}',
  },
  {
    id: "14-transcribe-timeout-latch",
    oldString:
      'Dn=D.useCallback(async(q,te)=>{s("transcribing"),j("Transcribing owner turn");try{const ye=await fetch("/api/audio/transcribe",{method:"POST",credentials:"include",headers:{"content-type":"application/json"},body:JSON.stringify({data_url:await u_(q),mime_type:q.type})})',
    newString:
      'Dn=D.useCallback(async(q,te)=>{Tf.current=!0,s("transcribing"),j("Transcribing owner turn");try{const ye=await fetch("/api/audio/transcribe",{method:"POST",credentials:"include",headers:{"content-type":"application/json"},signal:AbortSignal.timeout(2e4),body:JSON.stringify({data_url:await u_(q),mime_type:q.type})})',
  },
  {
    id: "15-transcribe-finally",
    oldString:
      '}catch{j("Voice transcription did not complete"),s("idle"),Go("Voice transcription did not complete",{description:"No message was sent to Hermes."}),te==="conversation"&&Q.current&&window.setTimeout(()=>Pe.current(),180)}},[it,At])',
    newString:
      '}catch{j("Voice transcription did not complete"),s("idle"),Go("Voice transcription did not complete",{description:"No message was sent to Hermes."}),te==="conversation"&&Q.current&&window.setTimeout(()=>Pe.current(),180)}finally{Tf.current=!1}},[it,At])',
  },
  {
    id: "16-exclusive-vad",
    oldString: "if(!q||L.current||U.current)return",
    newString: "if(!q||L.current||U.current||Tf.current)return",
  },
  {
    id: "17-exclusive-onstop",
    oldString:
      'if(L.current=!1,!!Q.current){if(!ye.length){Q.current&&Pe.current();return}Dn(new Blob(ye,{type:te.mimeType||"audio/webm"}),"conversation")}',
    newString:
      'if(L.current=!1,!!Q.current){if(!ye.length){Q.current&&Pe.current();return}Tf.current=!0,Dn(new Blob(ye,{type:te.mimeType||"audio/webm"}),"conversation")}',
  },
  {
    id: "18-speak-timeout",
    oldString:
      'const ye=await fetch("/api/audio/speak",{method:"POST",credentials:"include",headers:{"content-type":"application/json"},body:JSON.stringify({text:q})})',
    newString:
      'const ye=await fetch("/api/audio/speak",{method:"POST",credentials:"include",headers:{"content-type":"application/json"},signal:AbortSignal.timeout(2e4),body:JSON.stringify({text:q})})',
  },
  {
    id: "19-reconnect-divider",
    oldString:
      'Qe&&(I.current=Qe,X(Qe),j("Private Hermes session active"),s("idle"))',
    newString:
      'Qe&&(Hs.current&&it("SYSTEM","New Hermes session — previous transcript is local only"),Hs.current=!1,I.current=Qe,X(Qe),sr(!1),Rc.current=0,j("Private Hermes session active"),s("idle"))',
  },
  {
    id: "20-ws-identity-backoff",
    oldString: zOld,
    newString: zNew,
  },
  {
    id: "21-disable-talk",
    oldString: 'className:"talk-button",onClick:ke,"aria-pressed":O',
    newString:
      'className:"talk-button",onClick:ke,"aria-pressed":O,disabled:!H',
  },
  {
    id: "22-disable-conversation",
    oldString:
      '"aria-selected":m==="conversation",onClick:Se,children:"CONVERSATION"',
    newString:
      '"aria-selected":m==="conversation",onClick:Se,disabled:!H,children:"CONVERSATION"',
  },
  {
    id: "23-disable-send",
    oldString: '"aria-label":"Send instruction",disabled:!E.trim()',
    newString: '"aria-label":"Send instruction",disabled:!E.trim()||!H',
  },
  {
    id: "24-disable-composer",
    oldString:
      'placeholder:"Type an instruction…","aria-label":"Type an instruction"',
    newString:
      'placeholder:H?"Type an instruction…":"Waiting for a new Hermes session…","aria-label":"Type an instruction",disabled:!H',
  },
];

for (const patch of patches) {
  const body = [
    `export const id = ${JSON.stringify(patch.id)};`,
    `export const oldString = ${JSON.stringify(patch.oldString)};`,
    `export const newString = ${JSON.stringify(patch.newString)};`,
    "",
  ].join("\n");
  await writeFile(join(PATCH_DIR, `${patch.id}.mjs`), body);
  console.log(`wrote ${patch.id}`);
}

console.log(`wrote ${patches.length} patches`);
