const Nightmare = require("nightmare");

declare const document: any;

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
     * Render a web page to a PNG file.
     */
    /*async*/ renderImage (webPageUrl: string, outputFilePath: string, rootSelector: string): Promise<void>;
}

/**
 * This component is responsible for rendering a web page to a PNG image or PDF file.
 */
export class WebPageRenderer implements IWebPageRenderer {

    /**
     * Nightmare headless browser instance.
     */
    nightmare: any | null = null;

    /**
     * Start the web page renderer.
     * For performance reasons this can be reused to render multiple pages.
     */
    async start (): Promise<void> {
        this.nightmare = new Nightmare({
            show: false,
            frame: false,
        });

        this.nightmare.on('crashed', (evt: any) => {
            throw new Error("Nightmare crashed " + evt.toString());
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

    /**
     * Render a web page to a PNG file.
     */
    async renderImage (webPageUrl: string, outputFilePath: string, rootSelector: string): Promise<void> {
        if (!this.nightmare) {
            throw new Error("WebPageRenderer: Nightmare headless browser is not instantiated, please call `start` before calling `renderImage`.");
        }

        this.nightmare.goto(webPageUrl); 
        await this.nightmare.wait(rootSelector);
        await this.nightmare.evaluate(
                (rootSelector: string) => {
                    const body = document.querySelector('body');
                    const element = document.querySelector(rootSelector);
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
                rootSelector
            )
            .then((rect: any) => {
                return this.nightmare
                    .viewport(rect.bodyWidth, rect.bodyHeight)
                    .screenshot(outputFilePath, rect);
            });
    }
}