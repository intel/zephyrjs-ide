// Core
import { Component, ElementRef, ViewChild } from '@angular/core';

// Third party
import { LocalStorageService } from 'angular-2-local-storage';
import { NotificationsService } from 'angular2-notifications';

// Own
import { AppDataService } from '../../app.data.service';
import { BoardExplorerService } from './components/board-explorer/board-explorer.service';
import { FileService } from './file.service';
import { ExampleService } from './example.service';
import { EditorTab } from './editor.tab';
import { WebUsbService } from '../../shared/webusb/webusb.service';
import { SidebarDeviceFilesModule } from './components/sidebar-device-files/sidebar-device-files.module';

@Component({
    moduleId: module.id,
    selector: 'sd-editor',
    templateUrl: 'editor.component.html',
    styleUrls: ['editor.component.css'],
    providers: [BoardExplorerService, ExampleService, FileService]
})
export class EditorComponent {
    public notificationOptions = {
        timeOut: 3000,
        showProgressBar: false
    };

    public sidebarOptions = {
        opened: true
    };

    public secondarySidebarOptions = {
        opened: false,
        content: ''
    };

    public tabs: Array<EditorTab>;

    public currentBoard: string = null;
    public currentBoardDocs: string = null;

    @ViewChild('toggleConsoleButton')
    public toggleConsoleButton: ElementRef;

    public consoleToggledOff: boolean = false;


    // Methods

    constructor(
        private appDataService: AppDataService,
        public boardExplorerService: BoardExplorerService,
        public exampleService: ExampleService,
        public fileService: FileService,
        private localStorageService: LocalStorageService,
        private notificationsService: NotificationsService,
        public webusbService: WebUsbService,
        public deviceFiles: SidebarDeviceFilesModule) {

        this.tabs = appDataService.editorTabs;

        let opened: boolean = this.localStorageService.get('sidebarOptions.opened') as boolean;
        if (opened === null) {
            // Default
            this.sidebarOptions.opened = true;
        } else {
            this.sidebarOptions.opened = opened;
        }

        let off: boolean = this.localStorageService.get('consoleToggledOff') as boolean;
        if (off === null) {
            // Default
            this.consoleToggledOff = false;
        }
        this.consoleToggledOff = off;

        this.currentBoard = this.localStorageService.get('currentBoard') as string;
        if (this.currentBoard === null) {
            this.currentBoard = this.boardExplorerService.listBoards()[0];
        }
    }

    // tslint:disable-next-line:no-unused-locals
    public onToggleSidebar() {
        this.sidebarOptions.opened = !this.sidebarOptions.opened;
        this.localStorageService.set('sidebarOptions.opened', this.sidebarOptions.opened);
        this._adjustBackdropPosition();
    }

    // tslint:disable-next-line:no-unused-locals
    public onToggleConsole() {
        this.consoleToggledOff = !this.consoleToggledOff;
        this.localStorageService.set('consoleToggledOff', this.consoleToggledOff);
    }

    // tslint:disable-next-line:no-unused-locals
    public onCloseSecondarySidebar() {
        this.secondarySidebarOptions.opened = false;
        this.secondarySidebarOptions.content = '';
    }

    // tslint:disable-next-line:no-unused-locals
    public onFilesClicked() {
        if (this.secondarySidebarOptions.opened &&
            this.secondarySidebarOptions.content === 'files') {
            this.onCloseSecondarySidebar();
        } else {
            this.secondarySidebarOptions.content = 'files';
            this.secondarySidebarOptions.opened = true;
            this._adjustBackdropPosition();
        }
        return false;
    }

    // tslint:disable-next-line:no-unused-locals
    public onExamplesClicked() {
        if (this.secondarySidebarOptions.opened &&
            this.secondarySidebarOptions.content === 'examples') {
            this.onCloseSecondarySidebar();
        } else {
            this.secondarySidebarOptions.content = 'examples';
            this.secondarySidebarOptions.opened = true;
            this._adjustBackdropPosition();
        }
        return false;
    }

    // tslint:disable-next-line:no-unused-locals
    public onGitHubClicked() {
        if (this.secondarySidebarOptions.opened &&
            this.secondarySidebarOptions.content === 'github') {
            this.onCloseSecondarySidebar();
        } else {
            this.secondarySidebarOptions.content = 'github';
            this.secondarySidebarOptions.opened = true;
            this._adjustBackdropPosition();
        }
        return false;
    }

    // tslint:disable-next-line:no-unused-locals
    public onSettingsClicked() {
        if (this.secondarySidebarOptions.opened &&
            this.secondarySidebarOptions.content === 'settings') {
            this.onCloseSecondarySidebar();
        } else {
            this.secondarySidebarOptions.content = 'settings';
            this.secondarySidebarOptions.opened = true;
            this._adjustBackdropPosition();
        }
        return false;
    }

    // tslint:disable-next-line:no-unused-locals
    public onDeviceFilesClicked() {
        if (this.secondarySidebarOptions.opened &&
            this.secondarySidebarOptions.content === 'device') {
            this.onCloseSecondarySidebar();
        } else {
            this.secondarySidebarOptions.content = 'device';
            this.secondarySidebarOptions.opened = true;
            this._adjustBackdropPosition();
        }
        return false;
    }

    // tslint:disable-next-line:no-unused-locals
    public onFileSelected(file: any) {
        // Switch to it if we already have it open
        for(let tab of this.tabs) {
            if (tab.title === file.filename) {
                this.appDataService.activateEditorTab(tab);
                this.onCloseSecondarySidebar();
                return;
            }
        }

        // Otherwise we create a new tab

        function _setContents(tab: EditorTab, contents: string) {
            // Wait for editor to become available
            setTimeout(() => {
                if (tab.editor !== null) {
                    tab.editor.setValue(contents);
                } else {
                    _setContents(tab, contents);
                }
            }, 100);
        }

        let newTab = this.appDataService.newEditorTab();
        newTab.title = file.filename;
        _setContents(newTab, file.contents);

        this.onCloseSecondarySidebar();
    }

