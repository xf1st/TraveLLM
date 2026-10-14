import test from "node:test"
import assert from "node:assert/strict"
import { sanitizeBioInput, sanitizeBioText, sanitizeDisplayNameInput, sanitizeDisplayName, sanitizeLocaleInput, sanitizeCitizenshipNationality } from "../lib/profile-validation.ts"

test("typing spaces and newlines in profile fields does not remove them", () => {
  assert.equal(sanitizeBioInput("Разработчик "), "Разработчик ")
  assert.equal(sanitizeBioInput("Разработчик\n"), "Разработчик\n")
  assert.equal(sanitizeDisplayNameInput("Иван "), "Иван ")
  assert.equal(sanitizeLocaleInput("Российская "), "Российская ")
  let draft = ""
  for (const character of "Люблю новые города") draft = sanitizeBioInput(draft + character)
  assert.equal(draft, "Люблю новые города")
})

test("committing profile fields still normalizes and strips unsafe characters", () => {
  assert.equal(sanitizeBioText("  Привет\u200B <мир>  "), "Привет мир")
  assert.equal(sanitizeDisplayName(" Иван   Иванов "), "Иван Иванов")
  assert.equal(sanitizeCitizenshipNationality(" Россия "), "Россия")
  assert.equal(sanitizeBioInput("123456", 5), "12345")
})
