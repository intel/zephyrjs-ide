## Submitting Pull Requests

**Please follow these basic steps to simplify pull request reviews - if you don't you'll probably just be asked to anyway.**

* Please rebase your branch against the current master
* Run ```npm install``` to make sure your development dependencies are up-to-date
* Please ensure that the test suite passes **and** that code is lint free before submitting a PR by running:
 * ```npm test```
* If you've added new functionality, **please** include tests which validate its behaviour
* Make reference to possible [issues](https://github.com/intel/zephyrjs-ide/issues) on PR comment
* Follow the [Karma guidelines for git commit
  messages](http://karma-runner.github.io/1.0/dev/git-commit-msg.html), with
  possible scope examples being:
  * home
  * about
  * editor
  * github-modal
  * board-viewer
  * ocf-explorer

## Submitting bug reports

* Please detail the affected browser(s) and operating system(s)
* Please be sure to state which version of node **and** npm you're using
