// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var childProcess = require("child_process");
var fs = require("fs");
var path = require("path");
var shell = childProcess.execSync;

var del = require("del");
var fsPromise = require("fs-promise");
var gulp = require("gulp");

var concatenateProtocols = require("./concatenate_protocols.js");
var utils = require("../utils.js");

let type;
var devtoolsPath;
var frontendPath;
var frontendBase;
var releasePath;
var releaseBase;
var scriptsPath;

function initPath() {
    devtoolsPath = path.resolve(path.join(__dirname, "../.."));
    frontendPath = path.join(devtoolsPath, `front_end/${type}`);
    frontendBase = path.join(devtoolsPath, "front_end");
    releasePath = path.join(devtoolsPath, `release/${type}`);
    releaseBase = path.join(devtoolsPath, "release");
    scriptsPath = path.join(devtoolsPath, "scripts");
}

gulp.task("default", ["build"]);

gulp.task("clean", cleanTask);
function cleanTask()
{
    del.sync([releasePath], {force: true});
    if (!fs.existsSync(releaseBase))
        fs.mkdirSync(releaseBase);
    fs.mkdirSync(releasePath);
}

gulp.task("setFd", () => {
    type = 'fd';
    initPath()
})

gulp.task("setTiny", () => {
    type = 'tiny';
    initPath()
})

gulp.task("fd", ["setFd", "build"]);
gulp.task("tiny", ["setTiny", "build"]);

gulp.task("build", ["generateProtocol", "generateSupportedCSSProperties", "generateDevtoolsExtensionAPI", "copyDevtoolsFiles"], buildTask);
function buildTask()
{
    var script = path.join(scriptsPath, "build", "build_release_applications.py");
    var args = [
        "inspector",
        "toolbox",
        "formatter_worker",
        "heap_snapshot_worker",
        "utility_shared_worker",
        "--input_path",
        frontendPath,
        "--output_path",
        releasePath,
    ];
    runPythonScript(script, args);
}

gulp.task("generateProtocol", ["concatenateProtocol"], generateProtocolTask);
function generateProtocolTask()
{
    var script = path.join(scriptsPath, "build", "code_generator_frontend.py");
    var args = [
        path.join(releasePath, "protocol.json"),
        "--output_js_dir",
        releasePath,
    ];
    runPythonScript(script, args);
    del.sync([
        path.join(releasePath, "browser_protocol.json"),
        path.join(releasePath, "js_protocol.json"),
        path.join(releasePath, "protocol.json"),
    ], {force: true});
}

gulp.task("concatenateProtocol", ["fetchProtocol"], concatenateProtocolTask);
function concatenateProtocolTask()
{
    var protocols = [
        path.join(__dirname, "browser_protocol.json"),
        path.join(releasePath, "js_protocol.json"),
    ];
    var output = path.join(releasePath, "protocol.json");
    concatenateProtocols(protocols, output);
}

gulp.task("fetchProtocol", ["clean"], fetchProtocolTask);
function fetchProtocolTask(done)
{
    var browserProtocolFile = path.join(releasePath, 'browser_protocol.json');
    var browserProtocolPromise = getAndSaveCodePromise('browser_protocol.txt', browserProtocolFile);

    var jsProtocolFile = path.join(releasePath, 'js_protocol.json');
    var jsProtocolPromise = getAndSaveCodePromise('js_protocol.txt', jsProtocolFile);

    Promise.all([browserProtocolPromise, jsProtocolPromise])
        .then(() => done())
        .catch(err => console.log("Error fetching protocols:", err));
}

gulp.task("generateSupportedCSSProperties", ["fetchSupportedCSSProperties"], generateSupportedCSSProperties);
function generateSupportedCSSProperties()
{
    var script = path.join(scriptsPath, "build", "generate_supported_css.py");
    var inputs = [path.join(releasePath, "CSSProperties.in")];
    var outputs = [path.join(releasePath, "SupportedCSSProperties.js")];
    var args = inputs.concat(outputs);
    runPythonScript(script, args);
    del.sync([path.join(releasePath, "CSSProperties.in")], {force: true});
}

gulp.task("fetchSupportedCSSProperties", ["clean"], fetchSupportedCSSProperties);
function fetchSupportedCSSProperties(done)
{
    var supportedCSSPropertiesFile = path.join(releasePath, 'CSSProperties.in');

    getAndSaveCodePromise('CSSProperties.in', supportedCSSPropertiesFile)
        .then(() => done())
        .catch(err => console.log("Error fetching CSS properties:", err));
}

gulp.task("generateDevtoolsExtensionAPI", ["clean"], generateDevtoolsExtensionAPITask);
function generateDevtoolsExtensionAPITask()
{
    var script = path.join(scriptsPath, "build", "generate_devtools_extension_api.py");
    var inputs = [path.join(frontendPath, "extensions", "ExtensionAPI.js")];
    var outputs = [path.join(releasePath, "devtools_extension_api.js")];
    var args = outputs.concat(inputs);
    runPythonScript(script, args);
}

gulp.task("copyDevtoolsFiles", ["clean"], copyDevtoolsFilesTask);
function copyDevtoolsFilesTask()
{
    gulp.src(path.join(frontendPath, "devtools.js"))
        .pipe(gulp.dest(releasePath));
    gulp.src(path.join(frontendPath, "Tests.js"))
        .pipe(gulp.dest(releasePath));
    gulp.src(path.join(frontendPath, "Images/*.*"))
        .pipe(gulp.dest(path.join(releasePath, "Images")));
    gulp.src(path.join(frontendPath, "emulated_devices/*.svg"))
        .pipe(gulp.dest(path.join(releasePath, "emulated_devices")));
    gulp.src(path.join(frontendPath, "emulated_devices/*.png"))
        .pipe(gulp.dest(path.join(releasePath, "emulated_devices")));
}

function fetchAndSaveCodePromise(url, file)
{
    return utils.fetch(url)
        .then(buffer => utils.atob(buffer.toString("binary")))
        .then(data => fsPromise.writeFile(file, data));
}

function getAndSaveCodePromise(filename, file) {
  return new Promise(resolve => {
        resolve(fs.readFileSync(filename));
      })
      .then(buffer => utils.atob(buffer.toString('binary')))
      .then(data => fsPromise.writeFile(file, data));
}

function runPythonScript(script, args)
{
    shell(`python ${script} ${args.join(" ")}`);
}
