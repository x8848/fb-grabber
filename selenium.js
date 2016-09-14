module.exports = function (app) {
    var webdriver = require('selenium-webdriver');
    var By = webdriver.By;
    var chrome = require('selenium-webdriver/chrome');
    var FACEBOOK = "https://www.facebook.com/";
    var MORE_BUTTON = "pam uiBoxLightblue uiMorePagerPrimary";

    var http = require('http').Server(app);
    var io = require('socket.io')(http);
    http.listen(80);

    io.on('connection', function (socket) {
        console.log('a user connected');
        socket.on("grab", function (params) {
            console.log('url: ' + params.url);
            var time = Date.now();
            var browser = getBrowser();
            login(browser)
                .then(()=> browser.get(params.url))
                .then(() => browser.findElement(By.css("meta[property='al:android:url']")))
                .then(e => e.getAttribute("content"))
                .then(s => isGroupOrPage(s, browser))
                .then(ids => sendResponse(params.url, params.div, ids, time))
                .catch(function (error) {
                    sendResponse(params.url, params.div, error.message, time);
                });
            browser.quit();
        });
    });

    function getBrowser() {
        return new webdriver.Builder()
            .forBrowser('chrome')
            .setChromeOptions(new chrome.Options().addArguments("--incognito"))
            .build();
    }
    function login(browser) {
        return browser.get(FACEBOOK)
            .then(() => browser.findElement(By.id('email')).sendKeys('EnverNosov@bk.ru'))
            .then(() => browser.findElement(By.id('pass')).sendKeys('gJVFfj5B'))
            .then(() => browser.findElement(By.id('loginbutton')).click());
    }
    function sendResponse(url, div, ids, time) {
        var date = new Date(Date.now() - time);
        var seconds = date.getUTCSeconds();
        time = date.getUTCMinutes() + ':' + (seconds >= 10 ? seconds : "0" + seconds);
        io.emit('result', {
            url: url,
            div: div,
            time: time,
            total: (typeof ids == "string") ? "error !!" : ids.length,
            ids: ids
        });
    }
    function isGroupOrPage(s, browser) {
        var url;
        var type = s.split("/")[2];
        var name = s.split("/")[3];
        if (type == "group") {
            url = FACEBOOK + "groups/" + name + "/members/";
            return browser.get(url)
                .then(() => isMoreButton(browser))
                .then(p => loadAllPeople(p, browser))
                .then(findPeople)
        } else if (type == "page") {
            url = FACEBOOK + "/search/" + name + "/likers/";
            return browser.get(url)
                .then(() => isAllPeople(browser))
                .then(p => scrollAllPeople(p, browser))
                .then(parsePeople)
        } else {
            throw new Error("Error, this url is " + type + " !!");
        }
    }
    function isAllPeople(browser) {
        return browser.isElementPresent(By.id("browse_end_of_results_footer"));
    }
    function scrollAllPeople(present, browser) {
        if (!present) {
            return browser.executeScript("window.scrollTo(0, document.body.scrollHeight)")
                .then(() => isAllPeople(browser))
                .then(p => scrollAllPeople(p, browser));
        } else {
            return browser.sleep(2000).then(()=> browser.findElements(By.className("_3u1 _gli _5und")))
        }
    }
    function parsePeople(people) {
        return Promise.all(people.map(function (person) {
            return person.getAttribute("data-bt");
        })).then(function (people) {
            return people.map(p => JSON.parse(p).id);
        });
    }
    function isMoreButton(browser) {
        return browser.isElementPresent(By.className(MORE_BUTTON));
    }
    function loadAllPeople(present, browser) {
        if (present) {
            var button = browser.findElement(By.className(MORE_BUTTON));
            return browser.actions().mouseMove(button).click().perform()
                .then(browser.sleep(2000))
                .then(() => isMoreButton(browser))
                .then(p => loadAllPeople(p, browser));
        } else {
            return browser.sleep(2000).then(() => browser.findElements(By.css("div.fsl.fwb.fcb a")));
        }
    }
    function findPeople(people) {
        return Promise.all(people.map(function (person) {
            return person.getAttribute("data-hovercard");
        })).then(function (people) {
            return people.map(p => p.split("?id=")[1].split("&")[0]);
        });
    }
};