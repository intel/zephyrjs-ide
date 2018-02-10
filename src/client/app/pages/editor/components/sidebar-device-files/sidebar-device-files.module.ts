// Core modules
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

// Third-party modules
import { Angular2FontawesomeModule } from 'angular2-fontawesome';
//import { LocalStorageModule } from 'angular-2-local-storage';
import { WebUsbService } from '../../../../shared/webusb/webusb.service';
//import { WebUsbPort } from '../../../../shared/webusb/webusb.port';

// This module
import { SidebarDeviceFilesComponent } from './sidebar-device-files.component';


@NgModule({
    imports: [
        CommonModule,
        Angular2FontawesomeModule,

    ],
    declarations: [SidebarDeviceFilesComponent],
    exports: [SidebarDeviceFilesComponent]
})
export class SidebarDeviceFilesModule { }
