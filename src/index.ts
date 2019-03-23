import { TemplateRenderer, ITemplateRenderer } from "./template-renderer";
import { argv } from 'yargs';
import * as fs from 'fs-extra';
import * as path from 'path';
import { IInflateOptions } from "inflate-template";
const promisify = require('promisify-any');

/**
 * Allows caller to override logging.
 */
export interface ILog {
    /**
     * Log an info message.
     */
    info(msg: string): void;

    /**
     * Log a warning message.
     */
    warn(msg: string): void;

    /**
     * Log an error message.
     */
    error(msg: string): void;
}

/**
 * Environment variables to pass in when starting the Electrong process required for capturing.
 */
export interface IEnvVars {
    [index: string]: string;
}

/**
 * Specifies options that can be passed to the capture function.
 */
export interface ICaptureOptions {

    /**
     * Options use when inflating the template.
     */
    inflateOptions: IInflateOptions;

    /**
     * Optionally override logging.
     */
    log?: ILog;

    /**
     * Optional timeout for Electron's wait function.
     */
    waitTimeout?: number;
    
    /**
     * Optional timeout for Electron's goto function.
     */
    gotoTimeout?: number;

    /**
     * Opens Electron's devtools, this only helps if show browser is also enabled!
     */
    openDevTools?: boolean;

    /**
     * Set to true to show the headless browser.
     */
    showBrowser?: boolean;

    /**
     * Set to true to leave the browser open.
     * Note that this causes a hang so don't ever use it in production, it's only
     * here for debugging.
     */
    leaveBrowserOpen?: boolean;

    /**
     * Specify the path to Electron if that's necessary for you.
     */
    electronPath?: string;

    /**
     * Environment variables to pass in when starting the Electrong process required for capturing.
     */
    env?: IEnvVars;
}

//
// Initalise the template renderer.
//
async function initTemplateRenderer(templatePath: string, data: any, port: number, options?: ICaptureOptions): Promise<ITemplateRenderer> {
    const templateRenderer = new TemplateRenderer(options);
    await templateRenderer.start();
    await templateRenderer.loadTemplate(templatePath, data, port);
    return templateRenderer;
}

//
// Deinit the template renderer.
//
async function deinitTemplateRenderer(templateRenderer: ITemplateRenderer, options?: ICaptureOptions): Promise<void> {
    if (options && options.leaveBrowserOpen) {
        return; // Leave the browser open for debugging.
    }
    await templateRenderer.unloadTemplate();
    await templateRenderer.end();
}

//
// Expand a template web page and capture it to an image file.
//
export async function captureImage(templatePath: string, data: any, outputPath: string, options?: ICaptureOptions): Promise<void> {
    await fs.ensureDir(path.dirname(outputPath));
    const autoAssignPortNo = 0; // Use port no 0, to automatically assign a port number.
    const templateRenderer = await initTemplateRenderer(templatePath, data, autoAssignPortNo, options);
    await templateRenderer.renderImage(outputPath);
    await deinitTemplateRenderer(templateRenderer);
}

//
// Expand a template web page and capture it to a PDF file.
//
export async function capturePDF(templatePath: string, data: any, outputPath: string, options?: ICaptureOptions): Promise<void> {
    await fs.ensureDir(path.dirname(outputPath));
    const autoAssignPortNo = 0; // Use port no 0, to automatically assign a port number.
    const templateRenderer = await initTemplateRenderer(templatePath, data, autoAssignPortNo, options);
    await templateRenderer.renderPDF(outputPath);
    await deinitTemplateRenderer(templateRenderer);
}

// 
// Load test data from the template directory.
//
async function loadTestData(templatePath: string): Promise<any> { 
    const testDataFilePath = path.join(templatePath, "test-data.json");
    const testDataExists = await fs.pathExists(testDataFilePath);
    if (!testDataExists) {
        throw new Error("To test your template you need a test-data.json in your template directory.");
    }

    const testDataFileContent = await promisify(fs.readFile)(testDataFilePath, "utf8");
    const testData = JSON.parse(testDataFileContent);
    return testData;
}

//
// Inflate the web page template and start a web server for testing in browser.
//
async function cli_serve(templatePath: string, port: number): Promise<void> {
    const testData = await loadTestData(templatePath);
    const templateRenderer = await initTemplateRenderer(templatePath, testData, port);

    console.log("Point your browser at " + templateRenderer.getUrl());
}

//
// Capture an image from a web page template using the command line.
//
async function cli_captureImage(templatePath: string, outputPath: string): Promise<void> {
    const testData = await loadTestData(templatePath);
    await captureImage(templatePath, testData, outputPath);
}

//
// Capture a PDF from a web page template using the command line.
//
async function cli_capturePDF(templatePath: string, outputPath: string): Promise<void> {
    const testData = await loadTestData(templatePath);
    await capturePDF(templatePath, testData, outputPath);
}

//
// Basic test run.
//
async function testRun(): Promise<void> {
    await captureImage(
        "test-template/image",
        { 
            msg: "Hello computer",
            color: "blue",
        }, 
        "test-output/test-image.png"
    );
}

if (require.main === module) { // For command line testing.
    if (argv._.length === 0) {
        throw new Error("Expected a command of serve, capture-image or capture-pdf");
    }

    const cmd = argv._[0];
    if (cmd === "test") {
        console.log("Test run...");
        testRun()
            .then(() => console.log("Done"))
            .catch(err => console.error(err && err.stack || err));
    }
    else if (cmd === "serve") {
        if (!argv.template) {
            throw new Error("Expected argument --template=<path-to-your-web-page-template>");
        }

        if (!argv.port) {
            throw new Error("Expected argument --port=<web-server-port-no>");
        }

        cli_serve(argv.template, argv.port)
            .catch(err => console.error(err && err.stack || err));
    }
    else if (cmd === "capture-image") {
        if (!argv.template) {
            throw new Error("Expected argument --template=<path-to-your-web-page-template>");
        }

        if (!argv.out) {
            throw new Error("Expected argument --out=<path-to-your-output-file>");
        }

        cli_captureImage(argv.template, argv.out)
            .catch(err => console.error(err && err.stack || err));
    }
    else if (cmd === "capture-pdf") {
        if (!argv.template) {
            throw new Error("Expected argument --template=<path-to-your-web-page-template>");
        }

        if (!argv.out) {
            throw new Error("Expected argument --out=<path-to-your-output-file>");
        }

        cli_capturePDF(argv.template, argv.out)
            .catch(err => console.error(err && err.stack || err));
    }    
    else {
        throw new Error("Unknown command: " + cmd);
    }
}
   
 