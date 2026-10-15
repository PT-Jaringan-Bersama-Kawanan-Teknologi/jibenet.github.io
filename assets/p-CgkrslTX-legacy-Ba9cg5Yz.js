System.register(["./index-legacy-CA4KD1y6.js"],function(t,e){"use strict";var n,r,i;return{setters:[t=>{n=t.o,r=t.n,i=t.v}],execute:function(){
/*!
			 * (C) Ionic http://ionicframework.com - MIT License
			 */
t("createSwipeBackGesture",(t,e,o,s,c)=>{const a=t.ownerDocument.defaultView;let u=n(t);const l=t=>u?-t.deltaX:t.deltaX;return r({el:t,gestureName:"goback-swipe",gesturePriority:101,threshold:10,canStart:r=>(u=n(t),(t=>{const{startX:e}=t;return u?e>=a.innerWidth-50:e<=50})(r)&&e()),onStart:o,onMove:t=>{const e=l(t);s(e/a.innerWidth)},onEnd:t=>{const e=l(t),n=a.innerWidth,r=e/n,o=(h=t,u?-h.velocityX:h.velocityX),s=o>=0&&(o>.2||e>n/2),d=(s?1-r:r)*n;var h;let v=0;if(d>5){const t=d/Math.abs(o);v=Math.min(t,540)}c(s,r<=0?.01:i(0,r,.9999),v)}})})}}});
