export const id = "18-speak-timeout";
export const oldString = "const ye=await fetch(\"/api/audio/speak\",{method:\"POST\",credentials:\"include\",headers:{\"content-type\":\"application/json\"},body:JSON.stringify({text:q})})";
export const newString = "const ye=await fetch(\"/api/audio/speak\",{method:\"POST\",credentials:\"include\",headers:{\"content-type\":\"application/json\"},signal:AbortSignal.timeout(2e4),body:JSON.stringify({text:q})})";
