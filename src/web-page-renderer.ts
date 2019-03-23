import { ICaptureOptions } from "./index";

declare const document: any;

/**
 * Options for rendering.
 */
export interface IRenderOptions {
    /**
     * Selector for the element that must appear in the DOM before capturing.
     */
    waitSelector: string;

    /**
     * Selector that is to be captured.
     * For 'renderImage' only. If omitted defaults to the value of 'waitSelector'.
     */
    captureSelector?: string;
}

/**
 * Interface to the web page renderer.
 * This component is responsible for rendering a web page to a PNG image or PDF file.
 */
export interface IWebPageRenderer {

    /**
     * Start the web page renderer.
     * For performance reasons this can be reused to render multiple web pages.
     */
    start (): void;

    /**
     * Finish the chart renderer.
     */
    end (): Promise<void>;

    /**
     * Render a web page to an image file.
     */
    renderImage (webPageUrl: string, outputFilePath: string, options: IRenderOptions): Promise<void>;

    /**
     * Render a web page to a PDF file.
     */
    renderPDF (webPageUrl: string, outputFilePath: string, options: IRenderOptions): Promise<void>;
}

/**
 * This component is responsible for rendering a web page to a PNG image or PDF file.
 */
export class WebPageRenderer implements IWebPageRenderer {

    /**
     * Options for capturing.
     */
    private options?: ICaptureOptions;

    /**
     * Nightmare headless browser instance.
     */
    private nightmare: any | null = null;

    constructor (options?: ICaptureOptions) {
        this.options = options;
    }

    /**
     * Log an info message.
     */
    info(msg: string): void {
        if (this.options && this.options.log) {
            this.options.log.info(msg);
        }
        else {
            console.info(msg);
        }
    }

    /**
     * Log a warning message.
     */
    warn(msg: string): void {
        if (this.options && this.options.log) {
            this.options.log.warn(msg);
        }
        else {
            console.warn(msg);
        }
    }

    /**
     * Log an error message.
     */
    error(msg: string): void {
        if (this.options && this.options.log) {
            this.options.log.error(msg);
        }
        else {
            console.error(msg);
        }
    }

    /**
     * Start the web page renderer.
     * For performance reasons this can be reused to render multiple pages.
     */
    async start (): Promise<void> {
        const nightmareOptions: any = {
            show: this.options && this.options.showBrowser,
            frame: false,
            maxHeight: 1000000,
            maxWidth: 1000000,
            waitTimeout: this.options && this.options.waitTimeout,
            gotoTimeout: this.options && this.options.gotoTimeout,
            openDevTools: this.options && this.options.openDevTools,
        };

        if (this.options) {
            if (this.options.electronPath) {
                // Include Electron path if specified.
                nightmareOptions.electronPath = this.options.electronPath;
            }

            if (this.options.env) {
                // Include Electron environment variables if specified.
                nightmareOptions.env = this.options.env;
            }
        }

        const Nightmare = require("nightmare");
        this.nightmare = new Nightmare(nightmareOptions);

        this.nightmare.on('crashed', (evt: any) => {
            throw new Error("Nightmare crashed " + evt.toString());
        });

        this.nightmare.on('page', (type: string, message: string, stack: any) => {
            if (type === "error") {
                this.error("Browser page error: " + message);
                this.error(stack);
            }
        });

        this.nightmare.on("did-fail-load", (event: any, errorCode: number, errorDescription: string, validatedURL: string, isMainFrame: boolean) => {
            this.error("Browser page failed to load.");
            this.error("Error code: " + errorCode);
            this.error("Error description: " + errorDescription);
            this.error("Validated URL: " + validatedURL);
            this.error("Is main frame: " + isMainFrame);
        });

        this.nightmare.on('console', (type: string, message: string) => {

            if (type === 'log') {
                this.info('LOG: ' + message);
                return;
            }
    
            if (type === 'warn') {
                this.warn('LOG: ' + message);
                return;
            }
    
            if (type === 'error') {
                this.error("Browser JavaScript error:");
                this.error(message);
            }
        });
    }

    /**
     * Finish the chart renderer.
     */
    async end (): Promise<void> {

        await this.nightmare!.end();
        this.nightmare = null;
    }

    //
    // Check current setup prior to doing any rendering.
    //
    private preRenderCheck(options: IRenderOptions): void {
        if (!options.waitSelector) {
            throw new Error("'waitSelector' not specified in the options, please set this to element that must appear in the DOM before the capture is invoked.");
        }

        if (!this.nightmare) {
            throw new Error("WebPageRenderer: Nightmare headless browser is not instantiated, please call `start` before calling `renderImage`.");
        }
    }

    /**
     * Render a web page to an image file.
     */
    async renderImage (webPageUrl: string, outputFilePath: string, options: IRenderOptions): Promise<void> {
        this.preRenderCheck(options);
        this.nightmare.goto(webPageUrl); 
        this.nightmare.wait(options.waitSelector);
        await this.nightmare.evaluate(() => {
                const body = document.querySelector('body');
                return {
                    width: body.scrollWidth,
                    height: body.scrollHeight,
                };
            })
            .then((bodySize: any) => {
                return this.nightmare.viewport(bodySize.width, bodySize.height)
            })
            .then(() => {
                return this.nightmare.evaluate(
                    (captureSelector: string) => {
                        const element = document.querySelector(captureSelector);
                        const rect = element.getBoundingClientRect();
                        return {
                            x: Math.ceil(rect.left),
                            y: Math.ceil(rect.top),
                            height: Math.ceil(rect.bottom - rect.top),
                            width: Math.ceil(rect.right - rect.left),
                        };
                    }, 
                    options.captureSelector || options.waitSelector,
                );
            })
            .then((rect: any) => {
                return this.nightmare.screenshot(outputFilePath, rect);
            });
    }

    /**
     * Render a web page to a PDF file.
     */
    async renderPDF (webPageUrl: string, outputFilePath: string, options: IRenderOptions): Promise<void> {
        this.preRenderCheck(options);
        this.nightmare.goto(webPageUrl);
        this.nightmare.wait(options.waitSelector)
        await this.nightmare.evaluate(() => {
                const body = document.querySelector("body");
                return {
                    documentArea: {
                        width: body.scrollWidth,
                        height: body.scrollHeight
                    },
                };
            })
            .then((pageDetails: any) => {
                const printOptions = {
                    marginsType: 0, // No margins, want to set the explicitly in CSS. TODO: This could be a template option.
                    
                    // The size of each page. These values match the specification for the A4 page size standard, but in landscape.
                    //TODO: This should be configurable somehow.
                    pageSize: { 
                        width: 297000, // 29.7cm (in microns, don't ask me why they put this is in microns).
                        height: 210000, // 21cm (in microns)
                    },
                    landscape: true,
                };

                return this.nightmare
                    .viewport(pageDetails.documentArea.width, pageDetails.documentArea.height)
                    .pdf(outputFilePath, printOptions);
            });    
    }
}