    // tslint:disable-next-line:no-unused-locals
    public onExampleSelected(example: any) {
        // Switch to it if we already have it open
        for(let tab of this.tabs) {
            if (tab.title === example.filename) {
                this.appDataService.activateEditorTab(tab);
                this.onCloseSecondarySidebar();
                return;
            }
        }

        // Otherwise we create a new tab

        function _setContents(tab: EditorTab, contents: string) {
            // Wait for editor to become available
            setTimeout(() => {
                if (tab.editor !== null) {
                    tab.editor.setValue(contents);
                } else {
                    _setContents(tab, contents);
                }
            }, 100);
        }

        let newTab = this.appDataService.newEditorTab();
        newTab.title = example.filename;
        _setContents(newTab, example.contents);

        this.onCloseSecondarySidebar();
    }

    // tslint:disable-next-line:no-unused-locals
    public onGitHubFileSelected(file: any) {
        // Switch to it if we already have it open
        for(let tab of this.tabs) {
            if (tab.title === file.filename) {
                this.appDataService.activateEditorTab(tab);
                this.onCloseSecondarySidebar();
                return;
            }
        }

        // Otherwise we create a new tab

        function _setContents(tab: EditorTab, contents: string) {
            // Wait for editor to become available
            setTimeout(() => {
                if (tab.editor !== null) {
                    tab.editor.setValue(contents);
                } else {
                    _setContents(tab, contents);
                }
            }, 100);
        }

        let newTab = this.appDataService.newEditorTab();
        newTab.title = file.filename;
        _setContents(newTab, file.contents);

        this.onCloseSecondarySidebar();
    }

    public onDeviceFileSelected(file: any) {
        // Switch to it if we already have it open
        for(let tab of this.tabs) {
            if (tab.title === file.filename) {
                this.appDataService.activateEditorTab(tab);
                this.onCloseSecondarySidebar();
                return;
            }
        }

        // Otherwise we create a new tab

        function _setContents(tab: EditorTab, contents: string) {
            // Wait for editor to become available
            setTimeout(() => {
                if (tab.editor !== null) {
                    tab.editor.setValue(contents);
                } else {
                    _setContents(tab, contents);
                }
            }, 100);
        }

        let newTab = this.appDataService.newEditorTab();
        newTab.title = file.filename;
        _setContents(newTab, file.contents);

        this.onCloseSecondarySidebar();
    }

    // tslint:disable-next-line:no-unused-locals
    public onCloseConsole() {
        this.consoleToggledOff = true;
        this.localStorageService.set('consoleToggledOff', this.consoleToggledOff);
        return false;
    }

    // tslint:disable-next-line:no-unused-locals
    public onWarning(message: any) {
        let overrides: any = {};

        if (message.sticky) {
            overrides['timeOut'] = 0;
        }

        this.notificationsService.alert(
            message.header, message.body, overrides);
    }

    // tslint:disable-next-line:no-unused-locals
    public onError(message: any) {
        let overrides: any = {};

        if (message.sticky) {
            overrides['timeOut'] = 0;
        }

        this.notificationsService.error(
            message.header, message.body, overrides);
    }

    // tslint:disable-next-line:no-unused-locals
    public onSuccess(message: any) {
        let overrides: any = {};

        if (message.sticky) {
            overrides['timeOut'] = 0;
        }

        this.notificationsService.success(
            message.header, message.body, overrides);
    }

    // tslint:disable-next-line:no-unused-locals
    public onBeginResizing($event: any) {
        let overlays = document.getElementsByClassName(
            'console-resizing-overlay');
        [].forEach.call(overlays, (overlay: HTMLElement) => {
            overlay.style.display = 'block';
        });
    }

    // tslint:disable-next-line:no-unused-locals
    public onEndedResizing($event: any) {
        let overlays = document.getElementsByClassName(
            'console-resizing-overlay');
        [].forEach.call(overlays, (overlay: HTMLElement) => {
            overlay.style.display = 'none';
        });
    }

    // tslint:disable-next-line:no-unused-locals
    public onSelectBoard(board: string): boolean {
        this.currentBoard = board;
        this.localStorageService.set('currentBoard', this.currentBoard);
        return false;
    }

    // tslint:disable-next-line:no-unused-locals
    public onBoardInfoClicked(board: string): boolean {
        this.boardExplorerService.getBoardDocs(board)
            .subscribe((docs: string) => {
                this.currentBoardDocs = docs;
            });
        return false;
    }

    ///////////////////////////////////////////////////////////////////////////

    /*
    Position the secondary sidebar's backdrop accurately. Unfortunately we
    cannot do this via CSS because the secondary sidebar's backdrop does not
    have an ancestor that specifies whether or not the primary sidebar is
    closed, even tho the secondary sidebar is nested within the primary one.

    We do stuff in a timeout to allow the DOM to be updated with the newly
    created .ng-sidebar__backdrop element.
    */
    private _adjustBackdropPosition() {
        let left = ['480px','372px'],
            width = ['calc(100% - 480px)', 'calc(100% - 372px)'];

        setTimeout(() => {
            let backdrop = document.getElementsByClassName(
                'ng-sidebar__backdrop')[0] as HTMLElement;
            if (backdrop !== undefined) {
                backdrop.style.left = left[this.sidebarOptions.opened ? 0 : 1];
                backdrop.style.width =
                    width[this.sidebarOptions.opened ? 0 : 1];
            }
        }, 1);
    }
}
