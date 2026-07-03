import fs from "fs";

const s = fs.readFileSync("insforge/functions/dist/ycloud-wa-inbound.deploy.js", "utf8");
console.log("require(\"fs\") count:", (s.match(/require\("fs"\)/g) || []).length);
console.log("require(\"path\") count:", (s.match(/require\("path"\)/g) || []).length);
console.log("__require count:", (s.match(/__require/g) || []).length);
