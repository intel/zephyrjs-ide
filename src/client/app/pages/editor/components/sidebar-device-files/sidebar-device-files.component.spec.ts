import { Component } from '@angular/core';
import {
  async,
  TestBed
} from '@angular/core/testing';

import { SidebarDeviceFilesModule } from './sidebar-device-files.module';


export function main() {
   describe('SidebarDeviceFiles component', () => {

    beforeEach(() => {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

      TestBed.configureTestingModule({
        declarations: [TestComponent],
        imports: [SidebarDeviceFilesModule]
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
