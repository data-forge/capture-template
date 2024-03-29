# capture-template

This library is responsible for expanding a template web page and then capturing it to an image or PDF file.

It provides the 'capture' functionality for [Data-Forge Plot](https://www.npmjs.com/package/data-forge-plot) and
[Data-Forge Notebook](http://www.data-forge-notebook.com/).

[Click here to support my work](https://www.codecapers.com.au/about#support-my-work)

## Premise

A template web page is any number of web assets (JS files, HTML files, CSS files etc) in a directory. Each asset is a Handlebars template that can be expanded by data.

A template is expanded in memory and exposed via a web server.

The Nightmare headless browser is then instantiated and used to load the expaneded web page and capture it to an image or PDF.

This library is used by Data-Forge Plot and Data-Forge Notebook to capture visualizations to images and PDF files.

## Creating a template

A template is a directory that contains template files for web assets that are inflated with data.

By convention you need an index.html to be the main web page. You can have any number of supporting assets such as JavaScript and CSS files.

This repository contains an example template under the test-template directory. Please use this to understand the basics of how a template is constructed.

A template can contain a template.json configuration file and a test-data.json. Both files by convention are omitted from the expanded template.

template.json must contain a field 'waitSelector' that specifies the element/tag that must appear in the DOM before the image or PDF file can be captured.

When using the 'renderImage' function a 'captureSelector' field can optionally specify the root element to be captured. If tonot specified the the 'waitSelector' field is used instead. 'captureSelector' is ignored for PDF capture, PDF capture automatically captures the entire web page.

## Programmatic Usage

### Installation

    npm install --save capture-template

### Require

JavaScript:

    const { captureImage, capturePDF } = require('capture-template');

TypeScript:

    import { captureImage, capturePDF } from 'capture-template';

### Usage

Expanding a web page and capturing a image:

    const data = { /* ... your data to be expanded into the template ... */ }
    const templatePath = "<path-to-load-your-template-web-page-from>";
    const outputPath = "<image-file-to-write-the-capture-to>";
    await captureImage(templatePath, data, outputPath);

Expanding a web page and capturing a PDF:

    const data = { /* ... your data to be expanded into the template ... */ }
    const templatePath = "<path-to-load-your-template-web-page-from>";
    const outputPath = "<pdf-file-to-write-the-capture-to>";
    await capturePDF(templatePath, data, outputPath);

## Command line usage

This can also be used from the command line to test template web pages.

Before using from the command line make sure your template contains a 'test-data.json' that is used to fill out the template.

To use from the command line please install globally like this:

    npm install -g capture-template

You can also omit the `-g` and just install locally, but then make sure you prefix all the subsequent commands with `npx`.

To start a server from a template:

    capture-template serve --template=<path-to-your-web-page-template> --port=3000

Now you can navigate your browser to `localhost:3000` to see how the template renders in the browser.

To do a test capture of an image:

    capture-template capture-image --template=<path-to-your-web-page-template> --out=<ouput-file-name>

To do a test capture of a PDF:

    capture-template capture-pdf --template=<path-to-your-web-page-template> --out=<ouput-file-name>
