const jsdom = require('jsdom');
const got = require('got');

const { JSDOM } = jsdom;

const url = 'https://lolalytics.com/lol/tierlist/';

got(url).then(response => {
    const dom = new JSDOM(response.body, {
        pretendToBeVisual: true,
        runScripts: "dangerously"
    });
    console.log(dom.window.document.querySelector('body').outerHTML);
}).catch(err => {
    console.log(err);
});
