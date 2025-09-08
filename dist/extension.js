"use strict";var $=Object.create;var u=Object.defineProperty;var P=Object.getOwnPropertyDescriptor;var z=Object.getOwnPropertyNames;var C=Object.getPrototypeOf,S=Object.prototype.hasOwnProperty;var j=(a,e)=>{for(var r in e)u(a,r,{get:e[r],enumerable:!0})},w=(a,e,r,t)=>{if(e&&typeof e=="object"||typeof e=="function")for(let s of z(e))!S.call(a,s)&&s!==r&&u(a,s,{get:()=>e[s],enumerable:!(t=P(e,s))||t.enumerable});return a};var b=(a,e,r)=>(r=a!=null?$(C(a)):{},w(e||!a||!a.__esModule?u(r,"default",{value:a,enumerable:!0}):r,a)),E=a=>w(u({},"__esModule",{value:!0}),a);var A={};j(A,{activate:()=>M,deactivate:()=>B});module.exports=E(A);var d=b(require("vscode")),x=require("child_process"),f=b(require("path")),y=require("fs"),m=class{constructor(e){this._context=e}static viewType="package-analyzer.sidebar";_view;resolveWebviewView(e,r,t){this._view=e,e.webview.options={enableScripts:!0,localResourceRoots:[this._context.extensionUri]},e.webview.html=this.getHtmlContent([])}update(e){this._view&&(this._view.webview.html=this.getHtmlContent(e))}sanitize(e){return e===null||typeof e>"u"?"":e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}cleanDocInSignature(e){let r=/Doc\((['"])([\s\S]*?)\1\)/g;return e.replace(r,(t,s,p)=>{let c=p.split(`
`).map(o=>o.trim()).filter(o=>o).join(" ");return`Doc(${s}${c}${s})`})}formatSignature(e){if(!e)return"";let r=this.cleanDocInSignature(e),t=this.sanitize(r),s=t.indexOf("("),p=t.lastIndexOf(")");if(s===-1||p===-1||p<s)return t;let c=t.substring(0,s).trim(),o=t.substring(s+1,p),n=t.substring(p+1);if(o=o.replace(/\s*\n\s*/g," ").trim(),o.length===0)return`${c}()${n}`;let i=[],g="",v=0;for(let l of o)l==="("||l==="["||l==="{"?v++:(l===")"||l==="]"||l==="}")&&v--,l===","&&v===0?(i.push(g.trim()),g=""):g+=l;i.push(g.trim());let h=i.filter(l=>l);if(h.length<=2&&t.length<100)return`${c}(${h.join(", ")})${n}`;let k=h.map(l=>`    ${l}`).join(`,
`);return`${c}(
${k}
)${n}`}getHtmlContent(e){return`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src 'self';">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Package Analyzer</title>
            <style>
                body {
                    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif);
                    background-color: var(--vscode-sideBar-background);
                    color: var(--vscode-sideBar-foreground);
                    padding: 0 5px;
                }
                code {
                    font-family: var(--vscode-editor-font-family, 'Courier New', Courier, monospace);
                    font-size: 0.9em;
                }
                .package-details {
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                    margin-bottom: 10px;
                }
                .package-details[open] { background-color: var(--vscode-sideBar-sectionHeaderBackground); }
                .package-summary {
                    font-size: 1.1em;
                    font-weight: bold;
                    padding: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .item-container {
                    padding: 8px 12px;
                    margin: 4px;
                    border-left: 2px solid transparent;
                }
                .item-header { display: flex; align-items: center; gap: 8px; }
                .name { font-weight: 500; }
                
                .signature-pre {
                    margin: 8px 0 0 0;
                    padding: 8px;
                    background-color: var(--vscode-textCodeBlock-background);
                    border-radius: 4px;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                }
                .docstring {
                    background-color: var(--vscode-textBlockQuote-background);
                    border-left: 3px solid var(--vscode-textBlockQuote-border);
                    padding: 10px;
                    margin: 8px 0 0 0;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    font-size: 0.9em;
                    color: var(--vscode-descriptionForeground);
                    border-radius: 0 4px 4px 0;
                }
                .icon {
                    font-weight: bold;
                    width: 18px;
                    height: 18px;
                    text-align: center;
                    border-radius: 3px;
                    color: var(--vscode-button-foreground);
                    flex-shrink: 0;
                }
                .function-icon { background-color: #6a43bf; }
                .class-icon { background-color: #bf8c43; }
                .method-icon { background-color: #43bfac; }

                .class-details {
                    margin: 4px;
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 3px;
                }
                .class-body { padding: 0 5px 5px 25px; }
            </style>
        </head>
        <body>
            <h3>Package Analyzer</h3>
            ${e.length>0?e.map(t=>{try{if(!t||!t.base)return'<div class="error-item">Error: Paquete inv\xE1lido</div>';let s=t.base.functions||[],p=t.base.classes||[],c=s.map(n=>{let i=this.formatSignature(`${n.name}${n.signature}`);return`
                        <div class="item-container">
                            <div class="item-header">
                                <span class="icon function-icon">\u0192</span>
                                <strong class="name">${this.sanitize(n.name)||"N/A"}</strong>
                            </div>
                            <pre class="signature-pre"><code>${i}</code></pre>
                            ${n.doc?`<pre class="docstring">${this.sanitize(n.doc)}</pre>`:""}
                        </div>
                    `}).join(""),o=p.map(n=>`
                        <details class="class-details">
                            <summary>
                                <span class="icon class-icon">C</span>
                                <strong class="name">class ${this.sanitize(n.name)||"N/A"}</strong>
                            </summary>
                            <div class="class-body">
                                ${n.doc?`<pre class="docstring class-doc">${this.sanitize(n.doc)}</pre>`:""}
                                ${(n.functions||[]).map(i=>{let g=this.formatSignature(`${i.name}${i.signature}`);return`
                                    <div class="item-container method-container">
                                        <div class="item-header">
                                            <span class="icon method-icon">M</span>
                                            <strong class="name">${this.sanitize(i.name)||"N/A"}</strong>
                                        </div>
                                        <pre class="signature-pre"><code>${g}</code></pre>
                                        ${i.doc?`<pre class="docstring">${this.sanitize(i.doc)}</pre>`:""}
                                    </div>
                                `}).join("")}
                            </div>
                        </details>
                    `).join("");return`
                        <details class="package-details" open>
                            <summary class="package-summary">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8.86 1.13a.5.5 0 0 0-.72 0l-4.25 4.25a.5.5 0 0 0 0 .7l.73.74a.5.5 0 0 0 .7 0L8 4.28l2.72 2.72a.5.5 0 0 0 .7 0l.73-.74a.5.5 0 0 0 0-.7L8.86 1.13ZM3.7 9.51l-1.1 1.1c-.2.2-.2.51 0 .7l.73.74c.2.2.5.2.7 0l1.1-1.1a.5.5 0 0 0-.7-.7L3.7 9.51Zm8.6 0-.7.7a.5.5 0 0 0 .7.7l1.1-1.1a.5.5 0 0 0 0-.7l-.73-.74a.5.5 0 0 0-.7 0l.7.7ZM8 11.72l-2.72 2.72a.5.5 0 0 0 0 .7l.73.74a.5.5 0 0 0 .7 0L8 13.14l2.72 2.72a.5.5 0 0 0 .7 0l.73-.74a.5.5 0 0 0 0-.7L8 11.72Z"></path></svg>
                                ${this.sanitize(t.package)||"Paquete sin nombre"}
                            </summary>
                            <div class="package-content">
                                ${c?`<h4>Functions</h4>${c}`:""}
                                ${o?`<h4>Classes</h4>${o}`:""}
                            </div>
                        </details>
                    `}catch(s){return console.error("Error al renderizar el paquete:",t?t.package:"desconocido",s),`<div class="error-item">Error al procesar: ${this.sanitize(t?t.package:"")||"paquete desconocido"}</div>`}}).join(""):`<div class="welcome-message"><h4>Ejecuta 'Inspect Packages' para ver los resultados.</h4></div>`}
        </body>
        </html>`}};function M(a){console.log('Congratulations, your extension "package-analyzer" is now active!');let e=new m(a);a.subscriptions.push(d.window.registerWebviewViewProvider(m.viewType,e));let r=d.commands.registerCommand("package-analyzer.inspect",()=>{d.window.withProgress({location:d.ProgressLocation.Notification,title:"Analyzing packages...",cancellable:!1},t=>{t.report({increment:0});let s=f.join(a.extensionPath,"python","script.py"),p=f.join(a.extensionPath,"python","data.json");return new Promise(c=>{(0,x.execFile)("python",[s],(o,n,i)=>{if(o){d.window.showErrorMessage(`Error executing script: ${o.message}`),c();return}if(i){d.window.showErrorMessage(`Python stderr: ${i}`),c();return}try{let g=JSON.parse((0,y.readFileSync)(p,"utf-8"));e.update(g),d.window.showInformationMessage("Package analysis complete!")}catch(g){d.window.showErrorMessage(`Error parsing data.json: ${g}`)}t.report({increment:100}),c()})})})});a.subscriptions.push(r)}function B(){}0&&(module.exports={activate,deactivate});
