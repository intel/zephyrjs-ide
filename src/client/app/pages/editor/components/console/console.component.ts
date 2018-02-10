import {
    AfterViewInit,
    Component,
    ElementRef,
    Input,
    ViewChild
} from '@angular/core';

// tslint:disable-next-line:no-implicit-any
import { hterm, lib } from 'hterm-umdjs';

import { EditorTab } from '../../editor.tab';
import { AppDataService } from '../../../../app.data.service';
import { WebUsbService } from '../../../../shared/webusb/webusb.service';
import { WebUsbPort } from '../../../../shared/webusb/webusb.port';


declare const require: any;


@Component({
    moduleId: module.id,
    selector: 'sd-console',
    templateUrl: 'console.component.html',
    styleUrls: ['console.component.css']
})
export class ConsoleComponent implements AfterViewInit {
    @ViewChild('console') private consoleView: ElementRef;

    private hterm: any = undefined;

    constructor(private appDataService: AppDataService,
                private webusbService: WebUsbService) {}

    public ngAfterViewInit()  {
        // tslint:disable-next-line:no-empty
        hterm.Terminal.prototype.showOverlay = () => {};
        hterm.defaultStorage = new lib.Storage.Memory();
        this.initTerminal();
    }

    private initTerminal() {
        if (this.appDataService.term === null) {
            this.appDataService.term = new hterm.Terminal();

            this.appDataService.term.onTerminalReady = () => {
                let io = this.appDataService.term.io.push();

                let send = (str: string) => {
                    if (this.webusbService.isConnected()) {
                        this.webusbService.send(str)
                        .catch((error: string) => {
                            io.println('Send error: ' + error);
                        });
                    } else {
                        io.println('Not connected to a device yet');
                    }
                };

                io.onVTKeystroke = (str: string) => {
                // Ignore keypresses
                };

                io.sendString = (str: string) => {
                    send(str);
                };
            };

            // TODO: replace these colors at build time, so they are always
            // in sync with src/client/scss/colors.scss.
            this.appDataService.term.prefs_.set('background-color', '#22252e');
            this.appDataService.term.prefs_.set('foreground-color', '#d9d9d9');
            this.appDataService.term.prefs_.set('cursor-color', 'rgba(100, 100, 10, 0.5)');
            this.appDataService.term.prefs_.set('font-size', 13);
            this.appDataService.term.prefs_.set('cursor-blink', true);
            this.appDataService.term.prefs_.set('scrollbar-visible', false);
        }

        this.appDataService.term.decorate(this.consoleView.nativeElement);
        this.appDataService.term.installKeyboard();
    }
}
