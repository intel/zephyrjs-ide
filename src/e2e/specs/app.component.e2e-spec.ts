import { browser, element, by } from 'protractor';


describe('App', () => {
    beforeEach(async () => {
        return await browser.get('/');
    });

    it('should have a title', async () => {
        expect(await browser.getTitle()).toEqual('JS IDE for Zephyr OS');
    });

    it('should have <nav>', async () => {
        expect(await element(by.css('sd-navbar nav')).isPresent()).toEqual(true);
    });
});

describe('App part 2', () => {
    beforeEach(async () => {
        return await browser.get('/#/editor');
    });

    it('routing should preserve editor tabs', () => {
        let tabs;

        // Initial check
        browser.ignoreSynchronization = true;
        tabs = element.all(by.css('sd-editor .left-component a.nav-link'));
        expect(tabs.count()).toEqual(1);

        // Add a tab
        element(by.id('new-tab-button')).click();
        tabs = element.all(by.css('sd-editor .left-component a.nav-link'));
        expect(tabs.count()).toEqual(2);

        // Route to About
        element(by.css('sd-navbar .navbar-right li:nth-child(1) a')).click();

        // Route back to Editor
        element(by.css('sd-navbar .navbar-right li:nth-child(2) a')).click();
        tabs = element.all(by.css('sd-editor .left-component a.nav-link'));
        expect(tabs.count()).toEqual(2);
    });
});
