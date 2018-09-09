import { TemplateRenderer, ITemplateRenderer } from "./template-renderer";
import { argv } from 'yargs';
import * as fs from 'fs-extra';
import * as path from 'path';
const promisify = require('promisify-any');

//
// Initalise the template renderer.
//
async function initTemplateRenderer(data: any, templatePath: string, port: number, electronPath?: string): Promise<ITemplateRenderer> {
    const templateRenderer = new TemplateRenderer(electronPath);
    await templateRenderer.start();
    await templateRenderer.loadTemplate(data, templatePath, port);
    return templateRenderer;
}

//
// Deinit the template renderer.
//
async function deinitTemplateRenderer(templateRenderer: ITemplateRenderer): Promise<void> {
    await templateRenderer.unloadTemplate();
    await templateRenderer.end();
}

//
// Expand a template web page and capture it to an image file.
//
export async function captureImage(data: any, templatePath: string, outputPath: string, electronPath?: string): Promise<void> {
    await fs.ensureDir(path.dirname(outputPath));
    const autoAssignPortNo = 0; // Use port no 0, to automatically assign a port number.
    const templateRenderer = await initTemplateRenderer(data, templatePath, autoAssignPortNo, electronPath);
    await templateRenderer.renderImage(outputPath);
    await deinitTemplateRenderer(templateRenderer);
}

//
// Expand a template web page and capture it to a PDF file.
//
export async function capturePDF(data: any, templatePath: string, outputPath: string, electronPath?: string): Promise<void> {
    await fs.ensureDir(path.dirname(outputPath));
    const autoAssignPortNo = 0; // Use port no 0, to automatically assign a port number.
    const templateRenderer = await initTemplateRenderer(data, templatePath, autoAssignPortNo, electronPath);
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
    const templateRenderer = await initTemplateRenderer(testData, templatePath, port);

    console.log("Point your browser at " + templateRenderer.getUrl());
}

//
// Capture an image from a web page template using the command line.
//
async function cli_captureImage(templatePath: string, outputPath: string): Promise<void> {
    const testData = await loadTestData(templatePath);
    await captureImage(testData, templatePath, outputPath);
}

//
// Capture a PDF from a web page template using the command line.
//
async function cli_capturePDF(templatePath: string, outputPath: string): Promise<void> {
    const testData = await loadTestData(templatePath);
    await capturePDF(testData, templatePath, outputPath);
}

//
// Basic test run.
//
async function testRun(): Promise<void> {
    await captureImage(
        { 
            msg: "Hello computer",
            color: "blue",
        }, 
        "test-template/image",
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
   
 