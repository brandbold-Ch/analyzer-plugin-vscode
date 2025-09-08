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

	// --- FUNCIÓN AUXILIAR DE SANITIZACIÓN ---
	// Esta función simple previene errores de renderizado si los datos contienen caracteres HTML.
	private sanitize(text: string | null | undefined): string {
		if (text === null || typeof text === 'undefined') {
			return '';
		}
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	private getHtmlContent(modules: any[]): string {
		const listItems = modules.length > 0
			? modules.map(m => {
				try {
					if (!m || !m.base) {
						return `<details><summary style="color: red;">Error: Paquete con formato inválido</summary></details>`;
					}

					const functions = m.base.functions || [];
					const classes = m.base.classes || [];

					const functionsHtml = functions.map((func: any) => `
                    <li>
                        <p><strong>${this.sanitize(func.name) || 'N/A'}</strong><code>${this.sanitize(func.signature) || ''}</code></p>
                        ${func.doc ? `<pre>${this.sanitize(func.doc)}</pre>` : ''}
                    </li>
                `).join("");

					const classesHtml = classes.map((cls: any) => `
                    <li>
                        <details>
                            <summary class="class-summary"><strong>class</strong> ${this.sanitize(cls.name) || 'N/A'}</summary>
                            ${cls.doc ? `<pre class="class-doc">${this.sanitize(cls.doc)}</pre>` : ''}
                            <ul>
                                ${(cls.functions || []).map((method: any) => `
                                    <li>
                                        <p><strong>${this.sanitize(method.name) || 'N/A'}</strong><code>${this.sanitize(method.signature) || ''}</code></p>
                                        ${method.doc ? `<pre>${this.sanitize(method.doc)}</pre>` : ''}
                                    </li>
                                `).join("")}
                            </ul>
                        </details>
                    </li>
                `).join("");

					return `
                    <details open>
                        <summary class="package-summary">${this.sanitize(m.package) || 'Paquete sin nombre'}</summary>
                        <div class="package-content">
                            ${functionsHtml ? `<h4>Functions</h4><ul>${functionsHtml}</ul>` : ''}
                            ${classesHtml ? `<h4>Classes</h4><ul>${classesHtml}</ul>` : ''}
                        </div>
                    </details>
                `;
				} catch (e) {
					console.error('Error al renderizar el paquete:', m ? m.package : 'desconocido', e);
					return `<details>
                            <summary style="color: red;">Error al procesar: ${this.sanitize(m ? m.package : '') || 'paquete desconocido'}</summary>
                            <pre>${e instanceof Error ? this.sanitize(e.message) : this.sanitize(String(e))}</pre>
                        </details>`;
				}
			}).join("")
			: "<h4>Ejecuta 'Inspect Packages' para ver los resultados.</h4>";

		// El HTML principal y los estilos se mantienen igual
		return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Package Analyzer</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 5px 10px; }
            code { font-family: 'Courier New', Courier, monospace; background-color: rgba(200, 200, 200, 0.2); padding: 0.1em 0.3em; border-radius: 3px; margin-left: 8px; }
            ul { list-style-type: none; padding-left: 15px; }
            details { border: 1px solid rgba(128, 128, 128, 0.2); border-radius: 4px; margin-bottom: 8px; padding: 5px; }
            details[open] { background-color: rgba(128, 128, 128, 0.05); }
            summary { font-weight: bold; cursor: pointer; }
            .package-summary { font-size: 1.2em; }
            .class-summary { color: #0969da; }
            pre { background-color: rgba(200, 200, 200, 0.1); border-left: 3px solid #0969da; padding: 10px; margin: 5px 0 10px 0; white-space: pre-wrap; word-wrap: break-word; font-size: 0.9em; }
            p { margin: 8px 0 2px 0; }
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