import { Locales, type IntlayerConfig } from "intlayer";

const config: IntlayerConfig = {
  // List of languages should be same as JASP desktop, get list by running
  // `ls -1 Desktop/po/` in jasp-desktop repo.
  internationalization: {
    locales: [
      Locales.ENGLISH,
      Locales.ARABIC,
      Locales.CZECH,
      Locales.GERMAN,
      Locales.SPANISH,
      Locales.ESTONIAN,
      Locales.BASQUE,
      Locales.FRENCH,
      Locales.GALICIAN,
      Locales.HUNGARIAN,
      Locales.INDONESIAN,
      Locales.ITALIAN,
      Locales.JAPANESE,
      Locales.LITHUANIAN,
      Locales.DUTCH,
      Locales.POLISH,
      Locales.PORTUGUESE,
      Locales.RUSSIAN,
      Locales.ALBANIAN,
      Locales.SERBIAN_LATIN,
      Locales.TURKISH,
      Locales.CHINESE_SIMPLIFIED,
      Locales.CHINESE_TRADITIONAL,
    ],
    defaultLocale: Locales.ENGLISH,
  },
  editor: {
    applicationURL: "http//localhost:3000"
  }
};

export default config;