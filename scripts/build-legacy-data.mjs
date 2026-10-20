import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const parts=["data.js","data-extra.js","data-auto.js","advanced/adapter.js"];
const header=[
 "/* GENERATED FILE — DO NOT EDIT DIRECTLY.",
 "   Source of truth: data.js + data-extra.js + data-auto.js + advanced/adapter.js.",
 "   Both the new site and classic Vercel site must resolve to this catalog.",
 "   Rebuilt by scripts/build-legacy-data.mjs on every source change.",
 "*/",""
].join("\n");
const combined=header+parts.map(path=>{
 const contents=readFileSync(resolve(root,path),"utf8");
 return "\n;\n/* BEGIN "+path+" */\n"+contents+"\n/* END "+path+" */\n";
}).join("");
const dest=resolve(root,"shared/legacy-data.js");
mkdirSync(dirname(dest),{recursive:true});
writeFileSync(dest,combined,"utf8");
console.log("Rebuilt legacy data bundle from "+parts.join(", ")+".");
