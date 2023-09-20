import puppeteer from 'puppeteer-extra';
import chalk from 'chalk';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import sound from 'sound-play';
import path from 'path';

puppeteer.use(StealthPlugin());

const clickTerminBuchen = async (page, browser) => {
    try {
        await page.evaluate(() => {
            [...document.querySelectorAll('.link .button')]
                .find((element) => element.textContent === 'Termin buchen')
                .click();
        });

        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
    } catch (e) {
        startNewSession(browser, page);
    }
};

const step2 = async (page, browser) => {
    try {
        console.log(chalk.blue('- Accepting terms and conditions'));
        const element = await page.waitForSelector('.CXCheckbox > label');
        await element.evaluate((b) => b.click());

        await page.evaluate(() => {
            [...document.querySelectorAll('button')]
                .find((element) => element.textContent === 'Weiter')
                .click();
        });
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
    } catch (e) {
        return startNewSession(browser, page);
    }
};

const step3 = async (page, browser) => {
    try {
        console.log(chalk.blue('- filling data'));
        await page.waitForNetworkIdle();
        page.select('select#xi-sel-400', '287'); // Agypten
        page.select('select#xi-sel-422', '2'); // zwei personen
        page.select('select#xi-sel-427', '1'); // Ja
        page.select('select#xi-sel-428', '287-0'); //  Agypten

        const title = await page.waitForSelector('.kachel-287-0-2'); // Aufenthaltstitel - verlängern
        title.click();
        const reason = await page.waitForSelector('.accordion-287-0-2-4'); // Familliare Grunde
        reason.click();
        const choice = await page.waitForSelector('#SERVICEWAHL_DE287-0-2-4-327471'); // first choice
        choice.click();

        await page.waitForTimeout(3000);
        await page.waitForNetworkIdle();

        await page.evaluate(() => {
            [...document.querySelectorAll('button')]
                .find((element) => element.textContent === 'Weiter')
                .click();
        });

        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
    } catch (e) {
        return startNewSession(browser, page);
    }
};

const logPageUrl = async (page) => {
    const url = await page.url();
    console.log(chalk.blue(`Session url: ${url}`));
};

const startNewSession = async (browser, page) => {
    console.log(chalk.red('error happened or session ended.'));
    await page.close();
    await beginSession();
};

const browser = await puppeteer.launch({ headless: false });

const beginSession = async () => {
    console.log('--------------------------');
    console.log(chalk.blue('starting new session'));
    // Launch the browser and open a new blank page

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(120000);

    page.setViewport({ width: 1280, height: 720 });

    console.log(chalk.blue('- Navigating to OTV verwalt website'));

    // Navigate the page to a URL
    await page.goto('https://otv.verwalt-berlin.de/ams/TerminBuchen');

    // page 1
    await clickTerminBuchen(page, browser);

    // Wait and click on first result 2
    await step2(page, browser);

    // page 3
    await step3(page, browser);
    let error = true;

    // error is errorMessage
    const errorMessage = await page.$('.errorMessage');
    console.log(errorMessage, 'errorMessage');

    if (!errorMessage) {
        error = false;
    }

    while (error) {
        error = false;
        const errorMessage = await page.$('.errorMessage');
        console.log(errorMessage, 'errorMessage');

        if (errorMessage) {
            try {
                error = true;
                console.log(chalk.red('No appointment found retrying in 3 mins ...'));
                await logPageUrl(page);

                await page.waitForTimeout(60000 * 3);
                await page.evaluate(() => {
                    [...document.querySelectorAll('button')]
                        .find((element) => element.textContent === 'Weiter')
                        .click();
                });
            } catch (e) {
                return await startNewSession(browser, page);
            }
        }
    }

    const filePath = path.join('tada.mp3');
    sound.play(filePath);
    console.log(chalk.white.bgGreen.bold('appointment found'));
    await logPageUrl(page);

    // await browser.close();
};

(async () => beginSession())();