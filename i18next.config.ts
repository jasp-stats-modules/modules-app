import { defineConfig } from 'i18next-cli';

export default defineConfig({
  // List of languages same as JASP desktop, get list by running
  // `ls Desktop/po/ -1 |perl -pi -e 's/jaspDesktop-(.*).po/$1,/'` in jasp-desktop repo.
  locales: [
    "en",
    "ar",
    "cs",
    "de",
    "es",
    "et",
    "eu",
    "fr",
    "gl",
    "hu",
    "id",
    "it",
    "ja",
    "lt",
    "nl",
    "pl",
    "pt",
    "ru",
    "sq",
    "sr",
    "tr",
    "zh_Hans",
    "zh_Hant"
  ],
  extract: {
    input: "src/**/*.{js,jsx,ts,tsx}",
    output: "src/locales/{{language}}/{{namespace}}.json",
    // Exclude input.name, a.rel and svg attributes
    ignoredAttributes: ['name', 'rel', 'fill', 'viewBox','fillRule', 'd', 'clipRule'],
  },
});