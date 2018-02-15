import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { WebUsbService } from '../../../../shared/webusb/webusb.service';

@Component({
    moduleId: module.id,
    selector: 'sd-sidebar-device-files',
    templateUrl: 'sidebar-device-files.component.html',
    styleUrls: ['sidebar-device-files.component.css']
})
export class SidebarDeviceFilesComponent implements OnInit {
    @Output()
    private onFileSelected = new EventEmitter();

    @Output()
    private onDeviceFileDeleted = new EventEmitter();

    private fileCount : number = 0;
    private fileArray = [];

    // subscription: Subscription;
    constructor(public webusbService: WebUsbService) { }

    ngOnInit() {
        this.getFileInfo();
    }

    // tslint:disable-next-line:no-unused-locals
    public onDeviceFilenameClicked(filename: string) {
        this.webusbService.load(filename)
        .then(async (res) => {
        this.onFileSelected.emit({
            filename: filename,
            contents: res
        });
    });
        return false;
    }

    // tslint:disable-next-line:no-unused-locals
    public onDeleteDeviceFileClicked(filename: string) {
        let that = this;
        this.webusbService.rm(filename)
        .then(async (res) => {
            that.onDeviceFileDeleted.emit(filename);
            that.getFileInfo();
        });
        return false;
    }

    private getFileInfo() {
        let deviceThis = this;
        this.webusbService.lsArray()
        .then( function (arr) {
            deviceThis.fileArray = arr;
            deviceThis.fileCount = deviceThis.fileArray.length;
        });
    }
}
