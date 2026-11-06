// Dependency-free, deterministic data and ML engine. Shared by the UI, worker and tests.
export const LIMITS = {bytes: 10 * 1024 * 1024, rows: 20000, columns: 80, modelRows: 5000, features: 12};
export function missing(v) { return v == null || /^(?:\s*|na|n\/a|null|nan)$/i.test(String(v).trim()); }
export function number(v) {
  if (missing(v)) return null;
  const s = String(v).trim();
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(s)) return null;
  const n = Number(s); return Number.isFinite(n) ? n : null;
}
export function dateNumber(v) {
  if (!/^\d{4}-\d{2}-\d{2}(?:[T ].*)?$/.test(String(v))) return null;
  const n = Date.parse(v); if (!Number.isFinite(n)) return null;
  if (new Date(n).toISOString().slice(0,10) !== String(v).slice(0,10)) return null;
  return n;
}
export function parseCSV(text, forced = 'auto') {
  text = text.replace(/^\uFEFF/, '');
  if (text.length > LIMITS.bytes) throw new Error('This file is too large. Choose a CSV under 10 MB.');
  if (!text.trim()) throw new Error('This file is empty. Add a header row and at least one data row.');
  let delimiter = forced;
  if (forced === 'auto') {
    const counts = new Map([[',',0],[';',0],['\t',0]]); let quoted = false;
    for (let i=0; i<text.length; i++) {
      const c=text[i]; if(c==='"') { if(quoted && text[i+1]==='"') i++; else quoted=!quoted; }
      else if (!quoted && (c==='\n'||c==='\r')) break;
      else if (!quoted && counts.has(c)) counts.set(c,counts.get(c)+1);
    }
    delimiter=[...counts].sort((a,b)=>b[1]-a[1])[0][0];
  }
  const records=[]; let row=[], field='', quoted=false, closed=false;
  const endField=()=> {row.push(field.trim()); field=''; closed=false;};
  const endRow=()=> {endField(); if(row.some(v=>v!=='')) records.push(row); row=[]; if(records.length>LIMITS.rows+1) throw new Error('This version supports up to 20,000 rows. Please upload a smaller file.');};
  for (let i=0;i<text.length;i++) {
    const c=text[i];
    if(quoted) { if(c==='"') { if(text[i+1]==='"') {field+='"';i++;} else {quoted=false;closed=true;} } else field+=c; }
    else if(c===delimiter) endField();
    else if(c==='\n'||c==='\r') {endRow(); if(c==='\r'&&text[i+1]==='\n')i++;}
    else if(c==='"' && !field.trim() && !closed) {field='';quoted=true;}
    else if(closed && !/\s/.test(c)) throw new Error('Malformed CSV: unexpected text after a quoted field.');
    else if(!closed) field+=c;
  }
  if(quoted) throw new Error('Malformed CSV: a quoted field is not closed.');
  if(field||row.length||closed) endRow();
  if(records.length<2) throw new Error('Add at least one data row below the column headers.');
  const original=records.shift(); if(original.length>LIMITS.columns) throw new Error('Please use a file with 80 columns or fewer.');
  const seen=new Set(); const headers=original.map((s,i)=>{let base=s||`Column ${i+1}`,h=base,n=2;while(seen.has(h))h=`${base} (${n++})`;seen.add(h);return h;});
  let padded=0;
  const rows=records.map((r,i)=>{if(r.length>headers.length) throw new Error(`Data record ${i+1} has ${r.length} fields, but the header has ${headers.length}. Check the separator or quotes.`);if(r.length<headers.length)padded++;return [...r,...Array(headers.length-r.length).fill('')];});
  return {headers,rows,delimiter,warnings:[...(headers.some((h,i)=>h!==original[i])?['Blank or repeated headers were renamed.']:[]),...(padded?[`${padded} short records were padded with empty cells.`]:[])]};
}
export function quantile(sorted,p) { if(!sorted.length)return null;const i=(sorted.length-1)*p,l=Math.floor(i);return sorted[l]+(sorted[Math.ceil(i)]-sorted[l])*(i-l); }
const mean=a=>a.reduce((s,n)=>s+n,0)/a.length;
export function profile(data) {
  const columns=data.headers.map((name,index)=>{
    const values=data.rows.map(r=>r[index]), present=values.filter(v=>!missing(v));
    const numeric=present.map(number).filter(v=>v!==null).sort((a,b)=>a-b);
    const dates=present.filter(v=>dateNumber(v)!==null);
    const unique=new Set(present).size;
    const type=present.length===0?'empty':numeric.length/present.length>=.95?'number':dates.length===present.length?'date':'category';
    const counts=new Map();present.forEach(v=>counts.set(v,(counts.get(v)||0)+1));
    const c={name,index,type,missing:values.length-present.length,unique,counts:[...counts].sort((a,b)=>b[1]-a[1]),invalid:type==='number'?present.length-numeric.length:0};
    if(type==='number') {
      const avg=mean(numeric),q1=quantile(numeric,.25),q3=quantile(numeric,.75),iqr=q3-q1,lo=q1-1.5*iqr,hi=q3+1.5*iqr;
      Object.assign(c,{min:numeric[0],max:numeric.at(-1),mean:avg,median:quantile(numeric,.5),q1,q3,sd:Math.sqrt(mean(numeric.map(v=>(v-avg)**2))),outliers:numeric.filter(v=>v<lo||v>hi).length,lo,hi});
    }
    c.idLike=/^(id|index|uuid|.*[_ ]id|.*[_ ]code)$/i.test(name) || (type==='category' && unique>Math.min(20,present.length*.8));
    return c;
  });
  const seen=new Set();let duplicates=0;data.rows.forEach(r=>{const s=JSON.stringify(r);if(seen.has(s))duplicates++;seen.add(s);});
  return {columns,rows:data.rows.length,missing:columns.reduce((s,c)=>s+c.missing,0),duplicates,cells:data.rows.length*columns.length};
}
export function correlation(rows,a,b) {
  const pairs=rows.map(r=>[number(r[a]),number(r[b])]).filter(p=>p.every(v=>v!==null));if(pairs.length<3)return null;
  const mx=mean(pairs.map(p=>p[0])),my=mean(pairs.map(p=>p[1]));let xx=0,yy=0,xy=0;
  pairs.forEach(([x,y])=>{xx+=(x-mx)**2;yy+=(y-my)**2;xy+=(x-mx)*(y-my);});
  return xx&&yy?{r:xy/Math.sqrt(xx*yy),n:pairs.length}:null;
}
export function histogram(values,bins=12) {
  values=values.map(number).filter(v=>v!==null);if(!values.length)return [];
  const lo=Math.min(...values),hi=Math.max(...values);if(lo===hi)return [{start:lo,end:hi,count:values.length}];
  const step=(hi-lo)/bins, out=Array.from({length:bins},(_,i)=>({start:lo+i*step,end:lo+(i+1)*step,count:0}));
  values.forEach(v=>out[Math.min(bins-1,Math.floor((v-lo)/step))].count++);return out;
}
export function seeded(seed=42) {return ()=>{seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^seed>>>15,1|seed);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};}
function shuffle(items,seed=42){const out=[...items],rand=seeded(seed);for(let i=out.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function encoder(rows,columns) {
  const specs=[];
  for(const c of columns) {
    if(c.type==='number') {
      const v=rows.map(r=>number(r[c.index])).filter(v=>v!==null).sort((a,b)=>a-b);if(!v.length)continue;
      const median=quantile(v,.5),avg=mean(v),sd=Math.sqrt(mean(v.map(n=>(n-avg)**2)))||1;
      specs.push({index:c.index,name:c.name,type:'number',median,mean:avg,sd});
    } else {
      const counts=new Map();rows.forEach(r=>{const v=missing(r[c.index])?null:r[c.index];if(v!==null)counts.set(v,(counts.get(v)||0)+1);});
      const levels=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,14).map(p=>p[0]);if(!levels.length)continue;
      specs.push({index:c.index,name:c.name,type:'category',levels});
    }
  }
  return specs;
}
function vector(row,specs) {
  const v=[1];for(const s of specs) {
    if(s.type==='number')v.push(Math.max(-20,Math.min(20,((number(row[s.index])??s.median)-s.mean)/s.sd)));
    else {const val=row[s.index],idx=missing(val)?-1:s.levels.indexOf(val);s.levels.forEach((_,i)=>v.push(i===idx?1:0));v.push(idx<0?1:0);}
  }return v;
}
function dot(a,b) {let s=0;for(let i=0;i<a.length;i++)s+=a[i]*b[i];return s;}
function solve(a,b) {
  const n=b.length,m=a.map((row,i)=>[...row,b[i]]);
  for(let k=0;k<n;k++) {
    let p=k;for(let i=k+1;i<n;i++)if(Math.abs(m[i][k])>Math.abs(m[p][k]))p=i;
    [m[k],m[p]]=[m[p],m[k]];const d=m[k][k];if(Math.abs(d)<1e-12)throw new Error('These inputs cannot support a stable model. Try fewer columns.');
    for(let j=k;j<=n;j++)m[k][j]/=d;
    for(let i=0;i<n;i++)if(i!==k){const f=m[i][k];for(let j=k;j<=n;j++)m[i][j]-=f*m[k][j];}
  }
  return m.map(r=>r[n]);
}
function regressionMetrics(actual,predicted) {
  const avg=mean(actual),sse=actual.reduce((s,y,i)=>s+(y-predicted[i])**2,0),sst=actual.reduce((s,y)=>s+(y-avg)**2,0);
  return {mae:mean(actual.map((y,i)=>Math.abs(y-predicted[i]))),rmse:Math.sqrt(sse/actual.length),r2:sst?sse/sst*-1+1:null};
}
function classificationMetrics(actual,predicted,classes) {
  const matrix=classes.map(()=>classes.map(()=>0));actual.forEach((y,i)=>matrix[classes.indexOf(y)][classes.indexOf(predicted[i])]++);
  const f1=classes.map((_,i)=>{const tp=matrix[i][i],fp=matrix.reduce((s,r)=>s+r[i],0)-tp,fn=matrix[i].reduce((s,v)=>s+v,0)-tp;return 2*tp/(2*tp+fp+fn)||0;});
  return {accuracy:mean(actual.map((y,i)=>+(y===predicted[i]))),macroF1:mean(f1),matrix};
}
export function predict(model,row) {
  const x=vector(row,model.specs);
  if(model.task==='regression')return dot(x,model.weights)*model.yScale+model.yMean;
  const scores=model.weights.map(w=>dot(x,w));return model.classes[scores.indexOf(Math.max(...scores))];
}
export function train(data,options) {
  const p=profile(data),target=p.columns[options.target];if(!target)throw new Error('Choose a target column.');
  const task=options.task==='auto'?(target.type==='number'&&target.unique>8?'regression':'classification'):options.task;
  if(task==='regression'&&target.type!=='number')throw new Error('A numeric prediction needs a numeric target.');
  const features=p.columns.filter(c=>options.features.includes(c.index)&&c.index!==target.index&&['number','category'].includes(c.type));
  if(!features.length)throw new Error('Select at least one usable input column.');
  if(features.length>LIMITS.features)throw new Error('Choose 12 input columns or fewer.');
  if(features.some(c=>c.type==='category'&&c.unique>50))throw new Error('Remove text or identifier columns with more than 50 distinct values.');
  let rows=data.rows.filter(r=>!missing(r[target.index])&&(task!=='regression'||number(r[target.index])!==null));
  const excluded=data.rows.length-rows.length,seen=new Set();let duplicates=0;
  rows=rows.filter(r=>{const key=JSON.stringify([r[target.index],...features.map(c=>r[c.index]),...(options.split==='time'?[r[options.date]]:[])]);if(seen.has(key)){duplicates++;return false;}seen.add(key);return true;});
  const available=rows.length;
  if(rows.length<60)throw new Error('At least 60 distinct labelled rows are needed. Try a larger dataset or different inputs.');
  if(options.split==='time') {
    if(options.date==null || rows.some(r=>dateNumber(r[options.date])===null))throw new Error('For a time split, choose an ISO date column with no missing or invalid dates.');
    rows.sort((a,b)=>dateNumber(a[options.date])-dateNumber(b[options.date]));
    rows=rows.slice(-LIMITS.modelRows);
  } else rows=shuffle(rows).slice(0,LIMITS.modelRows);
  const classes=task==='classification'?[...new Set(rows.map(r=>r[target.index]))].sort():[];
  if(task==='classification'&&(classes.length<2||classes.length>8))throw new Error('Classification needs a target with 2 to 8 categories.');
  let training=[],testing=[];
  if(task==='classification'&&options.split!=='time') {
    for(const c of classes) {
      const group=rows.filter(r=>r[target.index]===c);if(group.length<10)throw new Error(`Each target category needs at least 10 distinct rows. "${c}" has ${group.length}.`);
      const n=Math.max(2,Math.round(group.length*.2));testing.push(...group.slice(0,n));training.push(...group.slice(n));
    }
  } else {
    let cut=Math.floor(rows.length*.8);
    if(options.split==='time') {while(cut>0&&dateNumber(rows[cut-1][options.date])===dateNumber(rows[cut][options.date]))cut--;}
    training=rows.slice(0,cut);testing=rows.slice(cut);
    if(training.length<40||testing.length<10)throw new Error('This split leaves too few rows. Use more distinct dates or a random split.');
  }
  if(task==='classification'&&classes.some(c=>training.filter(r=>r[target.index]===c).length<5))throw new Error('Some categories have too few training examples in this split.');
  const specs=encoder(training,features);if(!specs.length)throw new Error('The selected inputs contain no usable training values.');
  const X=training.map(r=>vector(r,specs)),dim=X[0].length;
  if(dim>120)throw new Error("Too many encoded categories. Select fewer categorical inputs.");
  const model={task,specs,classes,target:target.name,targetIndex:target.index};let metrics,baseline,points;
  if(task==='regression') {
    const y=training.map(r=>number(r[target.index]));model.yMean=mean(y);model.yScale=Math.sqrt(mean(y.map(v=>(v-model.yMean)**2)))||1;
    if(new Set(y).size<2)throw new Error('The target is constant in the training set. There is nothing to learn.');
    const A=Array.from({length:dim},()=>Array(dim).fill(0)),b=Array(dim).fill(0);
    X.forEach((x,k)=>{const yn=(y[k]-model.yMean)/model.yScale;for(let i=0;i<dim;i++){b[i]+=x[i]*yn;for(let j=0;j<dim;j++)A[i][j]+=x[i]*x[j];}});
    for(let i=1;i<dim;i++)A[i][i]+=1;A[0][0]+=1e-9;
    model.weights=solve(A,b);
    const actual=testing.map(r=>number(r[target.index])),predicted=testing.map(r=>predict(model,r));
    if(predicted.some(v=>!Number.isFinite(v)))throw new Error('These numeric ranges are too extreme for a stable model. Rescale the input first.');
    metrics=regressionMetrics(actual,predicted);baseline=regressionMetrics(actual,actual.map(()=>mean(y)));points=actual.map((a,i)=>[a,predicted[i]]).slice(0,300);
  } else {
    const Y=training.map(r=>classes.indexOf(r[target.index])),K=classes.length;
    const W=Array.from({length:K},()=>Array(dim).fill(0));
    for(let epoch=0;epoch<240;epoch++) {
      const G=Array.from({length:K},()=>Array(dim).fill(0));
      for(let n=0;n<X.length;n++) {
        const x=X[n],scores=W.map(w=>dot(x,w)),max=Math.max(...scores),ex=scores.map(s=>Math.exp(s-max)),sum=ex.reduce((a,b)=>a+b,0);
        for(let k=0;k<K;k++){const err=ex[k]/sum-+(Y[n]===k);for(let j=0;j<dim;j++)G[k][j]+=err*x[j];}
      }
      const lr=.2/Math.sqrt(1+epoch/60);
      for(let k=0;k<K;k++)for(let j=0;j<dim;j++)W[k][j]-=lr*(G[k][j]/X.length+(j===0?0:.005*W[k][j]));
    }
    model.weights=W;
    const actual=testing.map(r=>r[target.index]),predicted=testing.map(r=>predict(model,r));
    const counts=classes.map(c=>training.filter(r=>r[target.index]===c).length),majority=classes[counts.indexOf(Math.max(...counts))];
    metrics=classificationMetrics(actual,predicted,classes);baseline=classificationMetrics(actual,actual.map(()=>majority),classes);
  }
  const effects=[];let offset=1;
  for(const s of specs) {const count=s.type==='number'?1:s.levels.length+1;const weights=task==='regression'?[model.weights]:model.weights;let strength=0;for(const w of weights)for(let i=offset;i<offset+count;i++)strength+=Math.abs(w[i]);effects.push({name:s.name,strength});offset+=count;}
  return {model,metrics,baseline,points,effects:effects.sort((a,b)=>b.strength-a.strength),trainCount:training.length,testCount:testing.length,excluded,duplicates,sampled:available>LIMITS.modelRows,available,split:options.split||'random'};
}
export function csvText(headers,rows) {
  const escape=v=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s)&&number(s)===null)s="'"+s;return /[",\n\r]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;};
  return [headers,...rows].map(r=>r.map(escape).join(',')).join('\r\n');
}
export function demoData() {
  const random=seeded(91),headers=['trip_date','distance_km','elevation_m','temperature_c','traffic','bike_type','duration_min'];
  const rows=Array.from({length:420},(_,i)=>{
    const d=+(1+random()*18).toFixed(1),e=Math.round(random()*170),t=Math.round(5+random()*23),traffic=['Light','Moderate','Heavy'][Math.floor(random()*3)],bike=random()>.6?'Electric':'Standard';
    const duration=4+d*(bike==='Electric'?2.4:3.4)+e*.045+(traffic==='Heavy'?8:traffic==='Moderate'?3:0)+(random()-.5)*7;
    return [new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10),String(d),String(e),i%37===0?'':String(t),traffic,bike,String(+duration.toFixed(1))];
  });
  rows[36][1]='46.8';rows[111][2]='620';rows.push([...rows[12]],[...rows[54]]);
  return {headers,rows,delimiter:',',warnings:[],name:'city-bike-trips.csv',demo:true};
}
