const Nightmare = require("nightmare");

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
    /*async*/ end (): Promise<void>;

    /**
     * Render a web page to an image file.
     */
    /*async*/ renderImage (webPageUrl: string, outputFilePath: string, options: IRenderOptions): Promise<void>;

    /**
     * Render a web page to a PDF file.
     */
    /*async*/ renderPDF (webPageUrl: string, outputFilePath: string, options: IRenderOptions): Promise<void>;
}

/**
 * This component is responsible for rendering a web page to a PNG image or PDF file.
 */
export class WebPageRenderer implements IWebPageRenderer {

    /**
     * Specifies the path to load Electron from or null to use default path.
     */
    electronPath?: string;

    /**
     * Nightmare headless browser instance.
     */
    nightmare: any | null = null;

    constructor (electronPath?: string) {
        this.electronPath = electronPath;
    }

    /**
     * Start the web page renderer.
     * For performance reasons this can be reused to render multiple pages.
     */
    async start (): Promise<void> {
        const nightmareOptions: any = {
            show: false,
            frame: false,
        };

        if (this.electronPath) {
            // Include Electron path if specified.
            nightmareOptions.electronPath = this.electronPath;
        }

        this.nightmare = new Nightmare(nightmareOptions);

        this.nightmare.on('crashed', (evt: any) => {
            throw new Error("Nightmare crashed " + evt.toString());
        });

        this.nightmare.on('page', (type: string, message: string, stack: any) => {
            if (type === "error") {
                console.error("Browser page error: " + message);
                console.error(stack);
            }
        });

        this.nightmare.on("did-fail-load", (event: any, errorCode: number, errorDescription: string, validatedURL: string, isMainFrame: boolean) => {
            console.error("Browser page failed to load.");
            console.error("Error code: " + errorCode);
            console.error("Error description: " + errorDescription);
            console.error("Validated URL: " + validatedURL);
            console.error("Is main frame: " + isMainFrame);
        });

        this.nightmare.on('console', (type: string, message: string) => {

            if (type === 'log') {
                console.log('LOG: ' + message);
                return;
            }
    
            if (type === 'warn') {
                console.warn('LOG: ' + message);
                return;
            }
    
            if (type === 'error') {
                console.error("Browser JavaScript error:");
                console.error(message);
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
        await this.nightmare.evaluate(
                (catureSelector: string) => {
                    const body = document.querySelector('body');
                    const element = document.querySelector(catureSelector);
                    const rect = element.getBoundingClientRect();
                    return {
                        bodyWidth: body.scrollWidth,
                        bodyHeight: body.scrollHeight,
                        x: rect.left,
                        y: rect.top,
                        height: rect.bottom - rect.top,
                        width: rect.right - rect.left,
                    };
                }, 
                options.captureSelector || options.waitSelector,
            )
            .then((rect: any) => {
                return this.nightmare
                    .viewport(rect.bodyWidth, rect.bodyHeight)
                    .screenshot(outputFilePath, rect);
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