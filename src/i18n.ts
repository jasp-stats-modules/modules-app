import i18n from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';

import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .use(
    resourcesToBackend(
      (language: string, namespace: string) =>
        import(`./locales/${language}/${namespace}.json`),
    ),
  )
  .init({
    lng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
