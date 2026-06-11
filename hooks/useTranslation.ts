import { useLanguage } from '../context/LanguageContext';
import { TRANSLATIONS } from '../constants/translations';

export const useTranslation = () => {
  const { language } = useLanguage();

  /**
   * Translates a given English key to the current selected language.
   * Falls back to the English original if translation is missing.
   */
  const t = (key: string): string => {
    const langData = TRANSLATIONS[language] || TRANSLATIONS['English'];
    return langData[key] || TRANSLATIONS['English'][key] || key;
  };

  return { t, language };
};
