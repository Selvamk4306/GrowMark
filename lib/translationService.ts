const LANG_MAP: Record<string, string> = {
  English: 'en', Tamil: 'ta', Telugu: 'te',
  Hindi: 'hi', Kannada: 'kn', Malayalam: 'ml',
};

const cache = new Map<string, string>();

export function clearTranslationCache() {
  cache.clear();
}

export async function translateDynamic(text: string, language: string): Promise<string> {
  if (!text || language === 'English') return text;
  const targetLang = LANG_MAP[language] || 'en';
  const cacheKey = `${targetLang}:${text}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  // Abort the fetch after 5 seconds to prevent the whatwg-fetch polyfill
  // internal setTimeout from firing and cluttering the call stack.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    const data = await response.json();
    const translated = data.responseData?.translatedText || text;

    // The free MyMemory API returns these error messages for invalid/short inputs.
    // If we detect an error string, fall back to the original text.
    const isApiError = 
      translated.includes('PLEASE SELECT TWO DISTINCT LANGUAGES') ||
      translated.includes('MYMEMORY WARNING') ||
      translated.includes('INVALID EMAIL PROVIDED');

    const finalTranslated = isApiError ? text : translated;

    cache.set(cacheKey, finalTranslated);
    return finalTranslated;
  } catch {
    clearTimeout(timeoutId);
    // Silently fall back to original text on timeout or network error
    return text;
  }
}

export async function translateBatch(texts: string[], language: string): Promise<string[]> {
  if (language === 'English') return texts;
  return Promise.all(texts.map(text => translateDynamic(text, language)));
}