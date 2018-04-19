import { browser, element, by, protractor, ElementFinder } from 'protractor';


describe('Editor', () => {
    beforeEach(async () => {
        await browser.get('/#/editor');
        return browser.driver.wait(function () {
            let until = protractor.ExpectedConditions;
            let elem = element(by.css('sd-editor'));
            browser.wait(until.visibilityOf(elem), 10000);
            return elem;
        });

    });

    it('should have correct nav text for Home', async () => {
        let el = element(by.css('sd-navbar .navbar-right li:nth-child(1) a'));
        expect(await el.getText()).toEqual('Home');
    });

    it('should have correct nav text for Editor', async () => {
        let el = element(by.css('sd-navbar .navbar-right li:nth-child(2) a'));
        expect(await el.getText()).toEqual('Editor');
    });

    it('adding/removing tabs should work', async () => {
        let btn = element(by.id('new-tab-button'));
        btn.click();

        let tablist = element.all(by.css('#tab-bar .nav-item'));

        expect(await tablist.count()).toBe(2);
        let len = await tablist.count();

        for (var i =0; i < len; i++) {
            let txt = await tablist.get(i).getText();
            console.log('Tab ' + i + ' = ' + txt);
        }
        let closeTabBtn = element(by.css('#tab-bar .nav-item:last-child .close-tab'));
        closeTabBtn.click();
        expect(await tablist.count()).toBe(1);
    });

    it('editing tab title should work', async () => {
        let editBtn = element(by.css('.edit-tab')),
            closeBtn = element(by.css('.close-tab')),
            title = element(by.css('.tab-title')),
            input = element(by.css('.tab-title-editor'));

        expect(await editBtn.isDisplayed()).toBe(false);
        expect(await title.isDisplayed()).toBe(true);
        expect(await input.isDisplayed()).toBe(false);

        // Let's click the edit button
        browser.executeScript('arguments[0].click()', editBtn);
        browser.wait(protractor.ExpectedConditions.visibilityOf(input), 1000);
        expect(await title.isDisplayed()).toBe(false);
        expect(await input.isDisplayed()).toBe(true);
        expect(await closeBtn.isDisplayed()).toBe(false);

        input.sendKeys('NEW TITLE');
        input.sendKeys(protractor.Key.ENTER);

        expect(await editBtn.isDisplayed()).toBe(false);
        expect(await title.isDisplayed()).toBe(true);
        expect(await input.isDisplayed()).toBe(false);

        expect(await title.getText()).toBe('NEW TITLE');
    });

    it('trying to have two tabs with the same title should fail', async () => {
        let newTabBtn = element(by.id('new-tab-button'));

        // Set up two tabs
        newTabBtn.click();
        let tabs = element.all(by.css('#tab-bar .nav-item'));
        expect(await tabs.count()).toBe(2);
        expect(await tabs.get(0).getText()).toBe('Tab # 1');
        expect(await tabs.get(1).getText()).toBe('Tab # 2');

        // Rename second oab
        browser.executeScript('arguments[0].click()',
            element(by.css('#tab-bar .nav-item:last-child .edit-tab')));
        let input = element(by.css('#tab-bar .nav-item:last-child .tab-title-editor'));
        browser.wait(() => { return input.isDisplayed(); }, 1000);

        // Error status
        input.sendKeys('Tab # 1');
        input.sendKeys(protractor.Key.ENTER);
        expect(await input.getAttribute('class')).toMatch('has-error');
        expect(await input.isDisplayed()).toBe(true);

        // Esc doesn't let you leave editing
        input.sendKeys(protractor.Key.ESCAPE);
        expect(await input.isDisplayed()).toBe(true);

        // Sending a new key remove the error status
        input.sendKeys('0');
        expect(await input.getAttribute('class')).not.toMatch('has-error');
    });


    it('toggling the console should work', async () => {
        let toggleBtn = element(by.css('#editor-footer button.toggle-console')),
            console = element(by.css('sd-console'));

        expect(await console.isDisplayed()).toBe(true);
        // Using browser.executeScript because otherwise a notification about
        // missing webusb support would receive the click :)
        browser.executeScript('arguments[0].click()', toggleBtn);
        expect(await console.isDisplayed()).toBe(false);
    });

    it('saving a file should work', async () => {
        let saveBtn = element(by.css('sd-device-toolbar .save')),
            filesLink = element(by.css('.primary-sidebar a.files'));

        saveBtn.click();
        browser.wait(protractor.ExpectedConditions.visibilityOf(element(by.css('.save-modal'))), 1000);
        // No filename is there by default if the tab is pristine
        expect(await element(by.css('.save-modal input[name="filename"]')).getAttribute('value')).toBe('');
        // Cancel
        element(by.css('.save-modal .modal-footer button[data-dismiss="modal"]')).click();
        browser.wait(protractor.ExpectedConditions.stalenessOf(element(by.css('.modal-backdrop'))), 1000);

        // Let's rename the tab
        browser.executeScript('arguments[0].click()', element(by.css('.edit-tab')));
        browser.wait(protractor.ExpectedConditions.visibilityOf(element(by.css('.tab-title-editor'))), 1000);
        element(by.css('.tab-title-editor')).sendKeys('New title');
        element(by.css('.tab-title-editor')).sendKeys(protractor.Key.ENTER);
        browser.wait(protractor.ExpectedConditions.invisibilityOf(element(by.css('.tab-title-editor'))), 1000);

        // Now we click the save button again
        saveBtn.click();
        browser.wait(protractor.ExpectedConditions.visibilityOf(element(by.css('.save-modal'))), 1000);
        // The title is there as a default for the filename
        expect(await element(by.css('.save-modal input[name="filename"]')).getAttribute('value')).toBe('New title');
        // Save
        element(by.css('.save-modal .modal-footer .btn-primary')).click();
        browser.wait(protractor.ExpectedConditions.stalenessOf(element(by.css('.modal-backdrop'))), 1000);
        filesLink.click();
        expect(await element.all(by.css('.secondary-sidebar .files li')).count()).toBe(1);
        expect(await element(by.css('.secondary-sidebar .files .filename')).getText()).toMatch('New title');
        expect(await element(by.css('.secondary-sidebar .files .size')).getText()).toBe('0 bytes');

        browser.executeScript('localStorage.removeItem("zephyrjs-ide.FILES.New title");');
    });

    it('files link in sidebar should have correct count', async () => {
        let count = element(by.css('ng-sidebar aside ul li a.files .count')),
            emptyLabel = element(by.css('.secondary-sidebar .files .empty')),
            filesLink = element(by.css('.primary-sidebar a.files')),
            saveBtn = element(by.css('sd-device-toolbar .save')),
            saveModal = element(by.css('.save-modal')),
            filenameInput = element(by.css('.save-modal input[name="filename"]'));

        expect(await count.getText()).toBe('(0)');

        filesLink.click();
        expect(await emptyLabel.isPresent()).toBe(true);
        filesLink.click();

        saveBtn.click();
        browser.wait(protractor.ExpectedConditions.visibilityOf(saveModal), 1000);
        expect(await saveModal.isDisplayed()).toBe(true);

        filenameInput.sendKeys('FILENAME');
        filenameInput.sendKeys(protractor.Key.ENTER);
        browser.wait(protractor.ExpectedConditions.stalenessOf(element(by.css('.modal-backdrop'))), 1000);
        expect(await count.getText()).toBe('(1)');

        filesLink.click();
        expect(await emptyLabel.isPresent()).toBe(false);
        filesLink.click();

        browser.executeScript('localStorage.removeItem("zephyrjs-ide.FILES.FILENAME");');
    });

    it('examples link in sidebar should have correct count', async () => {
        let count = element(by.css('ng-sidebar aside ul li a.examples .count'));
        expect(await count.getText()).toBe('(5)');
    });

    it('secondary sidebar toggles when clicking on Files menu', async () => {
        let filesLink = element(by.css('.primary-sidebar a.files')),
            secondarySidebar = element(by.css('.secondary-sidebar aside'));

        filesLink.click();
        expect(await secondarySidebar.getCssValue('transform')).toBe('none');

        filesLink.click();
        expect(await secondarySidebar.getCssValue('transform')).not.toBe('none');
    });

    it('secondary sidebar toggles when clicking on Examples menu', async () => {
        let examplesLink = element(by.css('.primary-sidebar a.examples')),
            secondarySidebar = element(by.css('.secondary-sidebar aside'));

        examplesLink.click();
        expect(await secondarySidebar.getCssValue('transform')).toBe('none');

        examplesLink.click();
        expect(await secondarySidebar.getCssValue('transform')).not.toBe('none');
    });


    it('secondary sidebar closes when clicking on close button', async () => {
        let filesLink = element(by.css('.primary-sidebar a.files')),
            secondarySidebar = element(by.css('.secondary-sidebar aside')),
            closeBtn = element(by.css('.secondary-sidebar aside .close'));

        filesLink.click();
        expect(await secondarySidebar.getCssValue('transform')).toBe('none');

        closeBtn.click();
        expect(await secondarySidebar.getCssValue('transform')).not.toBe('none');
    });

    it('clicking on a file should open it', async () => {
        let saveBtn = element(by.css('sd-device-toolbar .save')),
            filesLink = element(by.css('.primary-sidebar a.files')),
            saveModal = element(by.css('.save-modal')),
            filenameInput = element(by.css('.save-modal input[name="filename"]')),
            secondarySidebar = element(by.css('.secondary-sidebar aside')),
            filename: ElementFinder = null;

        // Save file
        saveBtn.click();
        browser.wait(protractor.ExpectedConditions.visibilityOf(saveModal), 1000);
        expect(await saveModal.isDisplayed()).toBe(true);
        filenameInput.sendKeys('FILENAME');
        filenameInput.sendKeys(protractor.Key.ENTER);
        browser.wait(protractor.ExpectedConditions.stalenessOf(element(by.css('.modal-backdrop'))), 1000);

        // Open sidebar
        filesLink.click();
        element(by.css('.secondary-sidebar aside ul li:first-child a.filename')).click();

        // The secondary sidebar closes.
        expect(await secondarySidebar.getCssValue('transform')).not.toBe('none');

        // The tab count is still 1.
        let tablist = element.all(by.css('#tab-bar .nav-item'));
        expect(await tablist.count()).toBe(1);

        // The title of the tab is what we set.
        expect(await element(by.css('#tab-bar .nav-item:first-child .tab-title')).getText()).toBe('FILENAME');

        // Opening the same file again should direct to the same tab again
        filesLink.click();
        filename = element(by.css('.secondary-sidebar aside ul li:first-child a.filename'));
        filename.click();

        // The tab count is still 1.
        expect(await tablist.count()).toBe(1);

        // The title of the only tab is still what we set.
        expect(await element(by.css('#tab-bar .nav-item:first-child .tab-title')).getText()).toBe('FILENAME');

        browser.executeScript('localStorage.removeItem("zephyrjs-ide.FILES.FILENAME");');
    });

    it('clicking on an example should open it', async () => {
        let examplesLink = element(by.css('.primary-sidebar a.examples')),
            secondarySidebar = element(by.css('.secondary-sidebar aside')),
            filename: ElementFinder = null;

        // Open sidebar
        examplesLink.click();
        element(by.css('.secondary-sidebar aside ul li:first-child a.example')).click();

        // The secondary sidebar closes.
        expect(await secondarySidebar.getCssValue('transform')).not.toBe('none');

        // The tab count is now 2.
        let tablist = element.all(by.css('#tab-bar .nav-item'));
        expect(await tablist.count()).toBe(2);

        // Opening the same file again should direct to the same tab again
        examplesLink.click();
        filename = element(by.css('.secondary-sidebar aside ul li:first-child a.example'));
        filename.click();

        // The tab count is still 2.
        expect(await tablist.count()).toBe(2);
    });

    it('deleting a file should work', async () => {
        let saveBtn = element(by.css('sd-device-toolbar .save')),
            filesLink = element(by.css('.primary-sidebar a.files')),
            saveModal = element(by.css('.save-modal')),
            filenameInput = element(by.css('.save-modal input[name="filename"]')),
            count = element(by.css('.primary-sidebar a.files .count'));

        // Save file
        saveBtn.click();
        browser.wait(protractor.ExpectedConditions.visibilityOf(saveModal), 1000);
        expect(await saveModal.isDisplayed()).toBe(true);
        filenameInput.sendKeys('FILENAME');
        filenameInput.sendKeys(protractor.Key.ENTER);
        browser.wait(protractor.ExpectedConditions.stalenessOf(element(by.css('.modal-backdrop'))), 1000);

        // Open sidebar
        filesLink.click();

        // Click delete button
        element(by.css('.secondary-sidebar .files .delete')).click();

        expect(await count.getText()).toBe('(0)');
        browser.executeScript('localStorage.removeItem("zephyrjs-ide.FILES.FILENAME");');
    });

    it('should have 10 tabs at the most', async () => {
        let btn = element(by.id('new-tab-button')),
            tablist = element.all(by.css('#tab-bar .nav-item')),
            closeTabBtn = element(by.css('#tab-bar .nav-item.active .close-tab'));

        expect(await btn.isEnabled()).toBe(true);
        for (let i = 0; i < 9; i++) {
            btn.click();
        }
        expect(await btn.isEnabled()).toBe(false);
        expect(await tablist.count()).toBe(10);
    });

    it('toggling the sidebar should work', () => {
        let sidebarFiles = element(by.css('#editor-route .primary-sidebar a.files span.count')),
            sidebarExamples = element(by.css('#editor-route .primary-sidebar a.examples span.count')),
            sidebarGithub = element(by.css('#editor-route .primary-sidebar a.github span'));

        var sidebarBtns = [sidebarFiles, sidebarExamples, sidebarGithub];
        sidebarBtns.forEach(async (ele) => {
            expect(await ele.isDisplayed()).toBe(true);
        });

        let toggleBtn = element(by.css('#editor-route .primary-sidebar button.toggleCollapse'));
        toggleBtn.click();
        sidebarBtns.forEach(async (ele) => {
            expect(await ele.isPresent()).toBe(false);
        });

        toggleBtn.click();
        sidebarBtns.forEach(async (ele) => {
            expect(await ele.isDisplayed()).toBe(true);
        });
    });

    it('closing multiple tabs should work', async () => {
        let btn = element(by.id('new-tab-button')),
            tablist = element.all(by.css('#tab-bar .nav-item')),
            activeTab = element(by.css('#tab-bar .nav-item.active .tab-title')),
            closeTabBtn = element(by.css('#tab-bar .nav-item.active .close-tab'));

        expect(await tablist.count()).toBe(1);

        for (let i = 2; i <= 4; i++) {
            btn.click();
        }

        for (let i = 4; i > 0; i--) {
            expect(await tablist.count()).toBe(i);
            expect(await activeTab.getText()).toEqual('Tab # ' + i);
            closeTabBtn.click();
        }

        // Tab # 1 is always reserved.
        expect(await tablist.count()).toBe(1);
        expect(await activeTab.getText()).toEqual('Tab # 1');
    });
});
