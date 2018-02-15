import {
    AfterViewInit, Component, ElementRef, EventEmitter, Output, ViewChild
} from '@angular/core';

import { EditorTab, OPERATION_STATUS } from '../../editor.tab';
import { AppDataService } from '../../../../app.data.service';
import { FileService } from '../../file.service';
import { WebUsbService } from '../../../../shared/webusb/webusb.service';


declare var $: any;


@Component({
    moduleId: module.id,
    selector: 'sd-device-toolbar',
    templateUrl: 'device-toolbar.component.html',
    styleUrls: ['device-toolbar.component.css']
})
export class DeviceToolbarComponent implements AfterViewInit {
    @Output() onWarning = new EventEmitter();
    @Output() onError = new EventEmitter();
    @Output() onSuccess = new EventEmitter();

    @ViewChild('saveModal')
    private saveModal: ElementRef;

    @ViewChild('overwriteModal')
    private overwriteModal: ElementRef;

    public constructor(
        public appDataService: AppDataService,
        public webusbService: WebUsbService,
        private fileService: FileService) {
    }

    public ngAfterViewInit() {
        let tab = this.appDataService.getActiveEditorTab();
        $(this.saveModal.nativeElement).on('shown.bs.modal', () => {
            document.getElementById('saveModal_filename').focus();
        });
    }

    // tslint:disable-next-line:no-unused-locals
    public mayConnect(): boolean {
        return this.webusbService.usb !== null &&
               !this.webusbService.isConnected();
    }

    // tslint:disable-next-line:no-unused-locals
    public onConnectClicked() {
        // TODO removed temporarily until new API in place
        // this.webusbService.onReceive = (data: string) => {
        //     this.appDataService.term.io.print(data);
        // };

        this.webusbService.onReceiveError = (error: DOMException) => {
            this.webusbService.disconnect()
            .catch(() => {
                // The port was unable to release the interface but that's no
                // big deal as we cleaned up anyway. We still need to catch and
                // ignore this tho.
            });
            this.onError.emit({
                header: 'Connection error',
                body: error.message
            });
        };

        this.webusbService.connect()
        .then(() => {
            this.appDataService.term.io.print('\r\nConnection established.\r\n');
            this.webusbService.init();

            this.onSuccess.emit({
                header: 'Success',
                body: 'You are now connected to the USB device'
            });
        })
        .catch((error: string) => {
            this.onError.emit({
                header: 'Connection failed',
                body: error
            });
        });
    }

    // tslint:disable-next-line:no-unused-locals
    public onDisconnectClicked() {
        this.webusbService.disconnect()
        .then(() => {
            this.onSuccess.emit({
                header: 'Success',
                body: 'You are now disconnected from the USB device'
            });
        })
        .catch((error: string) => {
            this.onError.emit({
                header: 'Disconnection failed',
                body: error
            });
        });
    }

    // tslint:disable-next-line:no-unused-locals
    public mayRun(): boolean {
        let tab = this.appDataService.getActiveEditorTab();
        return this.webusbService.usb !== null &&
               tab.editor !== null &&
               tab.editor.getValue().length > 0 &&
               tab.runStatus !== OPERATION_STATUS.IN_PROGRESS &&
               this.webusbService.isConnected() &&
               this.webusbService.isAshellReady();
    }

    // tslint:disable-next-line:no-unused-locals
    public onRun() {
        let tab = this.appDataService.getActiveEditorTab();

        tab.runStatus = OPERATION_STATUS.IN_PROGRESS;

        this.webusbService.run(tab.editor.getValue())
        .then((warning: string) => {
            tab.runStatus = OPERATION_STATUS.DONE;

            if (warning !== undefined) {
                this.onWarning.emit({
                    header: 'Running failed',
                    body: warning
                });
            }
        })
        .catch((error: DOMException) => {
            tab.runStatus = OPERATION_STATUS.NOT_STARTED;
            this.onError.emit({
                header: 'Running failed',
                body: error.message
            });
        });
    }

