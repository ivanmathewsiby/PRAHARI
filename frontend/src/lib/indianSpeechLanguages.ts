export interface IndianSpeechLanguage {
  code: string;
  name: string;
  nativeName: string;
  bcp47: string;
  whisperCode: string | null;
}

// India’s 22 scheduled languages, plus English for the default demo path.
export const INDIAN_SPEECH_LANGUAGES: IndianSpeechLanguage[] = [
  { code: "en", name: "English", nativeName: "English", bcp47: "en-IN", whisperCode: "en" },
  { code: "as", name: "Assamese", nativeName: "অসমীয়া", bcp47: "as-IN", whisperCode: "as" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", bcp47: "bn-IN", whisperCode: "bn" },
  { code: "brx", name: "Bodo", nativeName: "बड़ो", bcp47: "brx-IN", whisperCode: null },
  { code: "doi", name: "Dogri", nativeName: "डोगरी", bcp47: "doi-IN", whisperCode: null },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", bcp47: "gu-IN", whisperCode: "gu" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", bcp47: "hi-IN", whisperCode: "hi" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", bcp47: "kn-IN", whisperCode: "kn" },
  { code: "ks", name: "Kashmiri", nativeName: "کٲشُر", bcp47: "ks-IN", whisperCode: null },
  { code: "kok", name: "Konkani", nativeName: "कोंकणी", bcp47: "kok-IN", whisperCode: null },
  { code: "mai", name: "Maithili", nativeName: "मैथिली", bcp47: "mai-IN", whisperCode: null },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", bcp47: "ml-IN", whisperCode: "ml" },
  { code: "mni", name: "Manipuri", nativeName: "মৈতৈলোন্", bcp47: "mni-IN", whisperCode: null },
  { code: "mr", name: "Marathi", nativeName: "मराठी", bcp47: "mr-IN", whisperCode: "mr" },
  { code: "ne", name: "Nepali", nativeName: "नेपाली", bcp47: "ne-IN", whisperCode: "ne" },
  { code: "or", name: "Odia", nativeName: "ଓଡ଼ିଆ", bcp47: "or-IN", whisperCode: null },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", bcp47: "pa-IN", whisperCode: "pa" },
  { code: "sa", name: "Sanskrit", nativeName: "संस्कृतम्", bcp47: "sa-IN", whisperCode: "sa" },
  { code: "sat", name: "Santali", nativeName: "ᱥᱟᱱᱛᱟᱲᱤ", bcp47: "sat-IN", whisperCode: null },
  { code: "sd", name: "Sindhi", nativeName: "سنڌي", bcp47: "sd-IN", whisperCode: "sd" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", bcp47: "ta-IN", whisperCode: "ta" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", bcp47: "te-IN", whisperCode: "te" },
  { code: "ur", name: "Urdu", nativeName: "اردو", bcp47: "ur-IN", whisperCode: "ur" },
];
