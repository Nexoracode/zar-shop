import assert from "node:assert/strict";
import { test } from "node:test";
import { bufferMatchesMimeType } from "@/modules/media/file-signature";

const bytes = (...values: number[]) => new Uint8Array(values);

test("accepts a buffer whose signature matches the declared type", () => {
  assert.equal(bufferMatchesMimeType(bytes(0xff, 0xd8, 0xff, 0xe0), "image/jpeg"), true);
  assert.equal(bufferMatchesMimeType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), "image/png"), true);
  assert.equal(bufferMatchesMimeType(bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37), "application/pdf"), true);
  assert.equal(bufferMatchesMimeType(bytes(0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00), "video/webm"), true);
});

test("accepts webp only when both RIFF and WEBP markers are present", () => {
  const webp = bytes(0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50);
  assert.equal(bufferMatchesMimeType(webp, "image/webp"), true);
  const riffWav = bytes(0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45);
  assert.equal(bufferMatchesMimeType(riffWav, "image/webp"), false);
});

test("accepts mp4/mov when the ftyp box is at byte 4", () => {
  const ftyp = bytes(0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32);
  assert.equal(bufferMatchesMimeType(ftyp, "video/mp4"), true);
  assert.equal(bufferMatchesMimeType(ftyp, "video/quicktime"), true);
});

test("rejects a spoofed type and an unknown type", () => {
  // An executable renamed to .jpg — "MZ" header.
  assert.equal(bufferMatchesMimeType(bytes(0x4d, 0x5a, 0x90, 0x00), "image/jpeg"), false);
  assert.equal(bufferMatchesMimeType(bytes(0xff, 0xd8, 0xff), "application/x-msdownload"), false);
  assert.equal(bufferMatchesMimeType(bytes(), "image/png"), false);
});
