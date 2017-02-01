/* markdown-dj.js
 *
 * Copyright (C) 2016 Intel Corporation
 *
 * Auto scroll functionality based on markdown-it demo:
 * https://markdown-it.github.io/index.js
 */

"use strict";

(function() {

    /* Invoke 'callback' only after 'timeout' has
     * passed since the last time debounce is called */
    window.debounce = function(callback, timeout, options) {
        var timer = null,
            maxDelay = options && options.maxDelay || 0,
            deadline = 0;

        return function() {
            var args = arguments, delay = timeout;

            /* If there is a max-delay set and there is
             * currently no deadline, set the deadline
             * */
            if (maxDelay != 0 && deadline == 0) {
                deadline = Date.now() + maxDelay;
            }

            if (timer) {
                clearTimeout(timer);
            }

            /* If there is a deadline, and delay ms from now
             * exceeds that deadline, set the delay to be
             * immediate (0) or to execute at the deadline */
            if (deadline && Date.now() + delay > deadline) {
                delay = Math.max(0, deadline - Date.now());
            }

            timer = setTimeout(function() {
                timer = null;
                callback.apply(undefined, args);
            }, delay);
        }
    };

    /*** BEGIN Code in following block from https://markdown-it.github.io/index.js */
    var scrollMap = null;

    //
    // Inject line numbers for sync scroll. Notes:
    //
    // - We track only headings and paragraphs on first level. That's enough.
    // - Footnotes content causes jumps. Level limit filter it automatically.
    function injectLineNumbers(tokens, idx, options, env, slf) {
        var line;
        if (tokens[idx].map && tokens[idx].level === 0) {
            line = tokens[idx].map[0];
            tokens[idx].attrJoin('class', 'line');
            tokens[idx].attrSet('data-line', String(line));
        }
        return slf.renderToken(tokens, idx, options, env, slf);
    }

    function updateResult() {
        scrollMap = null;
    }

    // Build offsets for each line (lines can be wrapped)
    // That's a bit dirty to process each line everytime, but ok for demo.
    // Optimizations are required only for big texts.
    function buildScrollMap() {
        var i, offset, nonEmptyList, pos, a, b, lineHeightMap, linesCount
            , acc, doppleganger, textarea = document.querySelector('#editor textarea')
            , _scrollMap, target = document.querySelector('#preview')
            , lh;

        doppleganger = document.createElement('div');

        var style = window.getComputedStyle(textarea);
        doppleganger.style.position = 'absolute';
        doppleganger.style.height = 'auto';
        doppleganger.style.visibility = 'hidden';
        doppleganger.style.width = textarea.clientWidth + 'px';
        doppleganger.style.fontSize = style.fontSize;
        doppleganger.style.fontFamily = style.fontFamily;
        doppleganger.style.lineHeight = style.lineHeight;
        doppleganger.style.whiteSpace = style.whiteSpace;
        document.body.appendChild(doppleganger);

        offset = preview.offsetTop;

        _scrollMap = [];
        nonEmptyList = [];
        lineHeightMap = [];

        /* Build table of line offsets from the preview textarea */
        acc = 0;
        lh = parseFloat(window.getComputedStyle(doppleganger).lineHeight);
        textarea.value.split('\n').forEach(function (str) {
            var h;

            lineHeightMap.push(acc);

            if (str.length === 0) {
                acc++;
                return;
            }

            doppleganger.textContent = str;
            h = parseFloat(window.getComputedStyle(doppleganger).height);
            acc += Math.round(h / lh);
        });

        doppleganger.parentElement.removeChild(doppleganger);
        lineHeightMap.push(acc);
        linesCount = acc;

        for (i = 0; i < linesCount; i++) {
            _scrollMap.push(-1);
        }

        nonEmptyList.push(0);
        _scrollMap[0] = 0;

        /* Find all the line tags in the preview pane */
        Array.prototype.forEach.call(target.querySelectorAll('.line'), function(el) {
            var t = el.getAttribute('data-line');
            if (t === '') {
                return;
            }
            t = lineHeightMap[t];
            if (t !== 0) {
                nonEmptyList.push(t);
            }
            _scrollMap[t] = Math.round(el.offsetTop + offset);
        });

        nonEmptyList.push(linesCount);
        _scrollMap[linesCount] = target.scrollHeight;

        pos = 0;
        for (i = 1; i < linesCount; i++) {
            if (_scrollMap[i] !== -1) {
                pos++;
                continue;
            }

            a = nonEmptyList[pos];
            b = nonEmptyList[pos + 1];
            _scrollMap[i] = Math.round((_scrollMap[b] * (i - a) + _scrollMap[a] * (b - i)) / (b - a));
        }

        return _scrollMap;
    }

    window.slideTo = function(element, target, duration) {
        duration = duration || 100;
        if (element.scrollTop == target) {
            return;
        }

        if (duration <= 0) {
            return;
        }

        function anim() {
            if (!this.el.anim) {
                return;
            }

            if (this.el.anim.target != this.target) {
                return;
            }
            var alpha = (Date.now() - this.start) / this.duration;
            alpha = Math.max(0, Math.min(1, alpha));
            /* ease in-out */
            //alpha = (alpha < 0.5) ? 2 * alpha * alpha : -1 + (4 * 2 * alpha) * alpha;
            this.el.scrollTop = this.scrollStart + this.delta * alpha;
            if (alpha < 1) {
                window.requestAnimationFrame(anim.bind(this));
            } else {
                delete this.el.anim;
                delete this.el;
            }
        }

        element.anim = {
            el: element,
            start: Date.now(),
            duration: duration,
            target: target,
            scrollStart: element.scrollTop,
            delta: target - element.scrollTop
        };

        window.requestAnimationFrame(anim.bind(element.anim));
    };

    function addEventCallbacks() {
        var editor = document.querySelector('#editor'),
            editorActive = false,
            previewActive = true;

        if (!editor) {
            return;
        }

        // Synchronize scroll position from source to result
        var preview = document.body;//document.querySelector('#preview');

        editor.addEventListener('touchstart', function(event) {
            editorActive = true;
            previewActive = false;
            event.stopImmediatePropagation();
        });

        editor.addEventListener('mouseenter', function() {
            editorActive = true;
            previewActive = false;
        });

        editor.addEventListener('mouseleave', function() {
            editorActive = false;
            previewActive = true;
        });

        window.addEventListener('touchstart', function() {
            editorActive = false;
            previewActive = true;
        });

        /* If the editor is scrolling, find out which line is at the top
         * of the page. */
        editor.addEventListener('scroll', debounce(function () {
            if (!editorActive) {
                return;
            }

            var lineHeight = parseFloat(
                window.getComputedStyle(editor.querySelector('textarea')).lineHeight),
                line, mappedPos;

            line = Math.floor(editor.scrollTop / lineHeight);
            if (!scrollMap) {
                scrollMap = buildScrollMap();
            }
            mappedPos = scrollMap[line];
            slideTo(preview, mappedPos, 100);
        }, 50, { maxDelay: 50 }));

        window.addEventListener('scroll', debounce(function () {
            if (!previewActive) {
                return;
            }

            var scrollTop = preview.scrollTop,
                lineHeight = parseFloat(
                    window.getComputedStyle(
                        editor.querySelector('textarea')).lineHeight),
                lines, i, line, marginHeight;

            marginHeight = (document.querySelector('#preview').offsetHeight -
                document.querySelector('#preview').clientHeight) / 2;
            scrollTop -= marginHeight;

            if (!scrollMap) {
                scrollMap = buildScrollMap();
            }

            lines = Object.keys(scrollMap);

            if (lines.length < 1) {
                return;
            }

            line = lines[0];

            for (i = 1; i < lines.length; i++) {
                if (scrollMap[lines[i]] < scrollTop) {
                    line = lines[i];
                    continue;
                }

                break;
            }

            slideTo(editor, lineHeight * line, 100);
        }, 50, { maxDelay: 50 }));
    }

    document.addEventListener('WebComponentsReady', addEventCallbacks);

    /*** END Code in above block from https://markdown-it.github.io/index.js */

    var fn = function(md, options) {
        options = options || {};

        /* For each "signature", create a matching pattern in markdown-it */

        var signatures = options.signatures || [
            { name: 'author', params: [], webComponent: 'dj-author' },
            { name: 'tagline', params: [], webComponent: 'dj-tagline' },
            { name: 'tags', params: [], webComponent: 'dj-tags' },
            { name: 'image', params: [ 'align', 'width', 'src' ], webComponent: 'dj-image' },
            { name: 'video', params: [ 'align', 'width', 'src' ], webComponent: 'dj-video' },
            { name: 'break', params: [], webComponent: 'dj-break' },
            { name: 'step', params: [], webComponent: 'dj-step' }
        ];

        var name = 'dj';

        function render(tokens, idx, _options, env, self) {
            var item = tokens[idx];

            if (item.tag == 'dj-break') {
                return '<p style="clear:both"></p>';
            }

            return self.renderToken(tokens, idx, _options, env, self) +
                self.render(item.children, _options, env) + '</' + item.tag + '>';
        }

        var pattern = '';
        signatures.forEach(function(signature) {
            if (pattern != '') {
                pattern += '|';
            }

            pattern += '(' + signature.name + ')';
        })
        var regexp = new RegExp('^(' + pattern + ')'),
            prefix = [ '@'.charCodeAt(0), '['.charCodeAt(0) ];

        function dj(state, silent) {
            var start   = state.pos,
                max     = state.posMax,
                content = '',
                tokens = [],
                token,
                pos,
                attrs,
                signature;

            if (prefix[0] !== state.src.charCodeAt(start) ||
               prefix[1] !== state.src.charCodeAt(start + 1)) { return false; }

            pos = start + 2;

            var params  = [ { start: pos, end: pos }],
                pc      = 0,
                spc     = 0,
                command = null;

            /* Iterate through stream */
            while (pos < max) {
                /* If command hasn't been found yet, check if we are at the end
                 * of the first token via ] or space. If so, the command has been
                 * found. */
                if (!command) {
                    if (state.src.charCodeAt(pos) != 0x5D &&
                        !state.md.utils.isWhiteSpace(state.src.charCodeAt(pos))) {
                        pos++;
                        continue;
                    }

                    command = state.src.slice(params[0].start, pos);

                    for (signature = 0;
                         signature < signatures.length &&
                         signatures[signature].name != command; signature++);

                    if (signature === signatures.length) { return false; }

                    signature = signatures[signature];
                    spc = signature.params.length;
                    pos++;
                    params[0].start = params[0].end = pos;

                    continue;
                }

                /* If ] then done parsing */
                if (state.src.charCodeAt(pos) == 0x5D /* ] */) {
                    pos++;
                    break;
                }

                /* Only split string at whitespace while parsing for parameters */
                if (pc < spc && state.md.utils.isWhiteSpace(state.src.charCodeAt(pos))) {
                    pos++;

                    /* If the current parameter has non-whitespace, start the
                     * next parameter */
                    if (params[pc].start != params[pc].end) {
                        params.push({ start: pos, end: pos })
                        pc++;
                    }

                    continue;
                }

                /* If this parameter is blank, start it at the current pos */
                if (params[pc].start == params[pc].end) {
                    params[pc].start = params[pc].end = pos;
                }

                pos++;
                params[pc].end = pos;
            }

            /* No command or no ] matched */
            if (!command || state.src.charCodeAt(pos - 1) !== 0x5D) { return false; }

            /* Make sure there were enough parameters */
            if (pc < spc - 1) { return false; }

            // If in validation mode, return true now
            if (silent) { return true; }

            /* Extract out all of the parameters to attributes */
            attrs = [];
            for (var i = 0; i < spc; i++) {
                attrs.push([
                    signature.params[i],
                    state.src.slice(params[i].start, params[i].end)
                ]);
            }

            /* If there were more than the required parameters, then
             * the content is the last parameter -- tokenize it */
            if (pc == spc) {
                content = state.src.slice(params[pc].start, params[pc].end);

                /* Pass the last parameter as content to be parsed */
                state.md.inline.parse(
                    content,
                    state.md,
                    state.env,
                    tokens
                );
            }

            token          = state.push('dj', signature.webComponent, 0);
            token.attrs    = attrs;
            token.children = tokens;
            token.content  = content;

            state.pos = pos;

            return true;
        }

        md.inline.ruler.before('emphasis', 'dj', dj);
        md.renderer.rules['dj'] = render;

        md.renderer.rules.paragraph_open = md.renderer.rules.heading_open = injectLineNumbers;
    }

    var steps = 1;

    window.md = (function() {
        var md = window.markdownit({
            html: false,
            xhtmlOut: false,
            breaks: false,
            langPrefix: 'language-',
            linkify: false,
            typographer: false,
            highlight: function (str, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(lang, str).value;
                    } catch (__) {}
                }

                return ''; // use external default escaping
            }
        });

        window.markdownitCheckbox(md);

        window.markdownitContainer(md, 'step', {
            validate: function(params) {
               return params.trim().match(/^step(\s+(.*))?$/);
            },

            render: function (tokens, idx) {
                if (tokens[idx].nesting !== 1) {
                    return "</dj-step>\n";
                }

                var m = tokens[idx].info.trim().match(/^step(\s+(.*))?$/),
                    title = '';

                if (typeof m[2] !== 'undefined') {
                    return "<dj-step number='" + (steps++) + "' " +
                        "title='" + md.utils.escapeHtml(m[2]) + "'>\n";
                }

                return "<dj-step number='" + (steps++) + "'>\n";

            }
        });

        window.markdownitContainer(md, 'note', {
            validate: function(params) {
               return params.trim().match(/^note(\s+(warning|error|tip))?$/);
            },

            render: function (tokens, idx) {
                if (tokens[idx].nesting !== 1) {
                    return "</dj-note>\n";
                }

                var m = tokens[idx].info.trim().match(/^note(\s+(warning|error|tip))?$/);
                if (typeof m[2] !== 'undefined') {
                    return '<dj-note severity=' + m[2] + '>';
                }
                return "<dj-note>\n";

            }
        });

        window.markdownitContainer(md, 'introduction', {
            validate: function(params) {
               return params.trim().match(/^intro(duction)?(\s+(.*))?$/);
            },

            render: function (tokens, idx) {
                if (tokens[idx].nesting !== 1) {
                    return "</dj-introduction>\n";
                }

                return "<dj-introduction>\n";

            }
        });

        window.markdownitContainer(md, 'ingredients', {
            validate: function(params) {
               return params.trim().match(/^ingredients?(\s+(.*))?$/);
            },

            render: function (tokens, idx) {
                if (tokens[idx].nesting !== 1) {
                    return "</dj-ingredients>\n";
                }

                return "<dj-ingredients>\n";

            }
        });

        fn(md);

        md.updateResult = updateResult;

        return md;
    })();
})();
