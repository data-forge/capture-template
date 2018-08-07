import * as express from "express";
import * as http from 'http';
import * as path from "path";
import { ITemplate } from "../../export/build";

/**
 * Web-server component. Serves the chart interative chart.
 */
export interface IWebServer {

    /**
     * Get the URL to access the web-sever.
     */
    getUrl (): string;

    /**
     * Start the web-server.
     */
    /*async*/ start (data: any, template: ITemplate): Promise<void>;

    /**
     * Stop the web-server.
     */
    /*async*/ stop (): Promise<void>;
}

/**
 * Web-server component. Serves the chart interative chart.
 */
export class WebServer implements IWebServer {

    /**
     * The requested port number for the web server.
     */
    requestedPortNo: number;

    /**
     * The assigned port number for the web server.
     */
    assignedPortNo: number;

    /**
     * The Express server instance that implements the web-server.
     */
    server: any | null = null;

    /**
     * The data that defines the chart.
     * Passed to the browser-based chart via REST API.
     */
    chartDef: any = {};

    constructor (portNo: number) {
        this.requestedPortNo = portNo;
        this.assignedPortNo = portNo;
    }

    /**
     * Get the URL to access the web-sever.
     */
    getUrl (): string {
        return "http://127.0.0.1:" + this.assignedPortNo;
    }

    //
    // Load a file from the template, caching it as necesary.
    //
    private async loadTemplateFile(template: ITemplate, cache: any, url: string): Promise<string> {
        const cachedFileContent = cache[url];
        if (cachedFileContent) {
            return cachedFileContent;
        }

        const fileSystemPath = path.join(...url.split('/'));
        const templateFile = template.find(fileSystemPath);
        if (!templateFile) {
            throw new Error("Couldn't find file '" + url + "' in template.");
        }

        const expandedFileContent = await templateFile.expand();
        cache[url] = expandedFileContent;
        return expandedFileContent;
    }

    /**
     * Start the web-server.
     */
    start (data: any, template: ITemplate): Promise<void> { //TODO: Would be best if a higher-level interface than ITemplate was passed in here.
        return new Promise<void>((resolve, reject) => {
            const app = express();
            this.server = http.createServer(app);

            const fileCache: any = {};
    
            app.use("/", async (request, response, next) => {
                try {
                    const fileName = request.url === "/" 
                        ? "index.html"
                        : request.url;
                    const fileContent = await this.loadTemplateFile(template, fileCache, fileName);
                    response.send(fileContent);
                }
                catch (err) {
                    console.error("Error loading template file.");
                    console.error(err && err.stack || err);

                    response.sendStatus(404);
                }
            });
    
            app.get("/data", (request, response) => {
                response.json({
                    data: data,
                });
            });
            
            this.server.listen(this.requestedPortNo, (err: any) => {
                if (err) {
                    reject(err);
                }
                else {
                    this.assignedPortNo = this.server.address().port
                    resolve();
                }
            });
        });
    }

    /**
     * Stop the web-server.
     */
    /*async*/ stop (): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server.close((err: any) => {
                this.server = null;

                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    }
}