    // tslint:disable-next-line:no-unused-locals
    public mayStop(): boolean {
        let tab = this.appDataService.getActiveEditorTab();
        return this.webusbService.usb !== null &&
               this.webusbService.isConnected() &&
               this.webusbService.isAshellReady();
    }

    // tslint:disable-next-line:no-unused-locals
    public onStop() {
        let tab = this.appDataService.getActiveEditorTab();

        this.webusbService.stop()
        .then((warning: string) => {
            tab.runStatus = OPERATION_STATUS.DONE;

            if (warning !== undefined) {
                this.onWarning.emit({
                    header: 'Stopping failed',
                    body: warning
                });
            }
        })
        .catch((error: DOMException) => {
            this.onError.emit({
                header: 'Stopping failed',
                body: error.message
            });
        });
    }

    // tslint:disable-next-line:no-unused-locals
    public maySave(): boolean {
        let tab = this.appDataService.getActiveEditorTab();
        return (tab.filename && tab.filename.length > 0) &&
               (!tab.saveToDevice || this._isValidFilename());
    }

    // tslint:disable-next-line:no-unused-locals
    public onSave() {
        let tab = this.appDataService.getActiveEditorTab();

        // Initialize filename to tab.title if filename was not previously
        // set and tab title is not pristine.
        if ((tab.filename === undefined || tab.filename.length === 0) &&
            !tab.title.match(/Tab # \d+/i)) {
            tab.filename = tab.title;
        }

        $(this.saveModal.nativeElement).modal('show');
    }

    // tslint:disable-next-line:no-unused-locals
    public onSaveConfirm() {
        let tab = this.appDataService.getActiveEditorTab();

        if (tab.filename === undefined || tab.filename.length === 0) {
            return;
        }

        if (tab.saveToDevice) {
            tab.filename = tab.filename.toLowerCase();
        }

        if (tab.filename !== tab.title &&
            this.fileService.exists(tab.filename)) {
            $(this.overwriteModal.nativeElement).modal('show');
        } else {
            this._doSave();
        }
    }

    // tslint:disable-next-line:no-unused-locals
    public onOverwrite() {
        this._doSave();
    }


    ///////////////////////////////////////////////////////////////////////////


    private _doSave() {
        let tab = this.appDataService.getActiveEditorTab();

        this.fileService.save(tab.filename, tab.editor.getValue(), true);

        if (this.webusbService.isConnected() && tab.saveToDevice) {
            this._saveToDevice();
        }

        tab.title = tab.filename;
        $(this.overwriteModal.nativeElement).modal('hide');
        $(this.saveModal.nativeElement).modal('hide');
    }

    private _saveToDevice() {
        let tab = this.appDataService.getActiveEditorTab();

        tab.runStatus = OPERATION_STATUS.IN_PROGRESS;

        this.webusbService.save(tab.filename, tab.editor.getValue())
        .then((warning: string) => {
            tab.runStatus = OPERATION_STATUS.DONE;

            if (warning !== undefined) {
                this.onWarning.emit({
                    header: 'Saving to device failed',
                    body: warning
                });
            } else {
                this.onSuccess.emit({
                    header: 'Saving to device successful',
                    body: 'Your file was saved'
                });
            }
        })
        .catch((error: string)  => {
            tab.runStatus = OPERATION_STATUS.NOT_STARTED;
            this.onError.emit({
                header: 'Saving to device failed',
                body: error
            });
        });
    }

    private _isValidFilename(): boolean {
        let tab = this.appDataService.getActiveEditorTab();

        // Check there aren't multiple slashes.
        if ((tab.filename.split('/').length) > 2) {
            return false;
        }

        let fnsplit = tab.filename.split('.');

        // Check there aren't multiple periods.
        if (fnsplit.length > 2) {
            return false;
        }

        let namelen = fnsplit[0].length;
        let extlen = fnsplit[1] ? fnsplit[1].length : 0;

        // Check the filename is in 8.3 format or not.
        if (namelen === 0 || namelen > 8 || extlen > 3) {
            return false;
        }

        return true;
    }

}
