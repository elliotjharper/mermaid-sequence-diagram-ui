import{a as F}from"./chunk-DX2KS5OT.js";import{a as _}from"./chunk-2XHOXA44.js";import"./chunk-FB7L5IGW.js";import"./chunk-QL37M2GK.js";import"./chunk-RQBE5H4E.js";import"./chunk-X3TEJXCB.js";import"./chunk-SIS52AS7.js";import"./chunk-SJOCS2JA.js";import{a as E}from"./chunk-YHDRG5ST.js";import{l as y}from"./chunk-E7LIQX2C.js";import"./chunk-KMQRAFUQ.js";import{P as L,Q as T,R as O,S,T as k,U as R,V as I,o as M,q as A,y as w}from"./chunk-THZ5HTBN.js";import{b as o,d as b}from"./chunk-B5LBP65L.js";import"./chunk-2GZW2XWB.js";import"./chunk-APJUBL5S.js";import"./chunk-BYZEYO7O.js";import"./chunk-MOFZY53X.js";import"./chunk-2FSENJOC.js";import{a as C}from"./chunk-6PMQQMX7.js";var h={showLegend:!0,ticks:5,max:null,min:0,graticule:"circle"},D={axes:[],curves:[],options:h},m=structuredClone(D),j=A.radar,N=o(()=>y(C(C({},j),w().radar)),"getConfig"),G=o(()=>m.axes,"getAxes"),U=o(()=>m.curves,"getCurves"),X=o(()=>m.options,"getOptions"),Y=o(a=>{m.axes=a.map(t=>({name:t.name,label:t.label??t.name}))},"setAxes"),Z=o(a=>{m.curves=a.map(t=>({name:t.name,label:t.label??t.name,entries:q(t.entries)}))},"setCurves"),q=o(a=>{if(a[0].axis==null)return a.map(e=>e.value);let t=G();if(t.length===0)throw new Error("Axes must be populated before curves for reference entries");return t.map(e=>{let r=a.find(n=>n.axis?.$refText===e.name);if(r===void 0)throw new Error("Missing entry for axis "+e.label);return r.value})},"computeCurveEntries"),J=o(a=>{let t=a.reduce((e,r)=>(e[r.name]=r,e),{});m.options={showLegend:t.showLegend?.value??h.showLegend,ticks:t.ticks?.value??h.ticks,max:t.max?.value??h.max,min:t.min?.value??h.min,graticule:t.graticule?.value??h.graticule}},"setOptions"),K=o(()=>{L(),m=structuredClone(D)},"clear"),$={getAxes:G,getCurves:U,getOptions:X,setAxes:Y,setCurves:Z,setOptions:J,getConfig:N,clear:K,setAccTitle:T,getAccTitle:O,setDiagramTitle:R,getDiagramTitle:I,getAccDescription:k,setAccDescription:S},Q=o(a=>{F(a,$);let{axes:t,curves:e,options:r}=a;$.setAxes(t),$.setCurves(e),$.setOptions(r)},"populate"),tt={parse:o(async a=>{let t=await _("radar",a);b.debug(t),Q(t)},"parse")},et=o((a,t,e,r)=>{let n=r.db,i=n.getAxes(),l=n.getCurves(),s=n.getOptions(),c=n.getConfig(),d=n.getDiagramTitle(),p=E(t),u=at(p,c),g=s.max??Math.max(...l.map(f=>Math.max(...f.entries))),x=s.min,v=Math.min(c.width,c.height)/2;rt(u,i,v,s.ticks,s.graticule),nt(u,i,v,c),P(u,i,l,x,g,s.graticule,c),W(u,l,s.showLegend,c),u.append("text").attr("class","radarTitle").text(d).attr("x",0).attr("y",-c.height/2-c.marginTop)},"draw"),at=o((a,t)=>{let e=t.width+t.marginLeft+t.marginRight,r=t.height+t.marginTop+t.marginBottom,n={x:t.marginLeft+t.width/2,y:t.marginTop+t.height/2};return a.attr("viewbox",`0 0 ${e} ${r}`).attr("width",e).attr("height",r),a.append("g").attr("transform",`translate(${n.x}, ${n.y})`)},"drawFrame"),rt=o((a,t,e,r,n)=>{if(n==="circle")for(let i=0;i<r;i++){let l=e*(i+1)/r;a.append("circle").attr("r",l).attr("class","radarGraticule")}else if(n==="polygon"){let i=t.length;for(let l=0;l<r;l++){let s=e*(l+1)/r,c=t.map((d,p)=>{let u=2*p*Math.PI/i-Math.PI/2,g=s*Math.cos(u),x=s*Math.sin(u);return`${g},${x}`}).join(" ");a.append("polygon").attr("points",c).attr("class","radarGraticule")}}},"drawGraticule"),nt=o((a,t,e,r)=>{let n=t.length;for(let i=0;i<n;i++){let l=t[i].label,s=2*i*Math.PI/n-Math.PI/2;a.append("line").attr("x1",0).attr("y1",0).attr("x2",e*r.axisScaleFactor*Math.cos(s)).attr("y2",e*r.axisScaleFactor*Math.sin(s)).attr("class","radarAxisLine"),a.append("text").text(l).attr("x",e*r.axisLabelFactor*Math.cos(s)).attr("y",e*r.axisLabelFactor*Math.sin(s)).attr("class","radarAxisLabel")}},"drawAxes");function P(a,t,e,r,n,i,l){let s=t.length,c=Math.min(l.width,l.height)/2;e.forEach((d,p)=>{if(d.entries.length!==s)return;let u=d.entries.map((g,x)=>{let v=2*Math.PI*x/s-Math.PI/2,f=z(g,r,n,c),B=f*Math.cos(v),H=f*Math.sin(v);return{x:B,y:H}});i==="circle"?a.append("path").attr("d",V(u,l.curveTension)).attr("class",`radarCurve-${p}`):i==="polygon"&&a.append("polygon").attr("points",u.map(g=>`${g.x},${g.y}`).join(" ")).attr("class",`radarCurve-${p}`)})}o(P,"drawCurves");function z(a,t,e,r){let n=Math.min(Math.max(a,t),e);return r*(n-t)/(e-t)}o(z,"relativeRadius");function V(a,t){let e=a.length,r=`M${a[0].x},${a[0].y}`;for(let n=0;n<e;n++){let i=a[(n-1+e)%e],l=a[n],s=a[(n+1)%e],c=a[(n+2)%e],d={x:l.x+(s.x-i.x)*t,y:l.y+(s.y-i.y)*t},p={x:s.x-(c.x-l.x)*t,y:s.y-(c.y-l.y)*t};r+=` C${d.x},${d.y} ${p.x},${p.y} ${s.x},${s.y}`}return`${r} Z`}o(V,"closedRoundCurve");function W(a,t,e,r){if(!e)return;let n=(r.width/2+r.marginRight)*3/4,i=-(r.height/2+r.marginTop)*3/4,l=20;t.forEach((s,c)=>{let d=a.append("g").attr("transform",`translate(${n}, ${i+c*l})`);d.append("rect").attr("width",12).attr("height",12).attr("class",`radarLegendBox-${c}`),d.append("text").attr("x",16).attr("y",0).attr("class","radarLegendText").text(s.label)})}o(W,"drawLegend");var st={draw:et},ot=o((a,t)=>{let e="";for(let r=0;r<a.THEME_COLOR_LIMIT;r++){let n=a[`cScale${r}`];e+=`
		.radarCurve-${r} {
			color: ${n};
			fill: ${n};
			fill-opacity: ${t.curveOpacity};
			stroke: ${n};
			stroke-width: ${t.curveStrokeWidth};
		}
		.radarLegendBox-${r} {
			fill: ${n};
			fill-opacity: ${t.curveOpacity};
			stroke: ${n};
		}
		`}return e},"genIndexStyles"),it=o(a=>{let t=M(),e=w(),r=y(t,e.themeVariables),n=y(r.radar,a);return{themeVariables:r,radarOptions:n}},"buildRadarStyleOptions"),lt=o(({radar:a}={})=>{let{themeVariables:t,radarOptions:e}=it(a);return`
	.radarTitle {
		font-size: ${t.fontSize};
		color: ${t.titleColor};
		dominant-baseline: hanging;
		text-anchor: middle;
	}
	.radarAxisLine {
		stroke: ${e.axisColor};
		stroke-width: ${e.axisStrokeWidth};
	}
	.radarAxisLabel {
		dominant-baseline: middle;
		text-anchor: middle;
		font-size: ${e.axisLabelFontSize}px;
		color: ${e.axisColor};
	}
	.radarGraticule {
		fill: ${e.graticuleColor};
		fill-opacity: ${e.graticuleOpacity};
		stroke: ${e.graticuleColor};
		stroke-width: ${e.graticuleStrokeWidth};
	}
	.radarLegendText {
		text-anchor: start;
		font-size: ${e.legendFontSize}px;
		dominant-baseline: hanging;
	}
	${ot(t,e)}
	`},"styles"),ht={parser:tt,db:$,renderer:st,styles:lt};export{ht as diagram};
