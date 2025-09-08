import * as vscode from 'vscode';
import { execFile } from 'child_process';
import * as path from 'path';
import { readFileSync } from 'fs';

class SidebarProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "package-analyzer.sidebar";
	private _view?: vscode.WebviewView;

	constructor(private readonly _context: vscode.ExtensionContext) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Permitir scripts en el webview
			enableScripts: true,
			// Restringir el webview a cargar contenido solo desde nuestro directorio de extensión.
			localResourceRoots: [this._context.extensionUri]
		};

		// Inicialmente, la vista está vacía o con un mensaje de bienvenida
		webviewView.webview.html = this.getHtmlContent([]);
	}

	public update(data: any[]) {
		if (this._view) {
			this._view.webview.html = this.getHtmlContent(data);
		}
	}

	private sanitize(text: string | null | undefined): string {
		if (text === null || typeof text === 'undefined') return '';
		return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
	}

	// --- INICIO DE LA VERSIÓN MEJORADA ---
	private cleanDocInSignature(signature: string): string {
		const docRegex = /Doc\((['"])([\s\S]*?)\1\)/g;
		return signature.replace(docRegex, (match, quote, docstring) => {
			const cleanedDocstring = docstring
				.split('\n')
				.map((line: string) => line.trim())
				.filter((line: string) => line)
				.join(' ');
			return `Doc(${quote}${cleanedDocstring}${quote})`;
		});
	}

	private formatSignature(signature: string | null | undefined): string {
		if (!signature) return '';

		const cleanedSignature = this.cleanDocInSignature(signature);
		const sanitizedSignature = this.sanitize(cleanedSignature);

		const openParen = sanitizedSignature.indexOf('(');
		const closeParen = sanitizedSignature.lastIndexOf(')');

		if (openParen === -1 || closeParen === -1 || closeParen < openParen) {
			return sanitizedSignature;
		}

		const funcName = sanitizedSignature.substring(0, openParen).trim();
		let paramsStr = sanitizedSignature.substring(openParen + 1, closeParen);
		const returnType = sanitizedSignature.substring(closeParen + 1);

		// Clave: Normalizar el string de parámetros eliminando saltos de línea y espacios extra.
		paramsStr = paramsStr.replace(/\s*\n\s*/g, ' ').trim();

		if (paramsStr.length === 0) return `${funcName}()${returnType}`;

		const params = [];
		let currentParam = '';
		let depth = 0;

		for (const char of paramsStr) {
			if (char === '(' || char === '[' || char === '{') depth++;
			else if (char === ')' || char === ']' || char === '}') depth--;

			if (char === ',' && depth === 0) {
				params.push(currentParam.trim());
				currentParam = '';
			} else {
				currentParam += char;
			}
		}
		params.push(currentParam.trim());

		const finalParams = params.filter(p => p);

		// Si es una firma corta con 1 o 2 parámetros, la dejamos en una línea.
		if (finalParams.length <= 2 && sanitizedSignature.length < 100) {
			return `${funcName}(${finalParams.join(', ')})${returnType}`;
		}

		// Para firmas largas, formateamos a multi-línea.
		const formattedParams = finalParams.map(p => `    ${p}`).join(',\n');

		return `${funcName}(\n${formattedParams}\n)${returnType}`;
	}
	// --- FIN DE LA VERSIÓN MEJORADA ---

	private getHtmlContent(modules: any[]): string {
		const listItems = modules.length > 0
			? modules.map(m => {
				try {
					if (!m || !m.base) return `<div class="error-item">Error: Paquete inválido</div>`;

					const functions = m.base.functions || [];
					const classes = m.base.classes || [];

					const functionsHtml = functions.map((func: any) => {
						const signatureText = this.formatSignature(`${func.name}${func.signature}`);
						return `
                        <div class="item-container">
                            <div class="item-header">
                                <span class="icon function-icon">ƒ</span>
                                <strong class="name">${this.sanitize(func.name) || 'N/A'}</strong>
                            </div>
                            <pre class="signature-pre"><code>${signatureText}</code></pre>
                            ${func.doc ? `<pre class="docstring">${this.sanitize(func.doc)}</pre>` : ''}
                        </div>
                    `}).join("");

					const classesHtml = classes.map((cls: any) => `
                        <details class="class-details">
                            <summary>
                                <span class="icon class-icon">C</span>
                                <strong class="name">class ${this.sanitize(cls.name) || 'N/A'}</strong>
                            </summary>
                            <div class="class-body">
                                ${cls.doc ? `<pre class="docstring class-doc">${this.sanitize(cls.doc)}</pre>` : ''}
                                ${(cls.functions || []).map((method: any) => {
						const methodSignatureText = this.formatSignature(`${method.name}${method.signature}`);
						return `
                                    <div class="item-container method-container">
                                        <div class="item-header">
                                            <span class="icon method-icon">M</span>
                                            <strong class="name">${this.sanitize(method.name) || 'N/A'}</strong>
                                        </div>
                                        <pre class="signature-pre"><code>${methodSignatureText}</code></pre>
                                        ${method.doc ? `<pre class="docstring">${this.sanitize(method.doc)}</pre>` : ''}
                                    </div>
                                `}).join("")}
                            </div>
                        </details>
                    `).join("");

					return `
                        <details class="package-details" open>
                            <summary class="package-summary">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8.86 1.13a.5.5 0 0 0-.72 0l-4.25 4.25a.5.5 0 0 0 0 .7l.73.74a.5.5 0 0 0 .7 0L8 4.28l2.72 2.72a.5.5 0 0 0 .7 0l.73-.74a.5.5 0 0 0 0-.7L8.86 1.13ZM3.7 9.51l-1.1 1.1c-.2.2-.2.51 0 .7l.73.74c.2.2.5.2.7 0l1.1-1.1a.5.5 0 0 0-.7-.7L3.7 9.51Zm8.6 0-.7.7a.5.5 0 0 0 .7.7l1.1-1.1a.5.5 0 0 0 0-.7l-.73-.74a.5.5 0 0 0-.7 0l.7.7ZM8 11.72l-2.72 2.72a.5.5 0 0 0 0 .7l.73.74a.5.5 0 0 0 .7 0L8 13.14l2.72 2.72a.5.5 0 0 0 .7 0l.73-.74a.5.5 0 0 0 0-.7L8 11.72Z"></path></svg>
                                ${this.sanitize(m.package) || 'Paquete sin nombre'}
                            </summary>
                            <div class="package-content">
                                ${functionsHtml ? `<h4>Functions</h4>${functionsHtml}` : ''}
                                ${classesHtml ? `<h4>Classes</h4>${classesHtml}` : ''}
                            </div>
                        </details>
                    `;
				} catch (e) {
					console.error('Error al renderizar el paquete:', m ? m.package : 'desconocido', e);
					return `<div class="error-item">Error al procesar: ${this.sanitize(m ? m.package : '') || 'paquete desconocido'}</div>`;
				}
			}).join("")
			: `<div class="welcome-message"><h4>Ejecuta 'Inspect Packages' para ver los resultados.</h4></div>`;

		return `
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
            ${listItems}
        </body>
        </html>`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}


export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "package-analyzer" is now active!');

	const sidebarProvider = new SidebarProvider(context);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			SidebarProvider.viewType,
			sidebarProvider
		)
	);

	const disposable = vscode.commands.registerCommand('package-analyzer.inspect', () => {

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Analyzing packages...",
			cancellable: false
		}, (progress) => {
			progress.report({ increment: 0 });

			const scriptPath = path.join(context.extensionPath, 'python', 'script.py');
			const jsonPath = path.join(context.extensionPath, 'python', 'data.json');

			return new Promise<void>(resolve => {
				execFile('python', [scriptPath], (error, stdout, stderr) => {
					if (error) {
						vscode.window.showErrorMessage(`Error executing script: ${error.message}`);
						resolve();
						return;
					}
					if (stderr) {
						vscode.window.showErrorMessage(`Python stderr: ${stderr}`);
						resolve();
						return;
					}

					try {
						const data = JSON.parse(readFileSync(jsonPath, 'utf-8'));
						sidebarProvider.update(data); 
						vscode.window.showInformationMessage("Package analysis complete!");
					} catch (e) {
						vscode.window.showErrorMessage(`Error parsing data.json: ${e}`);
					}

					progress.report({ increment: 100 });
					resolve();
				});
			});
		});
	});

	context.subscriptions.push(disposable);
}

export function deactivate() { }