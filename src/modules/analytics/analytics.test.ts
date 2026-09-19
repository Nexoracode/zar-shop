import assert from "node:assert/strict";
import test from "node:test";
import { referrerHost, trafficChannel } from "./referrer";
import { isValidVisitorId, newVisitorId, trackablePath } from "./tracking";
import { parseUserAgent } from "./user-agent";
import { buildDailyTrend, foldSlices, localDayKey } from "./visitor-stats";

const chromeDesktop = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const edgeDesktop = `${chromeDesktop} Edg/126.0.0.0`;
const safariIphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const chromeIphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.0.0 Mobile/15E148 Safari/604.1";
const chromeAndroid = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const androidTablet = "Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const firefox = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0";

test("browsers are told apart even though most of them also say Chrome or Safari", () => {
  assert.equal(parseUserAgent(chromeDesktop).browser, "Chrome");
  assert.equal(parseUserAgent(edgeDesktop).browser, "Edge");
  assert.equal(parseUserAgent(`${chromeDesktop} OPR/111.0.0.0`).browser, "Opera");
  assert.equal(parseUserAgent(firefox).browser, "Firefox");
  assert.equal(parseUserAgent(safariIphone).browser, "Safari");
  assert.equal(parseUserAgent(chromeIphone).browser, "Chrome");
  assert.equal(parseUserAgent(`${chromeAndroid} SamsungBrowser/25.0`).browser, "Samsung Internet");
});

test("devices are classified as mobile, tablet or desktop", () => {
  assert.equal(parseUserAgent(chromeDesktop).device, "DESKTOP");
  assert.equal(parseUserAgent(safariIphone).device, "MOBILE");
  assert.equal(parseUserAgent(chromeAndroid).device, "MOBILE");
  assert.equal(parseUserAgent(androidTablet).device, "TABLET");
  assert.equal(parseUserAgent("Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1").device, "TABLET");
});

test("bots and empty user agents are flagged so they are never counted", () => {
  assert.equal(parseUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)").isBot, true);
  assert.equal(parseUserAgent("curl/8.4.0").isBot, true);
  assert.equal(parseUserAgent("").isBot, true);
  assert.equal(parseUserAgent(null).isBot, true);
  assert.equal(parseUserAgent(chromeDesktop).isBot, false);
});

test("referrer hosts drop www, ignore the store itself and reject non-web values", () => {
  assert.equal(referrerHost("https://www.Google.com/search?q=gold", "shop.example.ir"), "google.com");
  assert.equal(referrerHost("https://shop.example.ir/products", "shop.example.ir"), null);
  assert.equal(referrerHost("https://www.shop.example.ir/", "shop.example.ir:3000"), null);
  assert.equal(referrerHost("", "shop.example.ir"), null);
  assert.equal(referrerHost("not a url", "shop.example.ir"), null);
  assert.equal(referrerHost("android-app://com.google.android.gm", "shop.example.ir"), null);
});

test("traffic is grouped into direct, search, social and other referrals", () => {
  assert.equal(trafficChannel(null), "direct");
  assert.equal(trafficChannel("google.com"), "search");
  assert.equal(trafficChannel("google.co.uk"), "search");
  assert.equal(trafficChannel("t.me"), "social");
  assert.equal(trafficChannel("instagram.com"), "social");
  assert.equal(trafficChannel("rtlr.ir"), "referral");
});

test("only storefront paths are tracked, without their query string", () => {
  assert.equal(trackablePath("/products/ring?utm=x#top"), "/products/ring");
  assert.equal(trackablePath("/"), "/");
  assert.equal(trackablePath("/admin"), null);
  assert.equal(trackablePath("/admin/orders"), null);
  assert.equal(trackablePath("/api/track"), null);
  assert.equal(trackablePath("/_next/static/x.js"), null);
  assert.equal(trackablePath("//evil.example"), null);
  assert.equal(trackablePath("products"), null);
  assert.equal(trackablePath(`/${"a".repeat(300)}`), null);
  assert.notEqual(trackablePath("/administrator-guide"), null, "only /admin itself is excluded, not paths that merely start with it");
});

test("visitor ids are 32 hex characters and freshly generated ones validate", () => {
  assert.equal(isValidVisitorId(newVisitorId()), true);
  assert.equal(isValidVisitorId("abc"), false);
  assert.equal(isValidVisitorId(undefined), false);
  assert.equal(isValidVisitorId("Z".repeat(32)), false);
  assert.notEqual(newVisitorId(), newVisitorId());
});

test("the daily trend fills quiet days with zeros and keeps oldest-first order", () => {
  const start = new Date(2026, 8, 10);
  const trend = buildDailyTrend([{ day: "2026-09-11", views: 30, visitors: 12 }, { day: "2026-09-13", views: 5, visitors: 5 }], start, 4);
  assert.deepEqual(trend.map((point) => [point.views, point.visitors]), [[0, 0], [30, 12], [0, 0], [5, 5]]);
  assert.equal(localDayKey(new Date(2026, 0, 5)), "2026-01-05");
});

test("foldSlices keeps the biggest slices and sums the rest", () => {
  const { top, rest } = foldSlices([{ key: "a", count: 1 }, { key: "b", count: 50 }, { key: "c", count: 7 }, { key: "d", count: 3 }], 2);
  assert.deepEqual(top.map((slice) => slice.key), ["b", "c"]);
  assert.equal(rest, 4);
});
