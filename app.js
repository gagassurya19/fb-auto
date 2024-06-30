const puppeteer = require("puppeteer");
const fs = require("fs-extra");
const path = require("path");
require('dotenv').config();

const loginUrl = process.env.FB_LOGIN_URL || "https://www.facebook.com/login";
const credentials = {
    email: process.env.FB_USER_EMAIL,
    password: process.env.FB_USER_PASSWORD,
};
const cookiesPath = path.join(__dirname, "cookies.json");
const postsFilePath = path.join(__dirname, "post_url.json");
const commentMessage = "This is an automated comment!";

async function login(page) {
  try {
    console.log("Try to login");
    await page.goto(loginUrl, { waitUntil: "networkidle2" });
    await page.type("#email", credentials.email);
    await page.type("#pass", credentials.password);
    await page.click("#loginbutton");
    await page.waitForNavigation({ waitUntil: "networkidle2" });
    const cookies = await page.cookies();
    await fs.writeJson(cookiesPath, cookies);
    console.log("Logged in successfully\n");
  } catch (error) {
    console.error("Error while logging in:", error);
  }
}

async function loadCookies(page) {
  try {
    console.log("Try to load cookies");
    if (await fs.pathExists(cookiesPath)) {
      const cookies = await fs.readJson(cookiesPath);
      await page.setCookie(...cookies);
      console.log("Cookies loaded successfully\n");
    }
  } catch (error) {
    console.error("Error while loading cookies:", error);
  }
}

async function commentOnPost(page, postUrl, commentMessage) {
  try {
    console.log("Try to comment on post:", postUrl);
    await page.goto(postUrl, { waitUntil: "networkidle2" });
    const commentBoxSelector =
      'div[aria-label="Write a comment…"][contenteditable="true"]';
    await page.waitForSelector(commentBoxSelector, {
      visible: true,
      timeout: 10000,
    });
    await page.click(commentBoxSelector);
    await page.keyboard.type(commentMessage);
    await page.keyboard.press("Enter");
    console.log("Commented with message:", commentMessage);
    await delay(3000);
    const screenshotPath = path.join(
      __dirname,
      `image/screenshot_${Date.now()}.png`
    );
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log("Screenshot saved:", screenshotPath, "\n");
  } catch (error) {
    console.error("Error while commenting on post:", error);
  }
}

async function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

async function run() {
  console.log("Start running the script\n");
  const browser = await puppeteer.launch({ headless: false }); // headless: false to see the browser actions
  const page = await browser.newPage();
  await loadCookies(page);
  await page.goto("https://www.facebook.com", { waitUntil: "networkidle2" });
  const loginRequired = await page.$("#email"); // Check if login is required
  if (loginRequired) {
    await login(page);
  }
  const posts = await fs.readJson(postsFilePath);
  for (const postUrl of posts.urls) {
    await commentOnPost(page, postUrl, commentMessage);
  }
  await browser.close();
}

run().catch(console.error);
