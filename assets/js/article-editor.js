(function(){
"use strict";
var $=function(id){return document.getElementById(id);};
var root=$("editor"),source=$("source"),key="erichart-article-editor-draft-v1";
var mode="visual",range=null,saveTimer=null;
var fields=["articleTitle","slug","category","date","seoTitle","cover","coverType","coverVideo","excerpt"];
function validUrl(v){try{var u=new URL(v,location.href);return ["https:","http:"].indexOf(u.protocol)!==-1?u.href:"";}catch(e){return "";}}
function allowedHtml(raw){
 var doc=new DOMParser().parseFromString(String(raw||""),"text/html");
 var allowed=new Set(["p","h2","h3","h4","h5","h6","strong","b","em","i","u","s","br","ul","ol","li","blockquote","pre","code","a","img","hr","table","thead","tbody","tr","td","th","span","div","figure","figcaption","sup","sub"]);
 function nodeCopy(n){
  if(n.nodeType===3)return document.createTextNode(n.nodeValue||"");
  if(n.nodeType!==1)return document.createDocumentFragment();
  var tag=n.tagName.toLowerCase();
  if(["script","iframe","style","object","embed","svg","form","input","video","audio","template"].indexOf(tag)!==-1)return document.createDocumentFragment();
  var el=allowed.has(tag)?document.createElement(tag):document.createDocumentFragment();
  if(el.nodeType===1){
   if(tag==="a"){var href=validUrl(n.getAttribute("href"));if(href){el.setAttribute("href",href);el.setAttribute("target","_blank");el.setAttribute("rel","noopener noreferrer");}}
   if(tag==="img"){var src=validUrl(n.getAttribute("src"));if(!src)return document.createDocumentFragment();el.setAttribute("src",src);el.setAttribute("alt",n.getAttribute("alt")||"");}
   if(n.style){
    var align=n.style.textAlign, color=n.style.color, size=n.style.fontSize, family=n.style.fontFamily;
    if(["left","center","right","justify"].includes(align))el.style.textAlign=align;
    if(/^(#[0-9a-f]{3,8}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\))$/i.test(color))el.style.color=color;
    if(/^(1[2-9]|2[0-8])px$/.test(size))el.style.fontSize=size;
    if(/^(Arial|Georgia|SimSun|Microsoft YaHei|Times New Roman)(,.*)?$/i.test(family.replace(/["']/g,"")))el.style.fontFamily=family;
   }
   if(tag==="td"||tag==="th"){var col=Number(n.getAttribute("colspan"));if(col>=1&&col<=8)el.colSpan=col;}
  }
  Array.from(n.childNodes).forEach(function(child){el.appendChild(nodeCopy(child));});return el;
 }
 var wrap=document.createElement("div");Array.from(doc.body.childNodes).forEach(function(n){wrap.appendChild(nodeCopy(n));});return wrap.innerHTML;
}
function getHtml(){return allowedHtml(mode==="visual"?root.innerHTML:source.value);}
function saveRange(){var s=window.getSelection();if(s&&s.rangeCount&&root.contains(s.anchorNode))range=s.getRangeAt(0).cloneRange();}
function selectRange(){root.focus();if(!range)return;try{var s=window.getSelection();s.removeAllRanges();s.addRange(range);}catch(e){}}
function command(cmd,value){if(mode!=="visual")switchMode("visual");selectRange();document.execCommand(cmd,false,value||null);saveRange();changed();}
function applyStyle(prop,value){if(mode!=="visual")switchMode("visual");selectRange();var s=window.getSelection();if(!s||!s.rangeCount)return;var r=s.getRangeAt(0);if(r.collapsed){var block=r.startContainer.nodeType===1?r.startContainer:r.startContainer.parentElement;var p=block.closest("p,h2,h3,h4,h5,h6,blockquote,li");if(p){p.style[prop]=value;changed();}return;}
 var frag=r.extractContents(),span=document.createElement("span");span.style[prop]=value;span.appendChild(frag);r.insertNode(span);s.removeAllRanges();var nr=document.createRange();nr.selectNodeContents(span);s.addRange(nr);saveRange();changed();}
function switchMode(v){if(v===mode)return;if(v==="source"){source.value=getHtml();source.hidden=false;root.hidden=true;}else{root.innerHTML=allowedHtml(source.value);source.hidden=true;root.hidden=false;}mode=v;$("sourceMode").classList.toggle("selected",mode==="source");$("visualMode").classList.toggle("selected",mode==="visual");$("toolbar").hidden=mode==="source";changed();}
function status(str){$("savedStatus").textContent=str;}
function changed(){status("未保存到网站");$("stats").textContent=(mode==="visual"?root.textContent:source.value.replace(/<[^>]*>/g,"")).trim().length+" 字";clearTimeout(saveTimer);saveTimer=setTimeout(function(){try{var draft={body:getHtml()};fields.forEach(function(k){draft[k]=$(k).value;});localStorage.setItem(key,JSON.stringify(draft));status("本机草稿已保存");}catch(e){status("浏览器草稿存储不可用");}},500);}
function resetDraft(){localStorage.removeItem(key);fields.forEach(function(f){$(f).value="";});$("category").value="Google SEO";$("coverType").value="image";$("date").value=new Date().toLocaleDateString("en-CA");root.innerHTML="<p>开始撰写文章…</p>";source.value="";if(mode==="source")switchMode("visual");changed();}
function importDraft(d){if(!d||typeof d!=="object")throw Error("不是有效的文章数据");fields.forEach(function(k){if(typeof d[k]==="string")$(k).value=d[k];});root.innerHTML=allowedHtml(d.body||"");source.value=root.innerHTML;if(mode==="source")source.hidden=false;changed();}
function payload(){var p={slug:$("slug").value.trim(),title:$("articleTitle").value.trim(),published:false,date:$("date").value,category:$("category").value,cover:$("cover").value.trim(),coverType:$("coverType").value,coverVideo:$("coverVideo").value.trim(),excerpt:$("excerpt").value.trim(),body:getHtml(),font:"system",fontSize:"16",align:"left",seoTitle:$("seoTitle").value.trim(),seoDescription:$("excerpt").value.trim()};if(!p.slug||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug))throw Error("文章标识必须为英文小写、数字与连字符，并且不能为空");if(!p.title)throw Error("请填写文章标题");if(!p.body.trim())throw Error("文章正文不能为空");return p;}
function copy(text){if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(text);var t=document.createElement("textarea");t.value=text;document.body.appendChild(t);t.select();document.execCommand("copy");t.remove();return Promise.resolve();}
function init(){try{var old=localStorage.getItem(key);if(old)importDraft(JSON.parse(old));else $("date").value=new Date().toLocaleDateString("en-CA");}catch(e){status("无法读取本地草稿");}
 document.addEventListener("selectionchange",saveRange);
 root.addEventListener("input",changed);source.addEventListener("input",changed);
 fields.forEach(function(k){$(k).addEventListener("input",changed);});
 $("toolbar").addEventListener("mousedown",function(e){if(e.target.closest("button"))e.preventDefault();});
 document.querySelectorAll("[data-cmd]").forEach(function(b){b.addEventListener("click",function(){command(b.getAttribute("data-cmd"));});});
 $("format").addEventListener("change",function(){command("formatBlock","<"+this.value+">");});
 $("font").addEventListener("change",function(){applyStyle("fontFamily",this.value);});
 $("fontSize").addEventListener("change",function(){applyStyle("fontSize",this.value+"px");});
 $("color").addEventListener("input",function(){applyStyle("color",this.value);});
 $("insertLink").addEventListener("click",function(){var u=prompt("输入HTTPS超链接：","https://");if(u===null)return;if(!validUrl(u)){alert("请输入有效的HTTP(S)链接");return;}command("createLink",validUrl(u));});
 $("insertImage").addEventListener("click",function(){var u=prompt("输入已经上传到Pages CMS的图片地址：","/assets/img/");if(u===null)return;if(!validUrl(u)){alert("请输入有效的图片URL");return;}command("insertImage",validUrl(u));});
 $("insertTable").addEventListener("click",function(){command("insertHTML",'<table><tbody><tr><th>栏目一</th><th>栏目二</th></tr><tr><td>内容一</td><td>内容二</td></tr></tbody></table><p></p>');});
 $("visualMode").addEventListener("click",function(){switchMode("visual");});
 $("sourceMode").addEventListener("click",function(){switchMode("source");});
 $("copy").addEventListener("click",function(){copy(getHtml()).then(function(){alert("正文HTML已复制。请在Pages CMS正文切换到Source模式，粘贴并保存。");}).catch(function(){alert("复制失败，请使用HTML源码模式手动复制。");});});
 $("download").addEventListener("click",function(){try{var v=payload();var blob=new Blob([JSON.stringify(v,null,2)+"\n"],{type:"application/json;charset=utf-8"});var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=v.slug+".json";a.click();setTimeout(function(){URL.revokeObjectURL(a.href);},500);}catch(e){alert(e.message);}});
 $("importFile").addEventListener("change",function(){var file=this.files&&this.files[0];if(!file)return;if(file.size>3e6){alert("导入文件不能超过3MB");return;}var reader=new FileReader();reader.onload=function(){try{var o=JSON.parse(reader.result);importDraft(Array.isArray(o)?o[0]:o);alert("已加载到编辑器，尚未发布。");}catch(e){alert("无法导入JSON："+e.message);}};reader.readAsText(file);this.value="";});
 $("clear").addEventListener("click",function(){if(confirm("确定清空当前浏览器的文章草稿？此操作不可撤销。"))resetDraft();});
 changed();}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();