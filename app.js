var express = require('express');
var app = express();
var webdriver = require('selenium-webdriver');
var chrome = require('selenium-webdriver/chrome');
var By = webdriver.By;
var browser = new webdriver.Builder()
    .forBrowser('chrome')
    .setChromeOptions(new chrome.Options().addArguments("--incognito"))
    .build();

var FACEBOOK = "https://www.facebook.com/";
var MORE_BUTTON = "clearfix pam uiMorePager stat_elem morePager _52jv";

app.get('/page/:id', function (req, res) {
    url = FACEBOOK + req.params.id + "/";
    browser.get(url)
        .then(()=> browser.findElement(By.css("meta[property='al:android:url']")))
        .then(e => e.getAttribute("content"))
        .then(s => browser.get(FACEBOOK + "/search/" + (s.split("/")[3]) + "/likers/"))
        .then(checkAllPeople)
        .then(scrollAllPeople)
        .then(parsePeople)
        .then(res.send.bind(res));
});

app.get('/group/:id', function (req, res) {
    url = FACEBOOK + "groups/" + req.params.id + "/members/";
    browser.get(url)
        .then(browser.isElementPresent(By.className(MORE_BUTTON)))
        .then(loadAllPeople)
        .then(findPeople)
        .then(res.send.bind(res));
});

app.listen(3000, function () {
    console.log('app listening on port 3000');
});

browser.get(FACEBOOK);
browser.findElement(By.id('email')).sendKeys('EnverNosov@bk.ru');
browser.findElement(By.id('pass')).sendKeys('gJVFfj5B');
browser.findElement(By.id('loginbutton')).click();

function checkAllPeople() {
    return browser.isElementPresent(By.id("browse_end_of_results_footer"));
}

function scrollAllPeople(present) {
    if (!present) {
        return browser.executeScript("window.scrollTo(0, document.body.scrollHeight)")
            .then(checkAllPeople)
            .then(scrollAllPeople);
    } else {
        return browser.sleep(2000).then(()=> browser.findElements(By.className("_3u1 _gli _5und")))
    }
}

var parsePeople = function (people) {
    return Promise.all(people.map(function (person) {
        return person.getAttribute("data-bt");
    })).then(function (people) {
        return people.map(p => JSON.parse(p).id);
    });
};

var loadAllPeople = function (present) {
    if (present) {
        return browser.findElement(By.className(MORE_BUTTON)).click().then(loadAllPeople);
    } else {
        return browser.sleep(2000).then(()=>browser.findElements(By.css("div.fsl.fwb.fcb a")));
    }
};

var findPeople = function (people) {
    return Promise.all(people.map(function (person) {
        return person.getAttribute("data-hovercard");
    })).then(function (people) {
        return people.map(p => p.split("?id=")[1].split("&")[0]);
    });
};