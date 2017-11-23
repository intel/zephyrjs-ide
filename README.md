[![Linux/OSX Build Status](https://travis-ci.org/intel/zephyrjs-ide.svg?branch=master)](https://travis-ci.org/intel/zephyrjs-ide)
[![Windows Build status](https://ci.appveyor.com/api/projects/status/n0mg3nc5lhsb8s46/branch/master?svg=true)](https://ci.appveyor.com/project/siovene/zephyrjs-ide/branch/master)
[![Dependency Status](https://david-dm.org/intel/zephyrjs-ide.svg)](https://david-dm.org/intel/zephyrjs-ide)
[![devDependency Status](https://david-dm.org/intel/zephyrjs-ide/dev-status.svg)](https://david-dm.org/intel/zephyrjs-ide#info=devDependencies)

# Table of Contents

- [Table of Content](#table-of-content)
- [Introduction](#introduction)
- [How to start](#how-to-start)
- [How to start with Aot](#how-to-start-with-aot-compilation)
- [Tree-shaking with Rollup](#tree-shaking-with-rollup)
- [Dockerization](#dockerization)
  + [How to build and start the dockerized version of the application](#how-to-build-and-start-the-dockerized-version-of-the-application)
  + [Development build and deployment](#development-build-and-deployment)
  + [Production build and deployment](#production-build-and-deployment)
- [Analyzing the space usage of the app](#analyzing-the-space-usage-of-the-app)
- [Configuration](#configuration)
- [Environment Configuration](#environment-configuration)
- [Tools documentation](#tools-documentation)
- [Running tests](#running-tests)
- [Contributing](#contributing)
- [License](#license)

# Introduction

`JS IDE for Zephyr OS` is an online JavaScript editor that lets you upload code to a
Zephyr board, directly from the browser, taking advantage of WebUSB.

`JS IDE for Zephyr OS` provides the following features:

- Edit JavaScript code with the integrated Monaco editor
- Connect and upload to a Zephyr board via WebUSB
- Supports for multiple tabs

# How to start

**Note** that this project requires node v4.x.x or higher and npm 2.14.7 but in
order to be able to take advantage of the complete functionality we **strongly
recommend node >=v6.5.0 and npm >=3.10.3**.

In order to start the project, do the following:


```bash
$ git clone https://github.com/intel/zephyrjs-ide.git
$ cd zephyrjs-ide

# install the project's dependencies
$ npm install
# or, for faster install (via Yarn, https://yarnpkg.com)
$ yarn install  # or yarn

# watches your files and uses livereload by default
$ npm start

# to start deving with livereload site and coverage as well as continuous testing
$ npm run start.deving

# dev build
$ npm run build.dev
# prod build
$ npm run build.prod
# prod build with AoT compilation
$ npm run build.prod.exp

# dev build of multiple applications (by default the value of --app is "app")
$ npm start -- --app baz
$ npm start -- --app foo
$ npm start -- --app bar
```

*Please note*
If the `npm start` command exists quickly with an `ELIFECYCLE` error code, you probably need to assign more memory to gulp/watcher:

```
echo "fs.inotify.max_user_watches = 524288" >> /etc/sysctl.conf
sudo sysctl -p
```

_Does not rely on any global dependencies._

# How to start with AoT compilation

**Note** that AoT compilation requires **node v6.5.0 or higher** and **npm 3.10.3 or higher**.

In order to start the seed with AoT use:

```bash
# prod build with AoT compilation, will output the production application in `dist/prod`
# the produced code can be deployed (rsynced) to a remote server
$ npm run build.prod.aot
```

# Tree-shaking with Rollup

This application provides full support for tree-shaking your production builds with Rollup, which can drastically reduce the size of your application. This is the highest level of optimization currently available.

To run this optimized production build, use:

```bash
# prod build with AoT compilation and Rollup tree-shaking, will output the production application in `dist/prod`
# the produced code can be deployed (rsynced) to a remote server
$ npm run build.prod.rollup.aot
```

Your project will be compiled ahead of time (AOT), and then the resulting bundle will be tree-shaken and minified. During the tree-shaking process Rollup statically analyses your code, and your dependencies, and includes the bare minimum in your bundle.

**Notes**
- Beware of non-static/side-effectful imports. These cannot be properly optimized. For this reason, even though tree-shaking is taking place the developer still needs to be careful not to include non-static imports that are unnecessary, as those referenced imports will always end up in final bundle. Special attention should be given to RxJs, which makes heavy use of non-static/side-effectful imports: make sure you only add the operators you use, as any added operators will be included in your final production bundle.
- UMD modules result in code that cannot be properly optimized. For best results, prefer ES6 modules whenever possible. This includes third-party dependencies: if one is published in both UMD and ES6 modules, go with the ES6 modules version.
- During a production build, CommonJs modules will be automatically converted to ES6 modules. This means you can use them and/or require dependencies that use them without any issues.

# Internationalization

Put `i18n` attribute to your html tag to mark it for translation, more information here: https://angular.io/docs/ts/latest/cookbook/i18n.html

## Create a translation source file

```bash
# Your translation file will be generated here `dist/locale`
$ npm run i18n
```

## Production build with your language

```bash
# Build prod app with the language file `dist/locale/messages.en.xlf`
$ npm run build.prod.rollup.aot -- --lang en
```

# Dockerization

The application provides full Docker support. You can use it for both development as well as production builds and deployments.

## How to build and start the dockerized version of the application

The Dockerization infrastructure is described in the `docker-compose.yml` (respectively `docker-compose.production.yml`.
The application consists of two containers:
- `zephyrjs-ide` - In development mode, this container serves the angular app. In production mode it builds the angular app, with the build artifacts being served by the Nginx container
- `zephyrjs-ide-nginx` - This container is used only production mode. It serves the built angular app with Nginx.

## Development build and deployment

Run the following:

```bash
$ docker-compose build
$ docker-compose up -d
```

Now open your browser at http://localhost:8000

## Production build and deployment

Run the following:

```bash
$ docker-compose -f docker-compose.production.yml build
$ docker-compose -f docker-compose.production.yml up zephyrjs-ide   # Wait until this container has finished building, as the nginx container is dependent on the production build artifacts
$ docker-compose -f docker-compose.production.yml up -d zephyrjs-ide-nginx  # Start the nginx container in detached mode, in another terminal window
```

# Analyzing the space usage of the app
You can analyze the bundle with [source-map-explorer](https://github.com/danvk/source-map-explorer).
It creates a html chart with a file by default, but output can also be json or tsv.

Run the following:

```bash
$ npm run sme.prod # or respectively sme.prod.aot / sme.prod.rollup.aot
# You can specify the output format by passing the `sme-out-format` parameter
$ npm run sme.prod.aot -- --sme-out-format json # or html / tsv
```

# Configuration

Default application server configuration

```js
var PORT             = 8000;
var DOCS_PORT        = 4003;
var APP_BASE         = '/';
```

Configure at runtime

```bash
$ npm start -- --port 8080 --base /my-app/
```

## Environment configuration

If you have different environments and you need to configure them to use different end points, settings, etc. you can use the files `dev.ts` or `prod.ts` in`./tools/env/`. The name of the file is environment you want to use.

The environment can be specified by using:

```bash
$ npm start -- --env-config ENV_NAME
```

Currently the `ENV_NAME`s are `dev`, `prod`, `staging`, but you can simply add a different file `"ENV_NAME.ts".` file in order to alter extra such environments.

# Tools documentation

A documentation of the provided tools can be found in [tools/README.md](tools/README.md).

# Running tests

```bash
$ npm test

# Development. Your app will be watched by karma
# on each change all your specs will be executed.
$ npm run test.watch
# NB: The command above might fail with a "EMFILE: too many open files" error.
# Some OS have a small limit of opened file descriptors (256) by default
# and will result in the EMFILE error.
# You can raise the maximum of file descriptors by running the command below:
$ ulimit -n 10480


# code coverage (istanbul)
# auto-generated at the end of `npm test`
# view coverage report:
$ npm run serve.coverage

# e2e (aka. end-to-end, integration) - In three different shell windows
# Make sure you don't have a global instance of Protractor
# Make sure you do have Java in your PATH (required for webdriver)

# npm install webdriver-manager <- Install this first for e2e testing
# npm run webdriver-update <- You will need to run this the first time
$ npm run webdriver-start
$ npm run serve.e2e
$ npm run e2e

# e2e live mode - Protractor interactive mode
# Instead of last command above, you can use:
$ npm run e2e.live
```
You can learn more about [Protractor Interactive Mode here](https://github.com/angular/protractor/blob/master/docs/debugging.md#testing-out-protractor-interactively)

# Contributing

Please see the
[CONTRIBUTING](https://github.com/intel/zephyrjs-ide/blob/master/.github/CONTRIBUTING.md)
file for guidelines.

# License

Apache 2.0
