import * as express from "express";
import * as http from 'http';
import * as path from "path";
import { ITemplate } from 'inflate-template';
import { ILog } from "./index";
import * as mime from "mime-types";

/**
 * Defines an in-memory file served by the web server.
 */
export interface IInMemoryFile {
    /**
     * The name of the file.
     */
    file: string;

    /**
     * The content of the file.
     */
    content: string;
}

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
     * Optinally override logging.
     */
    private log?: ILog;

    /**
     * The requested port number for the web server.
     */
    private requestedPortNo: number;

    /**
     * The assigned port number for the web server.
     */
    private assignedPortNo: number;

    /**
     * The Express server instance that implements the web-server.
     */
    private server: any | null = null;

    /**
     * The data that defines the chart.
     * Passed to the browser-based chart via REST API.
     */
    private chartDef: any = {};

    constructor (portNo: number, log?: ILog) {
        this.requestedPortNo = portNo;
        this.assignedPortNo = portNo;
        this.log = log;
    }

    /**
     * Log an error message.
     */
    error(msg: string): void {
        if (this.log) {
            this.log.error(msg);
        }
        else {
            console.error(msg);
        }
    }

    /**
     * Get the URL to access the web-sever.
     */
    getUrl (): string {
        return "http://127.0.0.1:" + this.assignedPortNo;
    }

    /**
     * Start the web-server.
     */
    start (data: any, template: ITemplate): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const app = express();
            this.server = http.createServer(app);

            app.use("/", async (request, response, next) => {
                try {
                    const fileName = request.url === "/" ? "index.html" : request.url;
                    const fileSystemPath = path.join(...fileName.split('/'));
                    const templateFile = template.find(fileSystemPath);
                    if (!templateFile) {
                        throw new Error("Couldn't find file '" + fileSystemPath + "' in template.");
                    }
            
                    const fileContent = await templateFile.expand();
                    const fileExt = path.extname(fileName);
                    const mimeType = mime.lookup(fileExt);
                    if (mimeType) {
                        response.setHeader("content-type", mimeType);
                    }
                    response.send(fileContent);
                }
                catch (err) {
                    this.error("Error loading template file.");
                    this.error(err && err.stack || err);

                    response.sendStatus(404);
                }
            });
                
            this.server.listen(this.requestedPortNo, "127.0.0.1", (err: any) => {
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
