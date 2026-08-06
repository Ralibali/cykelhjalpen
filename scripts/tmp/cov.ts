import { getIndexableSeoRoutes } from '../../src/lib/seoStatic'
const r = getIndexableSeoRoutes('cykelhjalpen')
console.log('indexable', r.length, 'en', r.filter(x=>x.lang==='en').length)
console.log(r.filter(x=>x.lang==='en').slice(0,6).map(x=>`${x.path} | alt=${x.altPath} | ${x.title}`).join('\n'))
const dup = r.map(x=>x.path).filter((p,i,a)=>a.indexOf(p)!==i)
console.log('dupes', dup)
