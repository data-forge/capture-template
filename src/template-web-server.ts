import { WebServer, IWebServer }  from "./web-server";
import { inflateTemplate } from "inflate-template";
import * as fs from 'fs-extra';
import * as path from 'path';
const promisify = require('promisify-any');        

declare const document: any;

/**
 * Interface to the template renderer.
 * This component is responsible for expanding a web page template, filling out the web page's data and starting a web server.
 */
export interface ITemplateWebServer {

    /**
     * Get the URL to access the web-sever.
     */
    getUrl(): string;

    /**
     * Get the root selector of the document.
     */
    getRootSelector(): string; 
    
    /**
     * Start the template renderer.
     * For performance reasons this can be reused to instantiate and render multiple web pages.
     */
    start(data: any, templatePath: string, port: number): void;

    /**
     * Finish the chart renderer.
     */
    /*async*/ end(): Promise<void>;
}

/**
 * This component is responsible for expanding a web page template, filling out the web page's data and starting a web server.
 */
export class TemplateWebServer implements ITemplateWebServer {

    /**
     * For performance reasons this can be reused to instantiate and render multiple web pages.
     */
    webServer: IWebServer | null = null;

    /**
     * Template configuration, once web server is started and template has been inflated.
     */
    templateConfig: any | null = null;

    /**
     * Get the URL to access the web-sever.
     */
    getUrl (): string {
        return this.webServer!.getUrl();
    }

    /**
     * Get the root selector of the document.
     */
    getRootSelector(): string {
        if (!this.templateConfig) {
            throw new Error("Template web server is not started, please call 'start'.");
        }
        
        return this.templateConfig.templateRootSelector;
    }
    
    /**
     * Start the web page renderer.
     * For performance reasons this can be reused to render multiple pages.
     */
    async start (data: any, templatePath: string, port: number): Promise<void> {
        if (this.templateConfig) {
            throw new Error("Template web server is already started. Please end the previous session by calling 'end'.");
        }

        try {
            const templateConfigFilePath = path.join(templatePath, "template.json");
            const templateConfigContent = await promisify(fs.readFile)(templateConfigFilePath, "utf8");
            this.templateConfig = JSON.parse(templateConfigContent);
        }
        catch (err) {
            console.error("Failed to load template configuration.");
            console.error(err && err.stack || err);
            throw new Error("Template configuration file 'template.json' was not found in the template directory '" + templatePath + "'.");
        }

        if (!this.templateConfig.templateRootSelector || 
            typeof(this.templateConfig.templateRootSelector) !== "string") {
                throw new Error("Error in template configuration 'template.json' for template in directory '" + templatePath + "'. Please set 'templateRootSelector' to a valid CSS selector that designates the root of your template.");
        }

        const template = await inflateTemplate(data, { templatePath: templatePath });

        this.webServer = new WebServer(port);
        await this.webServer.start(data, template);
    }

    /**
     * Finish the chart renderer.
     */
    async end (): Promise<void> {
        this.templateConfig = null;

        if (this.webServer) {
            await this.webServer!.stop();
            this.webServer = null;   
        }
    }
}