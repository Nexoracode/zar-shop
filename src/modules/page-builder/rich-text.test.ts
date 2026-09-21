import assert from "node:assert/strict";
import test from "node:test";
import { isRichTextEmpty, richTextPlainLength, richTextPlainText } from "./rich-text";
import { sanitizeSectionDescription } from "./rich-text-sanitize";

test("measures the visible text, not the markup", () => {
  assert.equal(richTextPlainText("<p>سلام <strong>دنیا</strong></p>"), "سلام دنیا");
  assert.equal(richTextPlainLength("<p><em>abc</em></p>"), 3);
  assert.equal(richTextPlainText("a&nbsp;b &amp; c"), "a b & c");
});

test("markup without visible text is empty", () => {
  assert.equal(isRichTextEmpty("<p></p>"), true);
  assert.equal(isRichTextEmpty("<p><br></p>"), true);
  assert.equal(isRichTextEmpty("<p>x</p>"), false);
});

test("keeps what the editor produces", () => {
  const html = '<p><strong>پررنگ</strong> <em>کج</em> <u>زیرخط</u> <s>خط</s> <span style="color:#dc2626">رنگی</span> <mark style="background-color:#fef08a">زمینه</mark></p>';
  assert.equal(sanitizeSectionDescription(html), html);
});

test("drops scripts, event handlers, unknown tags and unsafe links or styles", () => {
  const clean = sanitizeSectionDescription('<p onclick="x()">a<script>alert(1)</script><img src="x" onerror="y()"><a href="javascript:alert(1)">bad</a><span style="position:fixed;color:red">s</span></p>');
  assert.ok(!/script|onclick|onerror|javascript|<img|position/i.test(clean), clean);
  assert.ok(clean.includes("a"));
});

test("makes links open safely in a new tab and empties blank markup", () => {
  assert.equal(sanitizeSectionDescription('<a href="https://example.com/x" onclick="z()">link</a>'), '<a href="https://example.com/x" rel="noopener noreferrer" target="_blank">link</a>');
  assert.equal(sanitizeSectionDescription("<p></p>"), "");
  assert.equal(sanitizeSectionDescription(null), "");
});
