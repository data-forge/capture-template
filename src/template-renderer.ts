import { IWebPageRenderer, WebPageRenderer } from "./web-page-renderer";
import { ITemplateWebServer, TemplateWebServer } from "./template-web-server";
import { ICaptureOptions } from "./index";

declare const document: any;

/**
 * Interface to the template renderer.
 * This component is responsible for pretty much everything, coordinates inflating a template, starting a web server, starting Nightmare
 * navigating to the web page and then capturing the web page to a PNG or PDF.
 */
export interface ITemplateRenderer {

    /**
     * Get the URL to access the web-sever.
     */
    getUrl(): string;

    /**
     * Start the template renderer.
     * For performance reasons the template render can be reused to render multiple web pages.
     */
    /*async*/ start (): Promise<void>;

    /**
     * Finish the template renderer.
     */
    /*async*/ end (): Promise<void>;

    /**
     * Load a template render for rendering.
     * 
     * @param templatePath The path to the template.
     */
    /*async*/ loadTemplate(data: any, templatePath: string, port: number): Promise<void>;

    /**
     * Unload current template when we are done.
     */
    /*async*/ unloadTemplate(): Promise<void>;

    /**
     * Render the current web page template to an image file.
     */
    /*async*/ renderImage (outputFilePath: string): Promise<void>;

    /**
     * Render the current web page template to a PDF file.
     */
    /*async*/ renderPDF (outputFilePath: string): Promise<void>;
}

/**
 * This component is responsible for pretty much everything, coordinates inflating a template, starting a web server, starting Nightmare
 * navigating to the web page and then capturing the web page to a PNG or PDF.
 */
export class TemplateRenderer implements ITemplateRenderer {

    /**
     * Options for capturing.
     */
    private options?: ICaptureOptions;
    
    /**
     * Renders the web page.
     */
    private webPageRenderer: IWebPageRenderer | null = null;

    /**
     * Hosts the templated web page to be rendered.
     */
    private templateWebServer: ITemplateWebServer | null = null;

    constructor (options?: ICaptureOptions) {
        this.options = options;
    }

    /**
     * Get the URL to access the web-sever.
     */
    getUrl (): string {
        return this.templateWebServer!.getUrl();
    }

    /**
     * Start the template renderer.
     * For performance reasons the template render can be reused to render multiple web pages.
     */
    async start (): Promise<void> {
        this.webPageRenderer = new WebPageRenderer(this.options);
        await this.webPageRenderer.start();
    }

    /**
     * Finish the template renderer.
     */
    async end (): Promise<void> {
        await this.unloadTemplate();

        if (this.webPageRenderer) {
            await this.webPageRenderer.end();
            this.webPageRenderer = null;
        }
    }

    /**
     * Load a template render for rendering.
     * 
     * @param templatePath The path to the template.
     */
    async loadTemplate(data: any, templatePath: string, port: number): Promise<void> {
        this.unloadTemplate();

        this.templateWebServer = new TemplateWebServer(this.options && this.options.log);
        await this.templateWebServer.start(data, templatePath, port);
    }

    /**
     * Unload current template when we are done.
     */
    async unloadTemplate(): Promise<void> {
        if (this.templateWebServer) {
            await this.templateWebServer.end();
            this.templateWebServer = null;
        }
    }

    //
    // Check current setup prior to doing any rendering.
    //
    private preRenderCheck(): void {
        if (!this.webPageRenderer) {
            throw new Error("TemplateRenderer is not started, please call 'start' to initiate.");
        }

        if (!this.templateWebServer) {
            throw new Error("TemplateRenderer: No template is loaded, please call 'loadTemplate'.");
        }
    }

    /**
     * Render the current web page template to an image file.
     */
    async renderImage (outputFilePath: string): Promise<void> {
        this.preRenderCheck();
        await this.webPageRenderer!.renderImage(this.templateWebServer!.getUrl(), outputFilePath, this.templateWebServer!.getTemplateConfig());
    }

    /**
     * Render the current web page template to a PDF file.
     */
    async renderPDF (outputFilePath: string): Promise<void> {
        this.preRenderCheck();
        await this.webPageRenderer!.renderPDF(this.templateWebServer!.getUrl(), outputFilePath, this.templateWebServer!.getTemplateConfig());
    }
}