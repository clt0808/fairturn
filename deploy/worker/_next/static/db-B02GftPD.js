import{t as e}from"./edf-DxDz4N3f.js";import{env as t}from"cloudflare:workers";var n=36e5,r=24*n,i=120*r,a=2*r,o=[{windowMs:n,max:5},{windowMs:r,max:12}],s=[{windowMs:n,max:8},{windowMs:r,max:15}],c=[{windowMs:r,max:2}],l=[{windowMs:n,max:8}];function u(e,t,n){return n.some(n=>e.filter(e=>e>t-n.windowMs&&e<=t).length>=n.max)}var d=`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`;function f(){let e=new Uint8Array(8);crypto.getRandomValues(e);let t=``;for(let n of e)t+=d[n%32];return t}function p(e){return e.replace(/[^a-zA-Z0-9]/g,``).toUpperCase()}function m(e){let t=p(e);return t.length===8?`${t.slice(0,4)}-${t.slice(4)}`:t}function h(e){if(!e.rawCode||!e.rawCode.trim())return{outcome:`absent`};let t=e.rawCode.replace(/[^a-zA-Z0-9]/g,``).toUpperCase();return!e.token||e.token.code!==t?{outcome:`reject`,reason:`unknown`}:e.token.consumedAt===null?e.token.expiresAt<=e.now?{outcome:`reject`,reason:`expired`}:e.token.handedCode===e.submittedReferralCode?{outcome:`reject`,reason:`self`}:e.alreadyBoosted?{outcome:`reject`,reason:`already`}:{outcome:`accept`,tokenId:e.token.id}:{outcome:`reject`,reason:`used`}}function g(e){return e>=2}function _(e,t){return e.createdAt===t.createdAt?e.id<t.id?-1:+(e.id>t.id):e.createdAt-t.createdAt}function v(e){let t=e.map(e=>({...e})),n=t.map((e,t)=>({member:e,index:t})).filter(({member:e})=>e.active&&e.weight>0).sort((e,t)=>_(e.member,t.member));if(n.length===0)return null;let r=0,i=n[0].index;for(let{member:e,index:a}of n)e.currentWeight+=e.weight,r+=e.weight,e.currentWeight>t[i].currentWeight&&(i=a);let a=t[i];return a.currentWeight-=r,a.handouts+=1,{pickedId:a.id,members:t}}function y(e){if(e==null||!Number.isFinite(e))return null;let t=Math.trunc(e);return t<2?null:Math.min(t,50)}function b(e){return!Number.isInteger(e)||e<0||e===1||e>50?{ok:!1}:{ok:!0,ownerEvery:e===0?null:e}}function x(e){let t={2:`second`,3:`third`,4:`fourth`,5:`fifth`,6:`sixth`,7:`seventh`,8:`eighth`,9:`ninth`,10:`tenth`};if(t[e])return t[e];let n=e%100;if(n>=11&&n<=13)return`${e}th`;switch(e%10){case 1:return`${e}st`;case 2:return`${e}nd`;case 3:return`${e}rd`;default:return`${e}th`}}function S(e,t){let n=y(e);return!t||n===null?``:`The site owner's own link is included in the rotation.`}function C(e){return e.find(e=>e.owner&&e.active)}function w(e,t){let n=e.map(e=>({...e})),r=y(t.ownerEvery),i=C(n),a=t.handoutsSoFar+1;if(i&&r&&a%r===0&&i)return i.handouts+=1,{pickedId:i.id,members:n};let o=v(r&&i?n.filter(e=>e!==i):n);if(!o)return i?(i.handouts+=1,{pickedId:i.id,members:n}):null;let s=new Map(o.members.map(e=>[e.id,e]));return{pickedId:o.pickedId,members:n.map(e=>s.get(e.id)??e)}}function T(e){return e.currentWeight+e.weight}function E(e){return e.filter(e=>e.active&&e.weight>0).map(e=>({...e})).sort((e,t)=>{let n=T(t)-T(e);return n===0?_(e,t):n})}function ee(e,t,n){let r=e.map(e=>({...e})),i=E(r),a=i.findIndex(e=>e.id===t);if(a<0)return r;let o=n===`up`?a-1:a+1;if(o<0||o>=i.length)return r;let s=i.map(e=>e.id),c=s[a];s[a]=s[o],s[o]=c;let l=Math.max(...i.map(e=>T(e)));for(let[e,t]of s.entries()){let n=r.find(e=>e.id===t);n&&(n.currentWeight=l-e-n.weight)}return r}var D=`
CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  scheme_id TEXT NOT NULL,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  url TEXT NOT NULL,
  weight INTEGER NOT NULL,
  current_weight INTEGER NOT NULL,
  handouts INTEGER NOT NULL DEFAULT 0,
  boosted INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  is_owner INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS links_active_email
  ON links(scheme_id, email) WHERE active = 1;

CREATE UNIQUE INDEX IF NOT EXISTS links_active_code
  ON links(scheme_id, code) WHERE active = 1;

CREATE TABLE IF NOT EXISTS claim_tokens (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  scheme_id TEXT NOT NULL,
  link_id TEXT NOT NULL,
  handed_code TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  consumed_by_link_id TEXT,
  ip_hash TEXT
);

CREATE TABLE IF NOT EXISTS handouts (
  id TEXT PRIMARY KEY,
  scheme_id TEXT NOT NULL,
  link_id TEXT NOT NULL,
  token_id TEXT,
  created_at INTEGER NOT NULL,
  ip_hash TEXT
);

CREATE TABLE IF NOT EXISTS rate_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_events_lookup
  ON rate_events(action, ip_hash, created_at);

CREATE TABLE IF NOT EXISTS queue_settings (
  scheme_id TEXT PRIMARY KEY,
  owner_every INTEGER NOT NULL
);
`,O=`
CREATE UNIQUE INDEX IF NOT EXISTS links_one_owner
  ON links(scheme_id) WHERE is_owner = 1;
`;`${D.trim()}${O.trim()}`;async function k(e,t){return e.transaction?e.transaction(t):t()}function A(e){return{id:e.id,schemeId:e.scheme_id,email:e.email,code:e.code,url:e.url,weight:e.weight,currentWeight:e.current_weight,handouts:e.handouts,boosted:e.boosted===1,active:e.active===1,owner:e.is_owner===1,createdAt:e.created_at,updatedAt:e.updated_at}}function j(e){return{id:e.id,weight:e.weight,currentWeight:e.currentWeight,handouts:e.handouts,createdAt:e.createdAt,active:e.active,owner:e.owner}}function M(e){return e.split(`;`).map(e=>e.replace(/\s+/g,` `).trim()).filter(e=>e.length>0)}async function N(e,t){for(let n of M(t))await e.exec(`${n};`)}async function P(e){await N(e,D),(await e.prepare(`PRAGMA table_info(links)`).all()).results.some(e=>e.name===`is_owner`)||await e.exec(`ALTER TABLE links ADD COLUMN is_owner INTEGER NOT NULL DEFAULT 0`),await N(e,O);for(let t of[`links`,`claim_tokens`,`handouts`,`queue_settings`])(await e.prepare(`PRAGMA table_info(${t})`).all()).results.some(e=>e.name===`provider`)||await e.exec(`ALTER TABLE ${t} ADD COLUMN provider TEXT NOT NULL DEFAULT 'edf'`),await e.prepare(`UPDATE ${t} SET provider = scheme_id WHERE scheme_id <> 'edf' AND provider = 'edf'`).run()}async function F(e,t){await e.prepare(`DELETE FROM rate_events WHERE created_at < ?`).bind(t-a).run()}async function I(e,t,n,r){return(await e.prepare(`SELECT created_at FROM rate_events WHERE action = ? AND ip_hash = ? AND created_at > ? ORDER BY created_at`).bind(t,n,r).all()).results.map(e=>e.created_at)}async function L(e,t,n,r){await e.prepare(`INSERT INTO rate_events (action, ip_hash, created_at) VALUES (?, ?, ?)`).bind(t,n,r).run()}async function R(e,t,n,r,i){return u(await I(e,t,n,r-Math.max(...i.map(e=>e.windowMs))),r,i)}async function z(e,t,n,r=Date.now()){await L(e,t,n,r)}async function B(e,t){return(await e.prepare(`SELECT * FROM links WHERE scheme_id = ? ORDER BY created_at ASC, id ASC`).bind(t).all()).results.map(A)}async function V(e,t,n,r){return!!await e.prepare(`SELECT id FROM links WHERE scheme_id = ? AND ${n} = ? AND active = 1`).bind(t,r).first()}async function H(e,t){let n=t.now??Date.now(),r=t.email.trim().toLowerCase();return k(e,async()=>{if(await F(e,n),await R(e,`submit`,t.ipHash,n,o))return{ok:!1,reason:`rate`};let i=!1,a=null;if(t.claimCode){let r=await e.prepare(`SELECT * FROM claim_tokens WHERE code = ?`).bind(t.claimCode).first();if(r&&r.scheme_id!==t.schemeId)return await L(e,`submit`,t.ipHash,n),{ok:!1,reason:`claim-provider`};let o=h({rawCode:t.claimCode,token:r?{id:r.id,code:r.code,handedCode:r.handed_code,expiresAt:r.expires_at,consumedAt:r.consumed_at}:null,submittedReferralCode:t.code,alreadyBoosted:!1,now:n});if(o.outcome===`reject`)return await L(e,`submit`,t.ipHash,n),{ok:!1,reason:`claim-${o.reason}`};if(o.outcome===`accept`){if(await R(e,`boost`,t.ipHash,n,c))return await L(e,`submit`,t.ipHash,n),{ok:!1,reason:`boost-cap`};i=!0,a=o.tokenId}}if(await V(e,t.schemeId,`email`,r))return await L(e,`submit`,t.ipHash,n),{ok:!1,reason:`email-taken`};if(await V(e,t.schemeId,`code`,t.code))return await L(e,`submit`,t.ipHash,n),{ok:!1,reason:`code-taken`};let s=crypto.randomUUID();if(await e.prepare(`INSERT INTO links (
        id, scheme_id, provider, email, code, url, weight, current_weight, handouts, boosted, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 1, ?, ?)`).bind(s,t.schemeId,t.schemeId,r,t.code,t.url,i?2:1,+!!i,n,n).run(),i&&a){if((await e.prepare(`UPDATE claim_tokens SET consumed_at = ?, consumed_by_link_id = ? WHERE id = ? AND consumed_at IS NULL`).bind(n,s,a).run()).meta.changes!==1)throw Error(`Claim token could not be consumed`);await L(e,`boost`,t.ipHash,n)}return await L(e,`submit`,t.ipHash,n),{ok:!0,boosted:i,id:s}})}async function U(e,t){let n=t.now??Date.now(),r=t.email.trim().toLowerCase();return k(e,async()=>{if(await V(e,t.schemeId,`email`,r))return{ok:!1,reason:`email-taken`};if(await V(e,t.schemeId,`code`,t.code))return{ok:!1,reason:`code-taken`};let i=crypto.randomUUID(),a=t.boosted?2:1;return await e.prepare(`INSERT INTO links (
        id, scheme_id, provider, email, code, url, weight, current_weight, handouts, boosted, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 1, ?, ?)`).bind(i,t.schemeId,t.schemeId,r,t.code,t.url,a,+!!t.boosted,n,n).run(),{ok:!0,boosted:t.boosted,id:i}})}async function W(e,t){let n=t.now??Date.now(),r=t.newClaimCode??f;return k(e,async()=>{if(await F(e,n),await R(e,`handout`,t.ipHash,n,s))return{ok:!1,reason:`rate`};let a=(await B(e,t.schemeId)).filter(e=>e.active),o=await q(e,t.schemeId),c=w(a.map(j),{handoutsSoFar:await K(e,t.schemeId),ownerEvery:o.ownerEvery});if(!c)return{ok:!1,reason:`empty`};let l=e.prepare(`UPDATE links SET current_weight = ?, handouts = ?, updated_at = ? WHERE id = ?`);for(let e of c.members)await l.bind(e.currentWeight,e.handouts,n,e.id).run();let u=a.find(e=>e.id===c.pickedId);if(!u)throw Error(`Picked link disappeared`);let d=r(),f=crypto.randomUUID();return await e.prepare(`INSERT INTO claim_tokens (
        id, code, scheme_id, provider, link_id, handed_code, created_at, expires_at, ip_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(f,d,t.schemeId,t.schemeId,u.id,u.code,n,n+i,t.ipHash).run(),await e.prepare(`INSERT INTO handouts (id, scheme_id, provider, link_id, token_id, created_at, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(crypto.randomUUID(),t.schemeId,t.schemeId,u.id,f,n,t.ipHash).run(),await L(e,`handout`,t.ipHash,n),{ok:!0,url:u.url,code:u.code,claimCode:d,linkId:u.id,demo:u.email.endsWith(`@example.com`)}})}async function G(e,t,n,r=Date.now()){return k(e,async()=>{let i=await e.prepare(`SELECT * FROM links WHERE id = ?`).bind(t).first();if(!i)return{ok:!1,reason:`missing`};if(n){if(await V(e,i.scheme_id,`email`,i.email))return{ok:!1,reason:`email-taken`};if(await V(e,i.scheme_id,`code`,i.code))return{ok:!1,reason:`code-taken`}}return await e.prepare(`UPDATE links SET active = ?, updated_at = ? WHERE id = ?`).bind(+!!n,r,t).run(),{ok:!0}})}async function K(e,t){let n=await e.prepare(`SELECT COUNT(*) AS n FROM handouts WHERE scheme_id = ?`).bind(t).first();return Number(n?.n??0)}async function q(e,t){let n=await e.prepare(`SELECT owner_every FROM queue_settings WHERE scheme_id = ?`).bind(t).first();if(!n)return{ownerEvery:3};let r=b(n.owner_every);return{ownerEvery:r.ok?r.ownerEvery:3}}async function J(e,t,n){let r=b(n);return r.ok?(await e.prepare(`INSERT INTO queue_settings (scheme_id, owner_every, provider) VALUES (?, ?, ?)
     ON CONFLICT(scheme_id) DO UPDATE SET owner_every = excluded.owner_every, provider = excluded.provider`).bind(t,r.ownerEvery??0,t).run(),{ok:!0,ownerEvery:r.ownerEvery}):{ok:!1,reason:`invalid`}}async function Y(e,t,n,r=Date.now()){return k(e,async()=>n&&!await e.prepare(`SELECT id FROM links WHERE id = ? AND scheme_id = ?`).bind(n,t).first()?{ok:!1,reason:`missing`}:(await e.prepare(`UPDATE links SET is_owner = 0, updated_at = ? WHERE scheme_id = ? AND is_owner = 1`).bind(r,t).run(),n&&await e.prepare(`UPDATE links SET is_owner = 1, updated_at = ? WHERE id = ?`).bind(r,n).run(),{ok:!0}))}async function X(e,t,n,r,i=Date.now()){await k(e,async()=>{let a=await B(e,t),o=(await q(e,t)).ownerEvery!==null&&a.some(e=>e.owner&&e.active),s=ee(a.map(j).map(e=>o&&e.owner?{...e,active:!1}:e),n,r),c=e.prepare(`UPDATE links SET current_weight = ?, updated_at = ? WHERE id = ?`);for(let e of s)e.active&&await c.bind(e.currentWeight,i,e.id).run()})}async function Z(e,t,n=Date.now()){let r=await e.prepare(`SELECT t.code, t.scheme_id, t.expires_at, t.consumed_at, l.url, l.code AS referral_code, l.email
       FROM claim_tokens t
       JOIN links l ON l.id = t.link_id
       WHERE t.code = ?`).bind(t).first();return r?{claimCode:r.code,schemeId:r.scheme_id,url:r.url,referralCode:r.referral_code,consumed:r.consumed_at!==null,expired:r.expires_at<=n,demo:r.email.endsWith(`@example.com`)}:null}var Q=[{email:`priya@example.com`,code:`amber-lark-2401`,boosted:!1},{email:`sam@example.com`,code:`quiet-brook-1184`,boosted:!1},{email:`jordan@example.com`,code:`copper-fern-9033`,boosted:!0},{email:`r.okonkwo@example.com`,code:`mild-harbor-5520`,boosted:!1}];async function te(t){let n=await t.prepare(`SELECT COUNT(*) AS n FROM links`).first();if(Number(n?.n??0)>0)return;let r=Date.parse(`2026-11-16T09:00:00Z`),i=[];for(let[n,a]of Q.entries())i.push(await U(t,{schemeId:e.id,email:a.email,code:a.code,url:`https://www.edfenergy.com/quote/refer-a-friend/${a.code}`,boosted:a.boosted,now:r+n*1e3}));i[0]?.ok&&await Y(t,e.id,i[0].id,r)}var $=!1;async function ne(){let e=t,n=e.DB;if(!n)throw Error(`D1 binding DB is not configured`);await P(n);let r=e.SEED_DEMO??process.env.SEED_DEMO;return!$&&r===`true`&&(await te(n),$=!0),n}export{g as _,R as a,l as b,z as c,J as d,Y as f,S as g,x as h,W as i,X as l,E as m,U as n,B as o,H as p,q as r,Z as s,ne as t,G as u,m as v,i as x,p as y};
//# sourceMappingURL=db-B02GftPD.js.map