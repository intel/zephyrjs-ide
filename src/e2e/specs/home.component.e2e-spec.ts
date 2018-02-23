import { browser, element, by, protractor } from 'protractor';


describe('Home', () => {

  beforeEach(async () => {
    console.log('BJONES before await in HOME');
    await browser.get('/');
    console.log('BJONES after await in HOME');
    return browser.driver.wait(function () {
        console.log('BJONES in browser await in HOME');
        let until = protractor.ExpectedConditions;
        let elem = element(by.css('sd-home'));
        browser.wait(until.visibilityOf(elem), 10000);
        console.log('BJONES after browswer await in HOME');
        return elem;
    });
  });

  it('should have editor button links to /#/editor', async () => {
    console.log('BJONES have editor button links to');
    let editorBtn = element(by.css('sd-navbar li:nth-child(2) a'));
    expect(await editorBtn.getText()).toEqual('Editor');
    expect(await editorBtn.getAttribute('href')).toContain('/#/editor');
    console.log('BJONES have editor button links t DONEo');
  });

  it('should have start links to /#/editor', async () => {
    console.log('BJONES  have start links to');
    let startBtn = element(by.css('sd-home #get-started'));
    expect(await startBtn.getText()).toEqual('LET\'S GET STARTED!');
    expect(await startBtn.getAttribute('href')).toContain('/#/editor');
    console.log('BJONES  have start links to DONE');
  });
});
