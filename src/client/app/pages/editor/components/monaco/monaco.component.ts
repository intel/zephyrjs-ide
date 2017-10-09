import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    Output,
    ViewChild
} from '@angular/core';

import { SettingsService } from '../../settings.service';
import { WebUsbService } from '../../../../shared/webusb/webusb.service';

import { WebUsbPort } from '../../../../shared/webusb/webusb.port';
import { EditorTab, OPERATION_STATUS } from '../../editor.tab';

import { AppHints } from '../../../../app.hints';

declare const monaco: any;


@Component({
    moduleId: module.id,
    selector: 'sd-monaco',
    templateUrl: 'monaco.component.html',
    styleUrls: ['monaco.component.css']
})
export class MonacoComponent implements AfterViewInit {
    @Input('tab') tab: EditorTab;
    @Output() onWarning = new EventEmitter();
    @Output() onError = new EventEmitter();
    @Output() onSuccess = new EventEmitter();

    public filename: string = '';
    public saveToDevice: boolean = false;

    @ViewChild('editor')
    private editorView: ElementRef;

    private initialCode: string = '';

    constructor(
        private settingsService: SettingsService,
        private webusbService: WebUsbService) {
    }

    public ngAfterViewInit() {
        var onGotAmdLoader = () => {
            // Load monaco
            (<any>window).require.config({ paths: { 'vs': 'libs/monaco/vs' } });
            (<any>window).require(['vs/editor/editor.main'], () => {
                this.initMonaco();
                this.initAppHints();
            });
        };

        // Load AMD loader if necessary
        // WARNING: this will 404 doing unit tests. It's fine.
        if (!(<any>window).require) {
            var loaderScript = document.createElement('script');
            loaderScript.type = 'text/javascript';
            loaderScript.src = 'libs/monaco/vs/loader.js';
            loaderScript.addEventListener('load', onGotAmdLoader);
            document.body.appendChild(loaderScript);
        } else {
            onGotAmdLoader();
        }

        if (this.webusbService.usb === undefined) {
            this.onError.emit({
                body: 'Your browser does not support WebUSB',
                sticky: true
            });
        }
    }

    // Will be called once monaco library is available
    public initMonaco() {
        if (this.tab === null) {
            throw('You need to construct the monaco component with a tab');
        }

        let theme = 'vs-dark';
        let model = null;

        if (monaco.editor.defineTheme !== undefined) {
            // NOTE: keep in sync with `colors.scss`.
            let bg = '22252e';

            monaco.editor.defineTheme('web-ide', {
                base: theme,
                inherit: true,
                rules: [
                    {background: bg} // NOTE: no # symbol.
                ],
                colors: {
                    'editor.background': '#' + bg
                }
            });
            theme = 'web-ide';
        }

        if (this.tab.editor !== null) {
            model = this.tab.editor.getModel();
        }

        this.tab.editor = monaco.editor.create(this.editorView.nativeElement, {
            value: this.initialCode,
            language: 'javascript',
            automaticLayout: true,
            theme: theme,
            scrollbar: {
                useShadows: false,
                verticalScrollbarSize: 7,
                horizontalScrollbarSize: 7
            },
            hideCursorInOverviewRuler: true,
            scrollBeyondLastLine: false,

            fontSize: this.settingsService.getEditorFontSize(),
            lineNumbers: this.settingsService.getEditorLineNumbers(),
            minimap: {
               enabled: this.settingsService.getEditorMinimap()
            }
        });

        this.settingsService.onEditorFontSizeChanged.subscribe((size: number) => {
            this.tab.editor.updateOptions({fontSize: size});
        });

        this.settingsService.onEditorLineNumbersChanged.subscribe((show: boolean) => {
            this.tab.editor.updateOptions({lineNumbers: show});
        });

        this.settingsService.onEditorMinimapChanged.subscribe((show: boolean) => {
            this.tab.editor.updateOptions({minimap: {enabled: show}});
        });

        if (model !== null) {
            this.tab.editor.setModel(model);
        }
    }

    // This will overwrite the existing type hints used in the Web-IDE and
    // replace it with Zephyr.js API hints
    public initAppHints() {
        // Turn off default hints since they are not applicable
        monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ES5,
            noLib: true,
            noEmit: true,
            allowNonTsExtensions: true
        });

        // Register the ZJS API hints.
        monaco.languages.typescript.javascriptDefaults.addExtraLib(
            AppHints,
            ''
        );
    }
}
