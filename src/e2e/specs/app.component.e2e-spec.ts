import { browser, element, by } from 'protractor';


describe('App', () => {
    beforeEach(async () => {
        console.log('BJONES before each app component!');
        return await browser.get('/');
    });

    it('should have a title', async () => {
        console.log('BJONES app 1');
        expect(await browser.getTitle()).toEqual('JS IDE for Zephyr OS');
        console.log('BJONES app 1 DONE');
    });

    it('should have <nav>', async () => {
        console.log('BJONES app 1');
        expect(await element(by.css('sd-navbar nav')).isPresent()).toEqual(true);
        console.log('BJONES app 2 DONE');
    });

    it('routing should preserve editor tabs', () => {
        let tabs;
        console.log('BJONES in routing should preserve!');
        // Initial check
        browser.ignoreSynchronization = true;
        browser.get('/#/editor');
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
        console.log('BJONES DONE WITH PRESERVE!');
    });
});
