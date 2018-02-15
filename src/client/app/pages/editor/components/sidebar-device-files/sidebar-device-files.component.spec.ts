import { Component } from '@angular/core';
import {
  async,
  TestBed
} from '@angular/core/testing';

// Third party
import {
    LocalStorageModule, LocalStorageService
} from 'angular-2-local-storage';

import { AppDataService } from '../../../../app.data.service';
import { SidebarDeviceFilesModule } from './sidebar-device-files.module';
import { SettingsService } from '../../settings.service';
import { WebUsbService } from '../../../../shared/webusb/webusb.service';

export function main() {
   describe('SidebarDeviceFiles component', () => {

    beforeEach(() => {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

      TestBed.configureTestingModule({
        declarations: [TestComponent],
        providers: [
            AppDataService,
            LocalStorageService,
            SettingsService,
            WebUsbService
        ],
        imports: [
            LocalStorageModule.withConfig({
                prefix: 'zephyrjs-ide-test',
                storageType: 'localStorage'
            }),
            SidebarDeviceFilesModule]
      });
    });

    it('should work',
      async(() => {
        TestBed.compileComponents().then(() => {
            let fixture = TestBed.createComponent(TestComponent);
            expect(fixture).not.toBe(null);
          });
        }));
    });
}

@Component({
  selector: 'test-cmp',
  template: '<sd-sidebar-device-files></sd-sidebar-device-files>'
})
class TestComponent { }
